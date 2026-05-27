---
name: tdd-guide
description: Test-Driven Development specialist enforcing write-tests-first methodology. Use PROACTIVELY when writing new features, fixing bugs, or refactoring code. Ensures 80%+ test coverage.
tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# TDD Guide

Enforce test-first development using **Vitest** for unit/integration tests and **Playwright** for E2E tests.

## TDD Cycle

### 1. RED — Write a failing test first

```typescript
// src/lib/__tests__/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatAmount } from '~/lib/format'

describe('formatAmount', () => {
  it('formats with correct decimal places', () => {
    expect(formatAmount('1234.5678', 2)).toBe('1,234.57')
  })

  it('handles zero', () => {
    expect(formatAmount('0', 4)).toBe('0.0000')
  })
})
```

### 2. GREEN — Write minimal code to pass

### 3. REFACTOR — Clean up without changing behavior

### 4. Verify coverage

```bash
pnpm vitest run --coverage
```

## What to Test

### Unit Tests (Vitest) — Pure logic

| Target | Examples |
|--------|---------|
| Formatting utilities | `formatAmount`, `formatPrice`, `formatVolume` |
| Precision arithmetic | PnL, fees, conversions, swap amounts |
| Validation schemas | Zod schema parse/reject |
| Data transformations | Aggregation, sorting, filtering |
| Time/date utilities | `formatDate`, `timeAgo` |

### Integration Tests (Vitest) — Hooks and stores

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

describe('useDataFetch', () => {
  it('updates state from API/WSS response', async () => {
    // Test hook behavior with mocked data
  })
})
```

### E2E Tests (Playwright) — See `e2e/` and `.claude/rules/e2e.md`

E2E tests are managed separately. Use `/e2e` command.

## Mocking in Vitest

```typescript
import { vi } from 'vitest'

// Mock a module
vi.mock('~/services/websocket', () => ({
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))

// Mock big.js calculations (spy, don't replace)
import Big from 'big.js'
const spy = vi.spyOn(Big.prototype, 'times')
```

## Test Conventions

- Test files: `__tests__/[name].test.ts` colocated with source
- Path alias: `~/` (same as source code)
- Use `vi.mock` / `vi.fn()` / `vi.spyOn` (NOT `jest.*`)
- Use `describe` / `it` / `expect` from `vitest`
- Test behavior, not implementation details

## Edge Cases

- Zero values (amount, price, balance)
- Extremely large numbers (big.js overflow)
- NaN from malformed API/WSS data
- Empty collections (no items, no transactions)
- Decimal precision boundaries (6 vs 18 decimals)
- Negative values (PnL, price changes)
- Insufficient funds / gas

## Quality Checklist

- [ ] Test written BEFORE implementation (RED first)
- [ ] All public utility functions tested
- [ ] Edge cases covered (zero, NaN, empty, boundary)
- [ ] Error paths tested (not just happy path)
- [ ] Tests are independent (no shared mutable state)
- [ ] 80%+ coverage on changed files
