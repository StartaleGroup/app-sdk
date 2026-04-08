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
pnpm test:line         # LINE OAuth + RPC method tests (default)
pnpm test:google       # Google OAuth + RPC method tests (local only)
pnpm test:eoa          # MetaMask EOA tests
pnpm test:eoa-required # EOA Required onboarding tests
# CI (without --headed flag)
pnpm test:ci           # All tests
pnpm test:ci:smoke     # Smoke tests only
pnpm test:ci:line      # LINE OAuth tests
pnpm test:ci:google    # Google OAuth tests
pnpm test:ci:eoa       # MetaMask EOA tests
pnpm test:ci:eoa-required # EOA Required tests
```

> **Note:** EOA tests use dappwright which forces `headless: false` internally, so they always run in headed mode regardless of the `--headed` flag.

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `OAUTH_MODE` | No | `'line'` (default) or `'google'` — controls which OAuth tests run |
| `LINE_TEST_EMAIL` | Yes | LINE test account email |
| `LINE_TEST_PASSWORD` | Yes | LINE test account password |
| `LINE_SESSION_STATE` | Recommended | LINE session cookies JSON — enables SSO bypass (see below) |
| `WALLET_SEED` | Yes (EOA) | MetaMask seed phrase for EOA tests |
| `EOA_LINKED_WALLET_SEED` | Yes (EOA Required) | MetaMask seed phrase for EOA Required onboarding tests |
| `GOOGLE_TEST_EMAIL` | Optional | Google test account email (only for `OAUTH_MODE=google`) |
| `GOOGLE_TEST_PASSWORD` | Optional | Google test account password (only for `OAUTH_MODE=google`) |
| `GOOGLE_TOTP_SECRET` | Optional | Base32 TOTP secret for Google 2FA |
| `GOOGLE_SESSION_STATE` | Optional | Google session cookies JSON |

### LINE Session State (`LINE_SESSION_STATE`)

**Recommended for CI. Required when `OAUTH_MODE` is `'line'` (default).**

LINE blocks automated logins by requiring a verification code on the mobile app. Pre-saved session cookies enable SSO — LINE shows "Continue as [user]" with a single "Log in" button, bypassing the email/password form and verification code entirely.

Unlike Google, LINE does not have IP-based challenges. Cookies saved from any environment (local, CI) work consistently.

**How it works:**
- When set: LINE auto-authenticates via cookies → "Continue as [user]" + "Log in" button (recommended)
- When not set: Full login flow runs (email → password → verification code on mobile) — fails on CI

**Generating the session:**

```bash
# 1. Start the testapp
cd examples/testapp && pnpm dev

# 2. Run the session save script (opens a browser for manual login)
cd e2e && pnpm save:line-session

# 3. Copy the filtered output to clipboard
cat line-session.json | pbcopy
```

The script filters to LINE-only cookies (`access.line.me` domain). A full unfiltered session is saved to `line-session-full.json` for debugging.

**For CI:** Paste the content of `line-session.json` into GitHub Secret `LINE_SESSION_STATE`.

**For local testing:** Add to `e2e/.env`:
```
LINE_SESSION_STATE=$(cat e2e/line-session.json)
```

> **Note:** LINE session cookies expire periodically. Re-run `save:line-session` if tests start failing with the email/password form instead of the "Continue as" SSO screen.

### Google Session State (`GOOGLE_SESSION_STATE`) — Local Only

**For local testing only. CI uses LINE (`OAUTH_MODE=line`) by default.**

Google blocks automated sign-ins from unknown IPs by showing a "Verify it's you" challenge (SMS/phone verification instead of TOTP). Since GitHub Actions runners use different IPs on every run, Google tests are unreliable on CI. Use LINE for CI instead.

**How it works:**
- When set: Google auto-authenticates via cookies → login form is skipped entirely
- When not set: Full login flow runs (email → password → TOTP) — may fail due to bot detection or IP-based challenges

**Generating the session:**

```bash
# 1. Start the testapp
cd examples/testapp && pnpm dev

# 2. Run the session save script (opens a browser for manual login)
cd e2e && pnpm save:google-session

# 3. Copy the filtered output to clipboard
cat google-session.json | pbcopy
```

**For local testing:** Run with `OAUTH_MODE=google`:
```bash
OAUTH_MODE=google GOOGLE_SESSION_STATE=$(cat e2e/google-session.json) pnpm test:google
```

## Test Inventory

<!-- IMPORTANT: Keep this table in sync when adding, removing, or renaming E2E tests. -->

**Auth column legend:**
- `LINE` — requires LINE OAuth login (serial, shared context) — CI default
- `Google` — requires Google OAuth login (serial, shared context, local only)
- `EOA` — requires MetaMask via dappwright
- `EOA Required` — requires LINE OAuth + MetaMask (EOA wallet linking)
- `No` — no authentication required

### Smoke Tests (`tests/smoke/dashboard-loads.spec.ts`)

| # | Test | Auth |
|--:|------|:----:|
| 1 | dashboard loads with expected sections | No |
| 2 | eth_requestAccounts card is visible | No |
| 3 | wallet_connect card is visible | No |

### EOA RPC Methods (`tests/eoa/rpc-methods.spec.ts`)

MetaMask login is performed in the first test, then personal_sign verifies basic signing works. Full RPC coverage is handled by the LINE/Google OAuth suite.

| # | Test | Auth |
|--:|------|:----:|
| 4 | personal_sign — sign a message via shortcut | EOA |

### LINE OAuth RPC Methods (`tests/line/rpc-methods.spec.ts`) — CI Default

All tests run in serial mode within a single browser context. LINE login is performed once in `beforeAll`, then each test reuses the same authenticated page. Skipped when `OAUTH_MODE=google`.

| # | Test | Auth |
|--:|------|:----:|
| 5 | personal_sign — sign a message via shortcut | LINE |
| 6 | eth_signTypedData_v4 — sign typed data via shortcut | LINE |
| 7 | eth_sendTransaction — send example transaction | LINE |
| 8 | wallet_sendCalls — send calls via shortcut | LINE |
| 9 | wallet_switchEthereumChain — switch chain via shortcut | LINE |
| 10 | eth_getBalance — get balance via shortcut | LINE |
| 11 | eth_getBalance — error on invalid address | LINE |
| 12 | eth_getTransactionCount — error on invalid address | LINE |

### Google OAuth RPC Methods (`tests/google/rpc-methods.spec.ts`) — Local Only

All tests run in serial mode within a single browser context. Google login is performed once in `beforeAll`. Skipped unless `OAUTH_MODE=google`.

| # | Test | Auth |
|--:|------|:----:|
| 13 | personal_sign — sign a message via shortcut | Google |
| 14 | eth_signTypedData_v4 — sign typed data via shortcut | Google |
| 15 | eth_sendTransaction — send example transaction | Google |
| 16 | wallet_sendCalls — send calls via shortcut | Google |
| 17 | wallet_switchEthereumChain — switch chain via shortcut | Google |
| 18 | eth_getBalance — get balance via shortcut | Google |
| 19 | eth_getBalance — error on invalid address | Google |
| 20 | eth_getTransactionCount — error on invalid address | Google |

### EOA Required Onboarding (`tests/eoa-required/eoa-required-onboarding.spec.ts`)

Tests the full EOA Required lifecycle: LINE OAuth login, MetaMask wallet linking via Dynamic Auth, address verification, and wallet disconnect. Uses a dedicated `EOA_LINKED_WALLET_SEED` (separate from `WALLET_SEED`).

| # | Test | Auth |
|--:|------|:----:|
| 21 | should complete EOA required onboarding with LINE + MetaMask | EOA Required |
| 22 | should return EOA wallet address from eth_requestAccounts | EOA Required |
| 23 | should show linked EOA wallet on Super App wallets page | EOA Required |
| 24 | should disconnect EOA wallet from Super App | EOA Required |

**Total: 5 spec files, 24 tests** (8 LINE + 8 Google, only one OAuth suite active per `OAUTH_MODE`)

## Directory Structure

```
e2e/
├── tests/
│   ├── line/
│   │   └── rpc-methods.spec.ts            # LINE OAuth + all RPC method tests (CI default)
│   ├── google/
│   │   └── rpc-methods.spec.ts            # Google OAuth + all RPC method tests (local only)
│   ├── eoa/
│   │   └── rpc-methods.spec.ts            # MetaMask EOA connect + personal_sign
│   ├── eoa-required/
│   │   └── eoa-required-onboarding.spec.ts # EOA Required onboarding lifecycle
│   └── smoke/
│       └── dashboard-loads.spec.ts        # Dashboard loads without auth
├── page-objects/
│   ├── dashboardPage.ts                   # Dashboard section selectors (data-testid)
│   └── rpcMethodCard.ts                   # RPC method card selectors & actions
├── fixtures/
│   └── wallet.fixture.ts                  # dappwright MetaMask fixture (worker-scoped, parameterized)
├── scripts/
│   ├── save-line-session.ts               # Save LINE session cookies for CI
│   └── save-google-session.ts             # Save Google session cookies for local testing
├── lib/
│   ├── constants.ts                       # Routes, timeouts, chain config
│   ├── helpers.ts                         # Popup handling, SDK approval helpers
│   └── auth/
│       ├── line-oauth.ts                  # LINE OAuth + SSO automation
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

Therefore, all authenticated tests (LINE, Google, and EOA) run in **serial mode** sharing a single browser context, with login performed once at the start.

### SDK Popup Approval

The SDK popup shows different action buttons depending on the operation:

| Screen | Button | Operations |
|--------|--------|-----------|
| `/connect-wallet` | Approve | `eth_requestAccounts` |
| `/message-sign` | Sign | `personal_sign`, `eth_signTypedData_*` |
| `/transaction` | Send | `eth_sendTransaction` |
| `/transaction` | Confirm | `wallet_sendCalls` |

The `approveSDKPopup` helper handles all variants with `Promise.race` to also handle cases where the popup auto-closes (e.g., signer not deployed errors).

### LINE vs Google for CI

Google OAuth is unreliable on CI because Google detects new IP addresses and triggers "Verify it's you" challenges requiring SMS/phone verification. LINE does not have this IP-based detection — session cookies work consistently across different environments. LINE is therefore used as the default CI auth provider (`OAUTH_MODE=line`).

## Conventions

- Use `data-testid` attributes for element selection (see `e2e` rules in `.claude/rules/`)
- Follow Page Object Model pattern
- Config-level timeouts: `expect: 60s`, `actionTimeout: 60s`, `navigationTimeout: 90s`
- Never use `waitForTimeout` — use Playwright assertions with auto-retry
- Workers: 1 (SDK popup requires sequential execution)
