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

1. **Auto-generated files** (Orval API clients, `routeTree.gen.ts`) — Orval hook overloads require `function` for TanStack Query v5 type safety.
2. **`src/router.tsx` — `getRouter` factory** — TanStack Start prescribed pattern.
3. **Assertion functions** (`asserts condition`) — TS2775 requires explicit type annotations on `const`.
4. **Route file component functions** (`src/routes/**/*.tsx`) — TanStack Router convention.

## Type Definitions

- Use `type` imports where possible
- No TypeScript `enum` (use union types or `z.enum()`)
- **Data types** (API, forms, store state): Zod schemas with `z.infer`
- **Component props & utilities**: Inline `type` definitions (not `interface`)

```typescript
// ✅ Good - Inline props
const Button = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => {}

// ❌ Bad - Separate type definition
type ButtonProps = { onClick: () => void; children: ReactNode }
const Button = ({ onClick, children }: ButtonProps) => {}

// ❌ Bad - interface
interface ButtonProps { onClick: () => void }
```

## Zod Schemas

Use Zod for data from external sources (API, forms, store state, config):

```typescript
// ✅ Good - Derive type from schema
const inputSchema = z.object({
  sourceToken: tokenAddressSchema,
  targetToken: tokenAddressSchema,
  amount: z.string(),
})
export type InputData = z.infer<typeof inputSchema>

// ❌ Bad - Direct type for data
export type InputData = { sourceToken: string; targetToken: string; amount: string }
```

> Export schema only if needed for external validation. Otherwise, export type only.

### Prefer Zod Over Inline Regex

Use Zod schemas for validation. Reuse validators from `lib/`. Inline regex is acceptable **only** for keystroke filtering in `onChange` handlers:

```typescript
// ✅ Good - Zod with TanStack Form
const formSchema = z.object({
  amount: positiveNumericFormField.refine(
    (val) => val !== '' && bn(val).gt(0) && bn(val).lte(bn(max)),
  ),
})

// ✅ Acceptable - Regex for keystroke filtering only
onChange={(e) => {
  if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
    field.handleChange(e.target.value)
  }
}}

// ❌ Bad - Inline regex for validation
const isValid = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0
```

## Return Types

Always specify return types for helper functions.

## Nullish Coalescing

Prefer `??` over `||` for default values. `??` only falls back on `null`/`undefined`, while `||` falls back on any falsy value (`0`, `''`, `false`) which may be valid data.

## Template Literals with Nullish Values

Guard against null/undefined **before** template literal interpolation. `null` coerces to `"null"` (truthy string):

```typescript
// ❌ Bad - "null:spot" is truthy
const key = type ? `${id}:${type}` : id  // id=null -> "null:spot"
return key && stats ? stats[key] : undefined  // passes!

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

Validate NaN when parsing API/WSS/user input. Optional for internal calculations, Zustand store values, and `bn()` results.

```typescript
// ✅ Good - Validate external data
const open = Number(p.open)
if (Number.isNaN(open)) return null
```

## Utility Libraries

### big.js (`bn()` helper) — See also `web3.team.md` Precision Arithmetic for usage patterns

```typescript
import Big from 'big.js'
export type BNS = BigSource | bigint
export const bn = (value: BNS) =>
  typeof value === 'bigint' ? Big(value.toString()) : Big(value)
```

### Helper Functions — Reuse Before Creating

**MUST read the relevant utility files in `src/lib/` before creating any new helper function.** Existing functions may have different names (e.g., `formatVolume` does K/M/B suffixes).

Common utility file locations:
- Math utilities, currency/price formatting, time/date formatting
- Token utilities, input sanitization, environment config
- General utilities (classnames, BigNumber): `lib/utils.ts`

## Assert Utility

Use `assert()` from `~/lib/utils` for validation and type narrowing:

```typescript
import { assert } from '~/lib/utils'

assert(endpoint, 'API endpoint is required')  // throws if falsy, narrows type
assert(selectedId, 'No item selected') // narrows T | null -> T
```

Use for: required parameters, type narrowing, invariants, defensive guards.

## Formatting & Code Style

- Run `pnpm biome:fix` from root directory
- Single quotes, double quotes for JSX attributes
- No semicolons, trailing commas, line width: 80
- No `any` type
- Remove unused imports, tailwind classes, and logic
