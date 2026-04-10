---
paths: "**/*.{tsx,ts}"
---

# React Hook Patterns

## useOnClickOutside

Use specific element types, not generic `HTMLElement`:

```typescript
// ✅ Good
useOnClickOutside(dropdownRef as RefObject<HTMLDivElement>, () => setIsOpen(false))
```

## Separate High-Frequency and Low-Frequency useEffect

Split effects that run at different frequencies:

```typescript
// ✅ Good - Separate effects by frequency
useEffect(() => { updateListData(items) }, [items])
useEffect(() => { updateLiveValue(latestValue) }, [latestValue])

// ❌ Bad - List rebuilt on every live value update
useEffect(() => {
  updateListData(items)
  updateLiveValue(latestValue)
}, [latestValue, items])
```

## useEffect Async Cleanup

Use `fire()` from `@jgjp/fire` to execute async logic inside useEffect. Use `let mounted = true` (scoped variable, not useRef) to prevent state updates after unmount:

```typescript
import { fire } from '@jgjp/fire'

useEffect(() => {
  let mounted = true
  fire(async () => {
    const result = await fetchData()
    if (!mounted) return
    setState(result)
  })
  return () => { mounted = false }
}, [deps])

// ❌ Bad — Manual async IIFE
useEffect(() => {
  const initAsync = async () => { ... }
  initAsync()
}, [deps])
```

## useRef for Frequently Changing Values

When useEffect uses a value that changes often (prices, timestamps) but should NOT trigger subscription recreation:

```typescript
// ✅ Good - useRef prevents subscription recreation
const currentPrice = Number(priceData?.price ?? 0)
const priceRef = useRef(currentPrice)
priceRef.current = currentPrice  // Always update ref

useEffect(() => {
  return subscribe((data) => {
    const usdValue = amount * priceRef.current  // ref.current inside callback
    setUsdBalance(usdValue)
  })
}, [subscribe, setUsdBalance])  // currentPrice NOT in deps
```

**Pattern**: Create ref -> update on every render -> use `ref.current` in callbacks -> omit from deps.

## WebSocket Subscription Guard

Always add early return guard for dynamic IDs:

```typescript
useEffect(() => {
  if (!selectedId) return  // Prevent subscribing with null/undefined ID
  return wsClient.subscribe(
    `channel:${selectedId}`,
    (payload) => { updateData(transformPayload(payload)) },
  )
}, [selectedId, updateData])
```

## useRunOnce

Use for operations that execute once per mount or session.

- **Without ID**: runs once per component mount (local ref)
- **With ID**: runs once globally across all components (`useRunOnceStore`)

```typescript
import { useRunOnce } from '~/hooks/useRunOnce'

// Local mode
const { runOnce: runCreateWallet, resetRunOnce: resetCreateWallet } = useRunOnce()

useEffect(() => { if (!user) resetCreateWallet() }, [user, resetCreateWallet])

useEffect(() => {
  if (!authenticated || !walletsReady || embeddedWallet) return
  runCreateWallet(() => {
    createWallet().catch(() => toast.error('Failed. Please try logging in again.'))
  })
}, [authenticated, walletsReady, embeddedWallet, createWallet, runCreateWallet])

// Global mode
const { runOnce } = useRunOnce({ id: 'app-initialization' })
useEffect(() => { runOnce(() => initializeApp()) }, [runOnce])
```

## Async Error Handling in Hooks

**ALWAYS wrap async operations in try-catch.** Unhandled errors leave components stuck.

```typescript
// ✅ Good
runFetchMetadata(async () => {
  try {
    const entries = await metadataQuery.entries()
    setAssets(entries.map(/* ... */))
  } catch (error) {
    _log.error('Failed to fetch asset metadata:', error)
    setAssets([])  // Graceful recovery
  }
})
```

## No State Updates During Render

Use `useEffect` for state sync, never call setters in render body:

```typescript
// ❌ Bad
if (!isDragging && localValue !== value) setLocalValue(value)

// ✅ Good
useEffect(() => {
  if (!isDragging) setLocalValue(value)
}, [value, isDragging])
```

## Drag Handling with Pointer Capture

Use **Pointer Capture API** instead of `onMouseDown`/`onMouseUp`. Without it, releasing mouse outside the element leaves `isDragging` stuck at `true`.

```typescript
const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
  setIsDragging(true)
  e.currentTarget.setPointerCapture(e.pointerId)
}
const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
  setIsDragging(false)
  onValueChange(localValue)
  e.currentTarget.releasePointerCapture(e.pointerId)
}
```

## Promise-based Subscription Cleanup

When wrapping subscription APIs in Promises, **always capture and call unsubscribe** on resolve/reject:

```typescript
new Promise<string>((resolve, reject) => {
  let unsub: (() => void) | undefined
  subscriptionApi
    .subscribe(callback => {
      if (success) { unsub?.(); resolve(result); return }
      if (error) { unsub?.(); reject(error); return }
    })
    .then((unsubscribe) => { unsub = unsubscribe })
    .catch(reject)
})
```

Without cleanup, callbacks continue after Promise settles -> memory leaks.
