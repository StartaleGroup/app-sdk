# Testing Requirements

## Test Coverage

- **80% minimum** for all code
- **100% required** for financial calculations (swap amounts, gas estimation, PnL, liquidation, margin, fee)

Test Types (ALL required):
1. **Unit Tests** - Individual functions, utilities, components -> See `.claude/rules/unit-test.md`
2. **E2E Tests** - Critical user flows (Playwright) -> See `.claude/rules/e2e.md`

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED)
2. Run test - it should FAIL
3. Write minimal implementation (GREEN)
4. Run test - it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

See `/tdd` command and `tdd-guide` agent for the full RED -> GREEN -> REFACTOR workflow.

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation
3. Verify mocks are correct
4. Fix implementation, not tests (unless tests are wrong)

## Agent Support

- **tdd-guide** - Use PROACTIVELY for new features, enforces write-tests-first
- **e2e-runner** - Playwright E2E testing specialist
