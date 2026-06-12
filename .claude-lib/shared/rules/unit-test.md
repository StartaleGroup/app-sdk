---
paths: ["**/*.test.{ts,tsx}", "src/lib/**/*.ts", "src/hooks/**/*.{ts,tsx}"]
---

# Unit Testing (Vitest)

## Imports

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
```

Use `vi.mock` / `vi.fn()` / `vi.spyOn` — **never** `jest.*`.

## File Placement

Test files colocate with source: `__tests__/[name].test.ts`

```
lib/math.ts
lib/__tests__/math.test.ts
```

## Test Target Priority

1. **Required**: Pure functions in `lib/` (math, formatting, calculations, sanitization, utilities)
2. **Recommended**: Mapper functions (`*Mappers.ts`)
3. **Optional**: Custom hooks (critical ones only — wrap with `renderHook` + `QueryClientProvider`)
4. **Skip**: Zod validators, Orval-generated API code, blockchain transaction builders

## Async & External Dependency Policy

- Blockchain operations — **Unit test NOT required** (covered by E2E)
- HTTP API calls — **Unit test NOT required** (covered by E2E)
- Custom hooks calling APIs — Mock the API layer with `vi.mock()`

## New Function Rule

When adding a new exported function to `lib/` or `hooks/`:

- **Create a unit test** in the corresponding `__tests__/` directory
- Trivial getters or constants may skip tests

## Boundary Testing (MANDATORY)

Every test suite MUST include boundary cases. Boundary bugs cause the most critical issues in financial applications.

### Boundary Checklist

| Category | Cases |
|----------|-------|
| **Zero** | `0`, `'0'`, `0n` |
| **Negative** | `-1`, negative PnL, negative balance change |
| **Empty** | `''`, `[]`, `{}`, `undefined`, `null` |
| **NaN / Invalid** | `'abc'`, `NaN`, malformed API/WSS data |
| **Extremes** | Very large numbers, very small (dust), max safe integer |
| **Precision** | 6 decimals (USDC) vs 18 decimals (native token) |
| **Off-by-one** | Array first/last element, page boundaries, index 0 |
| **Division by zero** | Any function with a denominator must handle `0` |

### Financial Boundaries

```typescript
// Decimal precision: 6 (USDC) vs 18 (native token)
it('preserves 18-decimal precision', () => {
  expect(toSmallestUnit('1.123456789012345678', 18)).toBe('1123456789012345678')
})

// Zero state
it('returns zero for empty balance', () => {
  expect(formatBalance('0', 6)).toBe('0.00')
})

// Minimum threshold
it('rejects amount below minimum', () => {
  expect(isValidAmount('0.001', { min: '0.01' })).toBe(false)
})

// Insufficient funds
it('flags insufficient balance for gas', () => {
  expect(hasEnoughForGas({ balance: '0.001', estimatedGas: '0.01' })).toBe(false)
})

// Exact breakeven (zero result)
it('calculates zero PnL at entry price', () => {
  expect(calcPnL({ entry: '100', mark: '100', size: '10' })).toBe('0')
})
```

## Mocking

### vi.mock Hoisting

`vi.mock()` is automatically hoisted to the top of the file. Use `vi.hoisted()` when referencing file-scoped variables inside a mock factory:

```typescript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }))
vi.mock('~/services/api', () => ({ fetchData: mockFn }))
```

### Module Mocks

```typescript
vi.mock('~/services/websocket', () => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))
```

### Zustand Store Mocks

```typescript
vi.mock('~/stores/useAppStore', () => ({
  useAppStore: vi.fn().mockReturnValue({ selectedId: 'item-1' }),
}))
```

Extend with `getState()` only when needed:

```typescript
vi.mock('~/stores/useAppStore', () => ({
  useAppStore: Object.assign(vi.fn(() => ({ selectedId: 'item-1' })), {
    getState: vi.fn(() => ({ selectedId: 'item-1' })),
  }),
}))
```

### Spy (prefer over full mock when possible)

```typescript
const spy = vi.spyOn(Big.prototype, 'times')
```

## Test Isolation

- Each test must be independent — no shared mutable state
- Never rely on test execution order
- `vi.clearAllMocks()` — resets call history only (keeps implementation)
- `vi.restoreAllMocks()` — also restores original `spyOn` implementations (**recommended**)

```typescript
afterEach(() => {
  vi.restoreAllMocks()
})
```

## Writing Effective Tests

### Test Structure (Arrange-Act-Assert)

```typescript
it('calculates output amount with fee deducted', () => {
  // Arrange
  const inputAmount = '100'
  const rate = '1.5'
  const feeRate = '0.003'

  // Act
  const output = calcOutput(inputAmount, rate, feeRate)

  // Assert
  expect(output).toBe('149.55')
})
```

### Principles

1. **Test behavior, not implementation** — Assert what the function *should do*,
   not how it does it internally.

2. **Deterministic tests** — Same result regardless of when or where they run:
   - **Time**: use `vi.useFakeTimers()` + `vi.setSystemTime()`, never
     `Date.now()` directly
   - **Timezone**: use local Date constructors (`new Date(2026, 2, 3, 14, 0)`)
     when testing formatted output, not UTC ISO strings
   - **Locale**: use regex or `toMatch` for locale-formatted numbers

3. **Test real-world inputs** — Use values that reflect actual usage, not just
   round numbers. If the function handles leverage, test `1.5` not just `5`.

4. **Prove precision arithmetic works** — When a function uses `big.js`,
   include at least one test that would fail with native JS arithmetic
   (e.g., `0.1 * 0.2`). This documents *why* the dependency exists.

## Commands

```bash
pnpm test:unit             # Run once
pnpm test:unit:watch       # Watch mode
pnpm test:unit:coverage    # With coverage report
```
