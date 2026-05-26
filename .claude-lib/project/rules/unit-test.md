---
paths: ["**/*.test.{ts,tsx}", "packages/app-sdk/src/**/*.ts"]
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
src/util/encoding.ts
src/util/__tests__/encoding.test.ts
```

## Test Target Priority

1. **Required**: Pure functions in `src/util/`, `src/core/` (encoding, cipher, validation, error handling)
2. **Recommended**: Provider logic in `src/interface/`, signer logic in `src/sign/`
3. **Optional**: Store logic in `src/store/` (critical state transitions only)
4. **Skip**: Auto-generated asset files from `compile-assets.cjs`, UI components in `src/ui/`

## Async & External Dependency Policy

- iframe/popup communication — Mock the `Communicator` with `vi.mock()`
- IndexedDB operations — Use `fake-indexeddb` for testing
- External RPC calls — Mock the transport layer with `vi.mock()`

## New Function Rule

When adding a new exported function to `src/`:

- **Create a unit test** in the corresponding `__tests__/` directory
- Trivial getters or constants may skip tests

## Boundary Testing (MANDATORY)

Every test suite MUST include boundary cases. Boundary bugs cause the most critical issues in SDK libraries.

### Boundary Checklist

| Category | Cases |
|----------|-------|
| **Zero** | `0`, `'0'`, `0n` |
| **Negative** | `-1`, negative values |
| **Empty** | `''`, `[]`, `{}`, `undefined`, `null` |
| **NaN / Invalid** | `'abc'`, `NaN`, malformed RPC data |
| **Extremes** | Very large numbers, very small (dust), max safe integer |
| **Precision** | 6 decimals (USDC) vs 18 decimals (native token) |
| **Off-by-one** | Array first/last element, page boundaries, index 0 |
| **Division by zero** | Any function with a denominator must handle `0` |

### SDK-Specific Boundaries

```typescript
// Chain ID: valid and invalid
it('rejects invalid chain ID', () => {
  expect(() => assertParamsChainId([{ chainId: 0 }])).toThrow()
})

// Address: edge cases
it('validates checksummed address', () => {
  expect(isAddress('0x1234567890AbCdEf1234567890aBcDeF12345678')).toBe(true)
})

// Message: empty payload
it('handles empty RPC request', () => {
  expect(() => handleRequest({})).toThrow()
})

// Spend permission: expired
it('rejects expired spend permission', () => {
  expect(isPermissionValid({ expiry: Date.now() - 1000 })).toBe(false)
})
```

## Mocking

### vi.mock Hoisting

`vi.mock()` is automatically hoisted to the top of the file. Use `vi.hoisted()` when referencing file-scoped variables inside a mock factory:

```typescript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }))
vi.mock(':core/communicator', () => ({ Communicator: mockFn }))
```

### Module Mocks

```typescript
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))
```

### Zustand Store Mocks

```typescript
vi.mock(':store/accounts', () => ({
  useAccountsStore: vi.fn().mockReturnValue({ account: mockAccount }),
}))
```

Extend with `getState()` only when needed:

```typescript
vi.mock(':store/accounts', () => ({
  useAccountsStore: Object.assign(vi.fn(() => ({ account: mockAccount })), {
    getState: vi.fn(() => ({ account: mockAccount })),
  }),
}))
```

### Spy (prefer over full mock when possible)

```typescript
const spy = vi.spyOn(crypto.subtle, 'exportKey')
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
it('encodes message payload correctly', () => {
  // Arrange
  const payload = { method: 'eth_sendTransaction', params: [txData] }

  // Act
  const encoded = encodeMessage(payload)

  // Assert
  expect(encoded).toContain('eth_sendTransaction')
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
   round numbers. If the function handles decimals, test `1.5` not just `5`.

4. **Prove precision arithmetic works** — When a function uses `bigint` or
   `viem` utilities, include at least one test with edge-case values
   (e.g., very large numbers, dust amounts). This documents *why* the approach exists.

## Commands

```bash
pnpm test                  # Run once (from packages/app-sdk)
pnpm test -- --watch       # Watch mode
pnpm test:coverage         # With coverage report
```
