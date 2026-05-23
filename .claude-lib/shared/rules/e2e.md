---
paths: "e2e/**/*.{ts,tsx}"
---

# E2E Testing Rules

## README Maintenance (MANDATORY)

When adding, removing, or renaming E2E tests, **always update `e2e/README.md`**:
- **Add/remove individual test rows** in the spec's table section (each `test()` block = one row)
- **Update the sequential `#` numbering** across all tables (1-N)
- **Update the total count** at the bottom ("Total: X spec files, Y tests")
- **Add/remove spec file sections** (with `###` heading) when creating or deleting spec files
- **Update "Auth Required" column** based on whether the test uses authenticated state
- **Update the directory structure** section if new directories are added

## Known Exceptions

**`export default` in `playwright.config.ts`**: Playwright's framework requires
`export default defineConfig(...)` as its entry point convention. This is the
only permitted use of `export default` in the `e2e/` directory.

## Test Organization

- Place specs under `e2e/specs/` following existing directory structure
- One spec file per feature area
- Use descriptive `describe()` and `test()` names

## Page Object Model

- Create page objects in `e2e/page-objects/` for reusable selectors
- Use `data-testid` attributes - never rely on CSS classes or DOM structure
- Keep selectors in page objects, not in spec files

## Prefer `getByTestId()` Over `locator('[data-testid="..."]')`

Use Playwright's built-in `getByTestId()` for `data-testid` selectors:

```typescript
// ✅ Good - Semantic and concise
page.getByTestId('submit-button')
dialog.getByTestId('close-button')

// ❌ Bad - Verbose CSS selector
page.locator('[data-testid="submit-button"]')
dialog.locator('[data-testid="close-button"]')
```

**Exceptions** where `locator()` is still required:
- Prefix match: `page.locator('[data-testid^="item-row-"]')`
- Compound selectors with non-testid parts: `page.getByTestId('timeframe-selector').locator('button')`
- Selector string constants used as parameters: `'[data-testid="network-fee"]' as const`

## Assertions

When testing state changes (balances, counts, etc.):

```typescript
// ✅ Good - Verify exact expected change
const initialBalance = await getBalance()
await performAction()
const finalBalance = await getBalance()
expect(finalBalance).toBe(initialBalance + EXPECTED_AMOUNT)

// ❌ Bad - Only verifies "something changed"
await performAction()
expect(finalBalance).toBeGreaterThan(initialBalance)

// ❌ Bad - Only verifies visibility, not actual change
await performAction()
await expect(page.locator('text=Balance')).toBeVisible()
```

Key principles:
- Capture initial state before action
- Verify exact expected change, not just "increased" or "visible"
- Use constants for expected values

## Never Use `waitForTimeout`

`waitForTimeout` is an anti-pattern that makes tests flaky. Always use proper assertions instead:

```typescript
// ❌ Bad - waitForTimeout causes flaky tests
await page.waitForTimeout(2000)
await expect(element).toBeVisible()

// ✅ Good - Use assertion with timeout option
await expect(element).toBeVisible({ timeout: TIMEOUTS.MEDIUM })

// ❌ Bad - Waiting for data to load
await page.waitForTimeout(3000)
const balance = await getBalance()

// ✅ Good - Use expect.poll for async value changes
await expect.poll(
  async () => getBalance(),
  { timeout: TIMEOUTS.LONG }
).toBe(expectedBalance)

// ❌ Bad - Waiting for animation
await page.waitForTimeout(500)

// ✅ Good - Wait for resulting state
await expect(button).toHaveAttribute('data-state', 'active')
```

**Why waitForTimeout is bad:**
- Fixed delays are arbitrary and environment-dependent
- Tests may pass locally but fail in CI (slower environment)
- Tests may pass most of the time but fail intermittently (flaky)
- Wastes time waiting when the condition is met earlier

**Instead, use:**
- `expect(element).toBeVisible()` - auto-retries until visible
- `expect(element).toHaveAttribute()` - waits for attribute change
- `expect.poll()` - polls async function until value matches
- `element.waitFor()` - waits for element state

## Timeout Tracking with Deadline Pattern

When a function has multiple timeout-consuming operations (waitFor, retry loops, polling), use a deadline pattern to prevent total execution time from exceeding caller expectations:

```typescript
// ❌ Bad - Each phase consumes full timeout independently
const waitForReady = async (page: Page, timeout = 60000) => {
  try {
    await element.waitFor({ timeout })  // Up to 60s
  } catch {
    await page.waitForTimeout(5000)     // +5s
    await element.waitFor({ timeout })  // Up to 60s more
  }

  const start = Date.now()
  while (Date.now() - start < timeout) { // Up to 60s more
    // polling...
  }
  // Total worst case: 185s instead of expected 60s!
}

// ✅ Good - Track elapsed time with deadline
const waitForReady = async (page: Page, timeout = 60000) => {
  const deadline = Date.now() + timeout
  const remaining = () => Math.max(0, deadline - Date.now())

  try {
    await element.waitFor({ timeout: remaining() })
  } catch {
    await page.waitForTimeout(Math.min(5000, remaining()))
    await element.waitFor({ timeout: remaining() })
  }

  while (Date.now() < deadline) {
    // polling...
  }
  // Total time is bounded by timeout parameter
}
```

**Key principles:**
- Calculate `deadline = Date.now() + timeout` at function start
- Use `remaining()` helper to get time left for each operation
- All phases share the same deadline
- Caller's timeout expectation is honored

## Timeouts

- Use timeout constants from `e2e/lib/constants.ts` (`TIMEOUTS.SHORT`, `TIMEOUTS.MEDIUM`, etc.)
- Never hardcode timeout values in spec files

## Auth

- Tests requiring authentication should use `auth.setup.ts` via Playwright projects
- Auth method: Configure per project (Privy, wallet connect, etc.)
- Workers: 1 (rate limiting)
