---
paths: "**/*.{tsx,css}"
---

# React & JSX Standards

## Component Props

Define props inline unless you need to export the props type for reuse.

```typescript
export const AppLayout = ({
  children,
  hideSidebar,
  className,
}: {
  children: ReactNode
  hideSidebar?: boolean
  className?: string
}) => {
```

## Boolean Props

Default to `false` for clearer intent. Avoid defaulting to `true`.

## Icons

Import from `src/icons` as modules. **Do NOT** add new icon packages.

```typescript
import usdcIcon from "~/icons/usdc.svg"
```

## Mock UI

- Define data variables outside the return statement
- Render dynamically in JSX — never hardcode values in return

## useMemo & useCallback

**Default: Do NOT use.** Only add when checklist criteria are met.

### useMemo Checklist

- [ ] Computation is expensive (complex logic, data transformation)?
- [ ] Reference stability needed for memoized children (React.memo)?
- [ ] Value is used in other hooks' dependency arrays?
- [ ] Contains non-deterministic calls (`Date.now()`, `Math.random()`, `nanoid()`)?

**All No -> Do NOT use useMemo**

```typescript
// ❌ Bad - Simple operations
const item = useMemo(() => items.find((i) => i.id === id), [items, id])

// ✅ Good - Use directly
const item = items.find((i) => i.id === id)

// ✅ Good - Complex logic with multiple conditions
const { state, action } = useMemo(() => {
  if (isLoading) return { state: 'loading', action: 'wait' }
  if (hasHistory) return { state: 'show', action: 'fund' }
  // ...
}, [isLoading, hasHistory, ...])

// ✅ Good - Non-deterministic calls in fallback
const statsData = useMemo(() => {
  if (liveStats) return liveStats
  if (!genericStats) return undefined
  return { ...genericStats, lastUpdated: Date.now() }
}, [liveStats, genericStats])
```

### useCallback Checklist

- [ ] Passed to memoized child (React.memo)?
- [ ] Used in other hooks' dependency arrays?

**All No -> Do NOT use useCallback**

## Browser APIs

### Clipboard API

Always handle errors. Use `sleep` from utils for delayed reset:

```typescript
import { sleep } from '~/lib/utils'

navigator.clipboard.writeText(text).then(
  () => {
    setCopied(true)
    void sleep(2000).then(() => setCopied(false))
  },
  (err) => {
    _log.error('Failed to copy:', err)
    toast.error('Failed to copy')
  },
)
```

### Delay Patterns

Use `sleep` from utils with `void` instead of `setTimeout`:

```typescript
// ✅ Good
void sleep(2000).then(() => setCopied(false))

// ❌ Bad
setTimeout(() => setCopied(false), 2000)
```

## Tooltips

Use custom `Tooltip` from `~/components/ui/Tooltip`, not native `title` attribute.

```typescript
// ✅ Good
<Tooltip content="Fees included.">
  <span>Total Cost</span>
</Tooltip>

// ❌ Bad
<span title="Fees included.">Total Cost</span>
```

## Figma Dev Mode MCP

- **DO NOT** add new icon packages
- **DO NOT** use placeholders if localhost source is provided
- **Always prioritize** Figma's actual design specifications
- **Match exactly**: Do not modify text, margins, or padding for "better readability"
