---
paths: "**/*.{ts,tsx}"
---

# TypeScript Standards

## Function Declaration

Use arrow functions for all functions (components, hooks, helpers, utilities):

```typescript
// ✅ Good
const formatPrice = (price: string, decimals: number): string => {
  return Number(price).toFixed(decimals)
}

// ❌ Bad - Function declaration
function formatPrice(price: string, decimals: number): string { ... }
```

### Exceptions to Arrow Function Rule

1. **Assertion functions** (`asserts condition`) — TS2775 requires explicit type annotations on `const`.
2. **Auto-generated files** — Generated asset files from `compile-assets.cjs`.

## Type Definitions

- Use `type` imports where possible
- No TypeScript `enum` (use union types or `z.enum()`)
- **Data types** (API, forms, store state): Zod schemas with `z.infer`
- **Component props & utilities**: Inline `type` definitions (not `interface`)

```typescript
// ✅ Good - Inline props
const Dialog = ({ onClose, children }: { onClose: () => void; children: ComponentChildren }) => {}

// ❌ Bad - Separate type definition
type DialogProps = { onClose: () => void; children: ComponentChildren }
const Dialog = ({ onClose, children }: DialogProps) => {}

// ❌ Bad - interface
interface DialogProps { onClose: () => void }
```

## Zod Schemas

Use Zod for data from external sources (API, forms, store state, config):

```typescript
// ✅ Good - Derive type from schema
const orderDraftSchema = z.object({
  side: orderSideSchema,
  type: orderTypeSchema,
  price: z.string(),
})
export type OrderDraft = z.infer<typeof orderDraftSchema>

// ❌ Bad - Direct type for data
export type OrderDraft = { side: OrderSide; type: OrderType; price: string }
```

> Export schema only if needed for external validation. Otherwise, export type only.

### Prefer Zod Over Inline Regex

Use Zod schemas for validation when applicable. Inline regex is acceptable for simple pattern matching:

```typescript
// ✅ Good - Zod schema
const configSchema = z.object({
  chainId: z.number().positive(),
  rpcUrl: z.string().url(),
})

// ✅ Acceptable - Simple regex
const isHexString = /^0x[0-9a-fA-F]*$/.test(value)

// ❌ Bad - Complex inline validation without schema
const isValid = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0
```

## Return Types

Always specify return types for helper functions.

## Nullish Coalescing

Prefer `??` over `||` for default values. `??` only falls back on `null`/`undefined`, while `||` falls back on any falsy value (`0`, `''`, `false`) which may be valid data.

## Template Literals with Nullish Values

Guard against null/undefined **before** template literal interpolation. `null` coerces to `"null"` (truthy string):

```typescript
// ❌ Bad - "null:eip1193" is truthy
const key = type ? `${id}:${type}` : id  // id=null → "null:eip1193"
return key && cache ? cache[key] : undefined  // passes!

// ✅ Good - Early guard
if (!id) return undefined
const key = type ? `${id}:${type}` : id
```

## Number Conversion

- Use `Number(amount)` instead of `Number.parseFloat(amount)`
- Always check `Number.isNaN()` when parsing strings to numbers (see below)
- Use `replaceAll` instead of `replace` for multiple occurrences
- Use `Promise.allSettled` for independent requests; `Promise.all` when all must succeed

### NaN Validation for External Data

Validate NaN when parsing external/user input. Optional for internal calculations and Zustand store values.

```typescript
// ✅ Good - Validate external data
const open = Number(p.open)
if (Number.isNaN(open)) return null
```

## Utility Libraries

### Helper Functions — Reuse Before Creating

**MUST read the relevant utility files before creating any new helper function.** Existing functions may have different names.

| Task domain | Read first |
|---|---|
| Encoding/decoding | `src/util/encoding.ts` |
| Cipher operations | `src/util/cipher.ts` |
| Presence assertions | `src/util/assertPresence.ts` |
| Sub-account assertions | `src/util/assertSubAccount.ts` |
| COOP checks | `src/util/coop.ts` |
| Error handling | `src/core/error.ts` |
| RPC message types | `src/core/message.ts` |
| Sign utilities | `src/sign/app-sdk/utils.ts` |

## assertPresence Utility

Use `assertPresence()` from `:util/assertPresence` for validation and type narrowing. Uses `function` declaration because TypeScript's `asserts` return type requires explicit type annotations on `const` (TS2775):

```typescript
import { assertPresence } from ':util/assertPresence'

assertPresence(endpoint, undefined, 'RPC endpoint is required')  // throws if null/undefined, narrows type
assertPresence(chainId, undefined, 'Chain ID must be specified')  // narrows T | null | undefined → NonNullable<T>
```

Use for: required parameters, type narrowing, invariants, defensive guards.

See also: `assertArrayPresence()` in `src/util/assertPresence.ts`, `assertSubAccount()` in `src/util/assertSubAccount.ts`.

## Formatting & Code Style

- Run `pnpm lint` and `pnpm format` from packages/app-sdk directory
- Tabs (indent width: 3), single quotes, no semicolons (unless ASI-hazard)
- No `any` type
- Remove unused imports and logic
