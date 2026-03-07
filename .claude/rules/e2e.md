# E2E Testing Rules

## Test Coverage Requirement

All RPC method tests MUST pass with both authentication methods:
- **Google OAuth** (`tests/google/rpc-methods.spec.ts`)
- **EOA / MetaMask** (`tests/eoa/rpc-methods.spec.ts`)

When adding a new RPC method test, add it to both test suites.

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
- `sdkPopupPage.ts` — SDK popup selectors

## Test File Organization

```
tests/
├── eoa/        # EOA (MetaMask) connect + RPC method tests
├── google/     # Google OAuth RPC method tests
└── smoke/      # No-auth smoke tests
```
