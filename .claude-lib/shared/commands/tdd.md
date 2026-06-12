---
description: Enforce test-driven development workflow with Vitest.
---

# TDD Command

Invokes the **tdd-guide** agent to enforce test-first development methodology.

## TDD Cycle

```
RED → GREEN → REFACTOR → REPEAT

RED:      Write a failing test
GREEN:    Write minimal code to pass
REFACTOR: Improve code, keep tests passing
REPEAT:   Next feature/scenario
```

## When to Use

- Implementing new utility functions or hooks
- Fixing bugs (write test that reproduces bug first)
- Refactoring existing logic
- Building financial calculations (amounts, fees, conversions, precision arithmetic)

## Example Usage

```
/tdd Implement a formatAmount function that handles decimal precision
/tdd Add fee calculation with big.js
/tdd Fix the data formatting bug
```

## What Gets Tested

| Type | Target | Tool |
|------|--------|------|
| Unit | Formatting utilities, precision arithmetic, validators | Vitest |
| Unit | Data transformations, time utilities, schema validation | Vitest |
| Integration | Hooks with mocked stores/API/WSS | Vitest + Testing Library |
| E2E | User flows (use `/e2e` instead) | Playwright |

## Quick Commands

```bash
pnpm vitest run                    # Run all
pnpm vitest run --coverage         # With coverage
pnpm vitest watch                  # Watch mode
```

## Coverage Requirements

- **80% minimum** for all code
- **100% required** for financial calculations (amounts, fees, conversions, precision arithmetic)

## Related

- `/e2e` — End-to-end tests with Playwright
- `code-review` skill — Code quality review after implementation
- `.claude/agents/tdd-guide.md` — Agent configuration with examples
