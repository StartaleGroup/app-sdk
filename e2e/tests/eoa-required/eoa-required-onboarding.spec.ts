import type { Page } from '@playwright/test'

import { expect } from '@playwright/test'
import { mnemonicToAccount } from 'viem/accounts'

import { createWalletFixture } from '../../fixtures/wallet.fixture.js'
import { linkEOAWallet } from '../../lib/auth/eoa-required-onboarding.js'
import { loginWithGoogle } from '../../lib/auth/google-oauth.js'
import { ROUTES, SCW_URL } from '../../lib/constants.js'
import {
	isGoogleDomain,
	parseAllSessionCookies,
	waitForPopup,
} from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'

const test = createWalletFixture('EOA_LINKED_WALLET_SEED')

/**
 * Derive the expected EOA wallet address from EOA_LINKED_WALLET_SEED.
 * Uses the same HD path as MetaMask (m/44'/60'/0'/0/0).
 * Guarded: the fixture validates the env var before tests run,
 * but we add a fallback to surface a clear error at module load.
 */
const EXPECTED_EOA_ADDRESS = mnemonicToAccount(
	process.env.EOA_LINKED_WALLET_SEED ?? '',
).address

/**
 * Wait for SDK popup to reach /connect-wallet and click Approve.
 */
const approveConnection = async (sdkPopup: Page): Promise<void> => {
	await sdkPopup.waitForURL((url) => url.pathname.includes('/connect-wallet'))
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}

/**
 * Disconnect a single linked wallet from Super App.
 * Assumes the page is on /wallets and the wallet row is visible.
 * Clicks the wallet row → "Disconnect wallet" → confirm dialog.
 */
const disconnectOneLinkedWallet = async (
	page: Page,
	walletLocator: ReturnType<Page['locator']>,
): Promise<void> => {
	await walletLocator.click()

	// Click "Disconnect wallet" on edit page to open confirmation dialog
	await page.getByText('Disconnect wallet').first().click()

	// Wait for dialog to render, then click the red confirm button
	const confirmButton = page.getByRole('button', { name: 'Disconnect wallet' })
	await confirmButton.waitFor({ state: 'visible' })
	await confirmButton.click()

	// Wait for dialog to close (SPA navigation back to wallet list)
	await expect(confirmButton).not.toBeVisible()
}

/**
 * Disconnect all linked wallets from Super App.
 * Assumes the page is already on the /wallets page.
 * Handles both "EOA wallet" and "MetaMask" labels, and loops
 * until all linked wallets are removed.
 * Returns the number of wallets disconnected.
 */
const disconnectAllLinkedWallets = async (page: Page): Promise<number> => {
	// Wait for wallet list to fully render (Smart Wallet is always present)
	await expect(page.getByText('Smart Wallet')).toBeVisible({ timeout: 5_000 })

	// Match linked wallets by either name
	const linkedWallet = page
		.getByText('EOA wallet', { exact: true })
		.or(page.getByText('MetaMask', { exact: true }))

	let disconnected = 0

	while (await linkedWallet.first().isVisible().catch(() => false)) {
		await disconnectOneLinkedWallet(page, linkedWallet.first())
		disconnected++
	}

	return disconnected
}

/**
 * Clean up stale state from a previous failed test run.
 *
 * Navigates directly to Super App /wallets to check for a leftover
 * EOA wallet. If the session from a previous run is still active,
 * the wallet list renders and we can disconnect any stale EOA wallet.
 * If no session exists (fresh browser), "Smart Wallet" won't appear
 * and cleanup is skipped — there's nothing to clean up.
 *
 * Does NOT use loginWithGoogle to avoid caching the Google OAuth
 * session, which would cause the actual test's loginWithGoogle to
 * skip the Google login form and timeout.
 */
const cleanupStaleEOAWallet = async (page: Page): Promise<void> => {
	// Navigate directly to Super App /wallets
	await page.goto(`${SCW_URL}wallets`)

	// Check if we have an active session (Smart Wallet appears when logged in)
	const hasSession = await page
		.getByText('Smart Wallet')
		.isVisible({ timeout: 5_000 })
		.catch(() => false)

	if (!hasSession) return

	// Session exists — disconnect any stale linked wallets from previous runs
	await disconnectAllLinkedWallets(page)
}

/**
 * EOA Required onboarding lifecycle test.
 *
 * Verifies: Google OAuth → MetaMask wallet link → address check → disconnect.
 * Uses dedicated EOA_LINKED_WALLET_SEED (separate from WALLET_SEED).
 *
 * Super App pages (SCW_URL) use full URLs because the fixture's patched
 * goto() resolves relative URLs against BASE_URL (testapp), not Super App.
 */
test.describe('EOA Required — Onboarding', () => {
	test.describe.configure({ mode: 'serial' })

	test.beforeAll(() => {
		// EOA_LINKED_WALLET_SEED is validated by the fixture (eoa-required.fixture.ts)
		if (!process.env.GOOGLE_TEST_EMAIL) {
			throw new Error(
				'GOOGLE_TEST_EMAIL env var is required for EOA Required tests',
			)
		}
	})

	let page: Page

	test.beforeAll(async ({ page: fixturedPage, context }) => {
		page = fixturedPage

		// Inject session cookies via CDP. context.addCookies() does not work
		// reliably with dappwright's persistent browser context.
		//
		// Phase 1: Inject ALL cookies (including Super App) so cleanup can
		// detect and remove stale linked wallets from previous test runs.
		// Without Super App cookies, the /wallets page shows no session
		// and cleanup is silently skipped.
		const allCookies = parseAllSessionCookies()
		const cookiePayload = allCookies?.map((c) => ({
			name: c.name,
			value: c.value,
			domain: c.domain,
			path: c.path || '/',
			secure: c.secure ?? true,
			httpOnly: c.httpOnly ?? false,
			sameSite: c.sameSite || 'None',
			expires: c.expires ?? -1,
		}))

		if (cookiePayload && cookiePayload.length > 0) {
			const cdp = await context.newCDPSession(page)
			await cdp.send('Network.setCookies', { cookies: cookiePayload })
			await cdp.detach()
		}

		// Clean up any stale linked wallet from a previous failed run
		await cleanupStaleEOAWallet(page)

		// Phase 2: Remove Super App cookies so the SDK popup shows the
		// login page (not a cached session). Keep only Google cookies
		// for auto-authentication bypass.
		if (allCookies && allCookies.length > 0) {
			const cdp = await context.newCDPSession(page)
			const nonGoogleCookies = allCookies.filter(
				(c) => !isGoogleDomain(c.domain),
			)
			for (const c of nonGoogleCookies) {
				await cdp.send('Network.deleteCookies', {
					name: c.name,
					domain: c.domain,
				})
			}
			await cdp.detach()
		}

		await page.goto(ROUTES.dashboard)
		const dashboard = dashboardPage(page)
		await dashboard.verifyLoaded()

		// Enable eoaRequired toggle
		await page.getByTestId('switch-eoa-required').click()
	})

	test('should complete EOA required onboarding with Google + MetaMask', async () => {
		const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')

		// Open SDK popup
		let sdkPopup = await waitForPopup(page, () =>
			ethRequestAccounts.submit(),
		)

		// Google OAuth (stops after redirect — no Approve click)
		await loginWithGoogle(sdkPopup, { skipApprove: true })

		// After Google OAuth: either /link-eoa (fresh) or /connect-wallet (dirty state).
		// Dirty state occurs when a previous attempt already linked the wallet
		// on the backend but the test failed before completing.
		// Wait for the SPA to settle on a final page — the popup lands on "/"
		// first, then client-side routing redirects to the actual destination.
		const reachedLinkEOA = await Promise.race([
			sdkPopup
				.waitForURL((url) => url.pathname.includes('/link-eoa'))
				.then(() => true),
			sdkPopup
				.waitForURL((url) => url.pathname.includes('/connect-wallet'))
				.then(() => false),
		])

		if (reachedLinkEOA) {
			await linkEOAWallet(sdkPopup)

			// linkEOAWallet closes the popup when /link-eoa doesn't navigate
			// after MetaMask approval (wallet is linked on backend but the page
			// didn't update). Re-open SDK popup — the cached Google session +
			// linked wallet will skip straight to /connect-wallet.
			if (sdkPopup.isClosed()) {
				sdkPopup = await waitForPopup(page, () =>
					ethRequestAccounts.submit(),
				)
				await approveConnection(sdkPopup)
			}
		} else {
			await approveConnection(sdkPopup)
		}

		await expect(page.locator('#toast-connected')).toBeVisible()
	})

	test('should return EOA wallet address from eth_requestAccounts', async () => {
		const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')
		const response = await ethRequestAccounts.getResponse()
		expect(response?.toLowerCase()).toContain(
			EXPECTED_EOA_ADDRESS.toLowerCase(),
		)
	})

	test('should show linked EOA wallet on Super App wallets page', async () => {
		await page.goto(`${SCW_URL}wallets`)

		await expect(page.getByText('Linked wallets')).toBeVisible()
		// Super App may label the wallet as "EOA wallet" or "MetaMask"
		const linkedWallet = page
			.getByText('EOA wallet', { exact: true })
			.or(page.getByText('MetaMask', { exact: true }))
		await expect(linkedWallet.first()).toBeVisible()
	})

	test('should disconnect EOA wallet from Super App', async () => {
		await page.goto(`${SCW_URL}wallets`)
		await expect(page.getByText('Linked wallets')).toBeVisible()

		const disconnected = await disconnectAllLinkedWallets(page)
		expect(disconnected).toBeGreaterThan(0)
	})
})
