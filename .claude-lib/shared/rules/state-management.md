---
paths: "**/*.{ts,tsx}"
---

# Zustand State Management

## Store Pattern

**ALWAYS use the curried `create<T>()(...)` syntax.** The double-parentheses `()()` is Zustand's recommended "curried workaround" for TypeScript — it allows proper generic type inference when using middleware (`persist`, `devtools`, etc.). Without it, TypeScript cannot infer middleware types correctly.

Ref: [Zustand Advanced TypeScript Guide](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/advanced-typescript.md)

```typescript
// ✅ Good - Curried pattern: create<T>()(...)
export const useSettingsStore = create<{
  currency: Currency
  setCurrency: (currency: Currency) => void
}>()(
  persist(
    (set) => ({
      currency: defaultCurrency,
      setCurrency: (currency) => set(() => ({ currency })),
    }),
    { name: 'store:settings' }
  )
)

// ❌ Bad - Missing curried call, breaks type inference with middleware
export const useSettingsStore = create<{
  currency: Currency
  setCurrency: (currency: Currency) => void
}>((set) => ({
  currency: defaultCurrency,
  setCurrency: (currency) => set(() => ({ currency })),
}))
```

## Store Selectors

Use destructuring for multiple values:

```typescript
// ✅ Good
const { isDialogOpen, selectedItem } = useAppStore()

// ❌ Bad - Multiple individual selectors
const isDialogOpen = useAppStore((s) => s.isDialogOpen)
const selectedItem = useAppStore((s) => s.selectedItem)
```

**Exception**: Individual selectors for derived values.

**CRITICAL: Never create new references inside selectors.** `.filter()`, `.map()`, `.slice()`, spread create new references -> infinite re-renders.

```typescript
// ❌ Bad -> infinite loop
const filtered = useStore((s) => s.items.filter((i) => i.active))

// ✅ Good - Derive outside selector
const items = useStore((s) => s.items)
const filtered = items.filter((i) => i.active)
```

**Rule**: Selectors return **existing references** only. All derivations happen outside.

## Zustand + useMutation: getState()

Use `store.getState()` in mutation callbacks instead of render-time selectors (which may be stale):

```typescript
// ✅ Good - Fresh state at execution time, implicit return
export const useSubmitAction = () =>
  useMutation({
    mutationFn: async (input) => {
      const agentWallet = useWalletStore.getState().agentWallet
      assert(agentWallet, 'Wallet not connected')
    },
  })

// ❌ Bad - Stale closure
export const useSubmitAction = () => {
  const agentWallet = useWalletStore((s) => s.agentWallet) // captured at render time
  return useMutation({ mutationFn: async () => { /* agentWallet may be stale */ } })
}
```

**Note**: `queryClient` from `useQueryClient()` has a stable reference — no `getState()` needed.
