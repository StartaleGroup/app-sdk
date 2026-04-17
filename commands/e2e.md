---
description: Generate and run end-to-end tests with Playwright.
---

# E2E Command

Invokes the **e2e-runner** agent to generate, maintain, and execute Playwright E2E tests.

## What This Command Does

1. Analyze user flow and identify test scenarios
2. Generate Playwright test using Page Object Model
3. Run tests and capture artifacts (screenshots, videos, traces on failure)
4. Identify flaky tests and recommend fixes

## When to Use

- Testing critical user journeys (login, transactions, wallet, navigation)
- Verifying multi-step flows end-to-end
- Preparing for production deployment

## Example Usage

```
/e2e Test the main transaction flow
/e2e Test authentication and session management
/e2e auth      # Auth-related tests only
/e2e <feature> # Feature-specific tests only
```

## Critical Flows

**CRITICAL (Must Always Pass):**
1. Authentication (login/logout)
2. Wallet connection
3. Core transactions (orders, swaps, transfers — project-specific)
4. Faucet claim (if applicable)

**IMPORTANT:**
1. Feature list display and navigation
2. Real-time data updates
3. Chart/visualization rendering
4. Balance display accuracy
5. Responsive layout

## Project Conventions

- Spec files: `e2e/specs/<feature>/`
- Page objects: `e2e/page-objects/`
- Constants: `e2e/lib/constants.ts`
- Selectors: `data-testid` attributes only
- Auth: `auth.setup.ts` via Playwright projects
- Workers: 1 (rate limiting)
- Rules: `.claude/rules/e2e.md`

## Quick Commands

```bash
pnpm test:e2e                              # Run all
pnpm test:e2e:headed                       # See browser
pnpm test:e2e:ui                           # UI mode
pnpm exec playwright codegen               # Generate selectors
pnpm exec playwright show-report           # View report
```

## Related

- `/e2e-maintenance` — Test suite quality analysis
- `/tdd` — Unit tests with Vitest
- `.claude/agents/e2e-runner.md` — Agent configuration
