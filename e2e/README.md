# E2E Tests

Playwright-based end-to-end tests for the Startale App SDK testapp.

## Setup

```bash
# Install dependencies
cd e2e && pnpm install && pnpm exec playwright install

# Start testapp (separate terminal)
cd examples/testapp && pnpm dev

# Run tests
pnpm test              # All tests (headed)
pnpm test:smoke        # Smoke tests only
pnpm test:google       # Google OAuth + RPC method tests
pnpm test:eoa          # MetaMask EOA tests
# CI (without --headed flag)
pnpm test:ci           # All tests
pnpm test:ci:smoke     # Smoke tests only
pnpm test:ci:google    # Google OAuth tests
pnpm test:ci:eoa       # MetaMask EOA tests
```

> **Note:** EOA tests use dappwright which forces `headless: false` internally, so they always run in headed mode regardless of the `--headed` flag.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `TESTAPP_URL` | No | Testapp URL (default: `http://localhost:3001`) |
| `GOOGLE_TEST_EMAIL` | Yes (Google) | Google test account email |
| `GOOGLE_TEST_PASSWORD` | Yes (Google) | Google test account password |
| `GOOGLE_TOTP_SECRET` | No | Base32 TOTP secret for 2FA |
| `WALLET_SEED` | Yes (EOA) | MetaMask seed phrase for EOA tests |
| `SKIP_GOOGLE_OAUTH` | No | Set `true` to skip Google tests |

## Test Inventory

<!-- IMPORTANT: Keep this table in sync when adding, removing, or renaming E2E tests. -->

**Auth column legend:**
- `Google` — requires Google OAuth login (serial, shared context)
- `EOA` — requires MetaMask via dappwright
- `No` — no authentication required

### Smoke Tests (`tests/smoke/dashboard-loads.spec.ts`)

| # | Test | Auth |
|--:|------|:----:|
| 1 | dashboard loads with expected sections | No |
| 2 | eth_requestAccounts card is visible | No |
| 3 | wallet_connect card is visible | No |

### EOA RPC Methods (`tests/eoa/rpc-methods.spec.ts`)

MetaMask login is performed in the first test, then personal_sign verifies basic signing works. Full RPC coverage is handled by the Google OAuth suite.

| # | Test | Auth |
|--:|------|:----:|
| 4 | personal_sign — sign a message via shortcut | EOA |

### Google OAuth RPC Methods (`tests/google/rpc-methods.spec.ts`)

All tests run in serial mode within a single browser context. Google login is performed once in `beforeAll`, then each test reuses the same authenticated page.

| # | Test | Auth |
|--:|------|:----:|
| 5 | personal_sign — sign a message via shortcut | Google |
| 6 | eth_signTypedData_v4 — sign typed data via shortcut | Google |
| 7 | eth_sendTransaction — send example transaction | Google |
| 8 | wallet_sendCalls — send calls via shortcut | Google |
| 9 | wallet_switchEthereumChain — switch chain via shortcut | Google |
| 10 | eth_getBalance — get balance via shortcut | Google |
| 11 | eth_getBalance — error on invalid address | Google |
| 12 | eth_getTransactionCount — error on invalid address | Google |

**Total: 3 spec files, 12 tests**

## Directory Structure

```
e2e/
├── tests/
│   ├── eoa/
│   │   └── rpc-methods.spec.ts            # MetaMask EOA connect + personal_sign
│   ├── google/
│   │   └── rpc-methods.spec.ts            # Google OAuth + all RPC method tests
│   └── smoke/
│       └── dashboard-loads.spec.ts        # Dashboard loads without auth
├── page-objects/
│   ├── dashboardPage.ts                   # Dashboard section selectors (data-testid)
│   └── rpcMethodCard.ts                   # RPC method card selectors & actions
├── fixtures/
│   └── wallet.fixture.ts                  # dappwright MetaMask fixture (worker-scoped)
├── lib/
│   ├── constants.ts                       # Routes, timeouts, chain config
│   ├── helpers.ts                         # Popup handling, SDK approval helpers
│   └── auth/
│       ├── google-oauth.ts                # Google OAuth + TOTP 2FA automation
│       └── metamask-eoa.ts               # MetaMask/dappwright EOA login
├── playwright.config.ts
├── .env.example
└── README.md
```

## Architecture Decisions

### Serial Mode for Authenticated Tests

The SDK popup at `app.startale.com` communicates with the testapp via `postMessage`. This requires the popup's session to be established within the same browser context where the initial login occurred. Playwright's `storageState` only preserves cookies and localStorage but cannot restore the in-memory SDK state needed for popup communication.

Therefore, all authenticated tests (both Google OAuth and EOA) run in **serial mode** sharing a single browser context, with login performed once at the start.

### SDK Popup Approval

The SDK popup shows different action buttons depending on the operation:

| Screen | Button | Operations |
|--------|--------|-----------|
| `/connect-wallet` | Approve | `eth_requestAccounts` |
| `/message-sign` | Sign | `personal_sign`, `eth_signTypedData_*` |
| `/transaction` | Send | `eth_sendTransaction` |
| `/transaction` | Confirm | `wallet_sendCalls` |

The `approveSDKPopup` helper handles all variants with `Promise.race` to also handle cases where the popup auto-closes (e.g., signer not deployed errors).

## Conventions

- Use `data-testid` attributes for element selection (see `e2e` rules in `.claude/rules/`)
- Follow Page Object Model pattern
- Config-level timeouts: `expect: 60s`, `actionTimeout: 60s`, `navigationTimeout: 90s`
- Never use `waitForTimeout` — use Playwright assertions with auto-retry
- Workers: 1 (SDK popup requires sequential execution)
