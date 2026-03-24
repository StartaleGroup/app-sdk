import type { Page } from '@playwright/test'

import { expect } from '@playwright/test'
import { createWalletFixture } from '../../fixtures/wallet.fixture.js'

const test = createWalletFixture('EOA_LINKED_WALLET_SEED')
import { linkEOAWallet } from '../../lib/auth/eoa-required-onboarding.js'
import { loginWithGoogle } from '../../lib/auth/google-oauth.js'
import { ROUTES, SCW_URL } from '../../lib/constants.js'
import { waitForPopup } from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'

/**
 * Expected EOA wallet address derived from EOA_LINKED_WALLET_SEED.
 * Used to verify that eth_requestAccounts returns the correct address
 * after the MetaMask wallet linking flow completes.
 */
const EXPECTED_EOA_ADDRESS = '0x10D37b2c87029b3650D798fCD6f756AbA04f4133'

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
 * Disconnect any previously linked EOA wallet from Super App.
 * Assumes the page is already on the /wallets page.
 * Returns true if a wallet was disconnected, false if none found.
 */
const disconnectEOAWalletIfLinked = async (page: Page): Promise<boolean> => {
	// Wait for wallet list to fully render (Smart Wallet is always present)
	await expect(page.getByText('Smart Wallet')).toBeVisible({ timeout: 5_000 })

	const eoaWallet = page.getByText('EOA wallet', { exact: true })
	const isVisible = await eoaWallet.isVisible().catch(() => false)
	if (!isVisible) return false

	// Click EOA wallet row → edit page
	await eoaWallet.click()

	// Click "Disconnect wallet" on edit page to open confirmation dialog
	await page.getByText('Disconnect wallet').first().click()

	// Wait for dialog to render, then click the red confirm button
	const confirmButton = page.getByRole('button', { name: 'Disconnect wallet' })
	await confirmButton.waitFor({ state: 'visible' })
	await confirmButton.click()

	// Wait for dialog to close (SPA navigation back to wallet list)
	await expect(confirmButton).not.toBeVisible()

	// Verify EOA wallet was removed from the list
	await expect(page.getByText('EOA wallet', { exact: true })).not.toBeVisible()
	return true
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

	// Session exists — check for stale EOA wallet and disconnect if found
	await disconnectEOAWalletIfLinked(page)
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

	test.beforeAll(async ({ page: fixturedPage }) => {
		page = fixturedPage

		// Clean up any stale linked wallet from a previous failed run
		await cleanupStaleEOAWallet(page)

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
		const reachedLinkEOA = await sdkPopup
			.waitForURL((url) => url.pathname.includes('/link-eoa'), {
				timeout: 5_000,
			})
			.then(() => true)
			.catch(() => false)

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
		expect(response).toContain(EXPECTED_EOA_ADDRESS)
	})

	test('should show linked EOA wallet on Super App wallets page', async () => {
		await page.goto(`${SCW_URL}wallets`)

		await expect(page.getByText('Linked wallets')).toBeVisible()
		await expect(page.getByText('EOA wallet')).toBeVisible()
	})

	test('should disconnect EOA wallet from Super App', async () => {
		await page.goto(`${SCW_URL}wallets`)
		await expect(page.getByText('Linked wallets')).toBeVisible()

		const disconnected = await disconnectEOAWalletIfLinked(page)
		expect(disconnected).toBe(true)
	})
})
