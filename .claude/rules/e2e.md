# E2E Testing Rules

## Test Coverage Strategy

RPC method tests run with **Google OAuth as the primary authentication method**. MetaMask EOA tests verify connectivity only.

| Suite | Auth | Scope | File |
|-------|------|-------|------|
| Google OAuth | Google | All RPC method tests | `tests/google/rpc-methods.spec.ts` |
| MetaMask EOA | MetaMask | Connection + personal_sign | `tests/eoa/rpc-methods.spec.ts` |

When adding a new RPC method test, add it to `tests/google/rpc-methods.spec.ts`.

## Element Selection

Always use `data-testid` attributes for element selection. Never use CSS classes, tag names, or DOM structure for selectors.

```typescript
// Good
page.getByTestId('rpc-card-personal_sign')
page.getByTestId('section-event-listeners')

// Bad
page.locator('.card-container')
page.locator('div > form > button')
```

**Exceptions:**
- **Third-party pages** (Google OAuth, MetaMask extension): Use `getByRole` or stable attribute selectors. Add a comment explaining why `data-testid` is not possible.
- **Chakra UI toasts**: Use HTML `id` selector (`#toast-*`) from `toast({ id })`. Chakra does not support `data-testid` on toasts.

## Serial Mode for Authenticated Tests

The SDK popup at `app.startale.com` communicates with the testapp via `postMessage`. This requires the popup session to be established within the same browser context where the initial login occurred. Playwright's `storageState` only preserves cookies and localStorage but cannot restore the in-memory SDK state.

Therefore, all authenticated test suites MUST use serial mode with a shared browser context:

```typescript
test.describe.configure({ mode: 'serial' })
```

Login is performed once (first test or `beforeAll`), then all subsequent tests reuse the same page.

## Timeouts

Use config-level timeouts exclusively. Never use inline `waitForTimeout` or hardcoded timeout values in tests.

- `expect.timeout`: 60s (config)
- `actionTimeout`: 60s (config)
- `navigationTimeout`: 90s (config)

## Popup Handling

Use `triggerAndApproveSDKPopup` for RPC calls that open an SDK popup. The helper handles all action button variants (Sign, Approve, Confirm, Send) and popup auto-close scenarios.

## Page Object Model

Follow the Page Object Model pattern. All page objects are in `e2e/page-objects/`:
- `dashboardPage.ts` — Dashboard section selectors
- `rpcMethodCard.ts` — RPC method card selectors and actions

## Test File Organization

```
e2e/
├── lib/
│   └── constants.ts       # ROUTES, CHAIN_IDS, SONEIUM_CHAIN
├── tests/
│   ├── eoa/           # EOA connect + basic signing test
│   ├── google/        # Google OAuth — full RPC method tests
│   └── smoke/         # No-auth smoke tests
```
