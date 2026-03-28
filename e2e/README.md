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
pnpm test:eoa-required # EOA Required onboarding tests
# CI (without --headed flag)
pnpm test:ci           # All tests
pnpm test:ci:smoke     # Smoke tests only
pnpm test:ci:google    # Google OAuth tests
pnpm test:ci:eoa       # MetaMask EOA tests
pnpm test:ci:eoa-required # EOA Required tests
```

> **Note:** EOA tests use dappwright which forces `headless: false` internally, so they always run in headed mode regardless of the `--headed` flag.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_TEST_EMAIL` | Yes (Google) | Google test account email |
| `GOOGLE_TEST_PASSWORD` | Yes (Google) | Google test account password |
| `GOOGLE_TOTP_SECRET` | No | Base32 TOTP secret for 2FA |
| `WALLET_SEED` | Yes (EOA) | MetaMask seed phrase for EOA tests |
| `EOA_LINKED_WALLET_SEED` | Yes (EOA Required) | MetaMask seed phrase for EOA Required onboarding tests |
| `GOOGLE_SESSION_STATE` | Recommended | Google session cookies JSON — bypasses login form and "Verify it's you" challenges (see below) |
| `SKIP_GOOGLE_OAUTH` | No | Set `true` to skip Google tests |

### Google Session State (`GOOGLE_SESSION_STATE`)

**Strongly recommended for both CI and local testing.**

Google blocks automated sign-ins from unknown IPs by showing a "Verify it's you" challenge (SMS/phone verification instead of TOTP). Since GitHub Actions runners use different IPs on every run, and local environments can also trigger bot detection (`navigator.webdriver`), tests fail without pre-authenticated session cookies.

`GOOGLE_SESSION_STATE` injects Google's authentication cookies (SID, HSID, etc.) into the browser context before any test navigates to Google. Google recognizes these cookies and auto-authenticates — the entire login form (email, password, TOTP, "Verify it's you") is bypassed.

**How it works:**
- When set: Google auto-authenticates via cookies → login form is skipped entirely (recommended)
- When not set: Full login flow runs (email → password → TOTP) — may fail due to bot detection or IP-based challenges

**Generating the session:**

```bash
# 1. Start the testapp
cd examples/testapp && pnpm dev

# 2. Run the session save script (opens a browser for manual login)
cd e2e && pnpm save:google-session

# 3. Filter to Google cookies only and copy to clipboard
cat google-session.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
filtered = {'cookies': [c for c in d['cookies'] if c.get('domain','').endswith('google.com') or c.get('domain','').endswith('google.com.sg')], 'origins': []}
print(json.dumps(filtered))
" | pbcopy
```

**For CI:** Paste the filtered JSON into GitHub Secret `GOOGLE_SESSION_STATE`.

**For local testing:** Add to `e2e/.env`:
```
GOOGLE_SESSION_STATE=<filtered JSON>
```

> **Note:** Google session cookies expire periodically. Re-run `save:google-session` if tests start failing with "Verify it's you", account chooser showing "Signed out", or the Google login form appearing unexpectedly.

## Test Inventory

<!-- IMPORTANT: Keep this table in sync when adding, removing, or renaming E2E tests. -->

**Auth column legend:**
- `Google` — requires Google OAuth login (serial, shared context)
- `EOA` — requires MetaMask via dappwright
- `EOA Required` — requires Google OAuth + MetaMask (EOA wallet linking)
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

### EOA Required Onboarding (`tests/eoa-required/eoa-required-onboarding.spec.ts`)

Tests the full EOA Required lifecycle: Google OAuth login, MetaMask wallet linking via Dynamic Auth, address verification, and wallet disconnect. Uses a dedicated `EOA_LINKED_WALLET_SEED` (separate from `WALLET_SEED`).

| # | Test | Auth |
|--:|------|:----:|
| 13 | should complete EOA required onboarding with Google + MetaMask | EOA Required |
| 14 | should return EOA wallet address from eth_requestAccounts | EOA Required |
| 15 | should show linked EOA wallet on Super App wallets page | EOA Required |
| 16 | should disconnect EOA wallet from Super App | EOA Required |

**Total: 4 spec files, 16 tests**

## Directory Structure

```
e2e/
├── tests/
│   ├── eoa/
│   │   └── rpc-methods.spec.ts            # MetaMask EOA connect + personal_sign
│   ├── eoa-required/
│   │   └── eoa-required-onboarding.spec.ts # EOA Required onboarding lifecycle
│   ├── google/
│   │   └── rpc-methods.spec.ts            # Google OAuth + all RPC method tests
│   └── smoke/
│       └── dashboard-loads.spec.ts        # Dashboard loads without auth
├── page-objects/
│   ├── dashboardPage.ts                   # Dashboard section selectors (data-testid)
│   └── rpcMethodCard.ts                   # RPC method card selectors & actions
├── fixtures/
│   └── wallet.fixture.ts                  # dappwright MetaMask fixture (worker-scoped, parameterized)
├── lib/
│   ├── constants.ts                       # Routes, timeouts, chain config
│   ├── helpers.ts                         # Popup handling, SDK approval helpers
│   └── auth/
│       ├── google-oauth.ts                # Google OAuth + TOTP 2FA automation
│       ├── metamask-eoa.ts               # MetaMask/dappwright EOA login
│       └── eoa-required-onboarding.ts    # MetaMask wallet linking for EOA Required
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
