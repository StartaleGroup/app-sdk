import type { BrowserContext, Locator, Page } from '@playwright/test'

import { expect } from '@playwright/test'
import { mnemonicToAccount } from 'viem/accounts'

import { createWalletFixture } from '../../fixtures/wallet.fixture.js'
import { linkEOAWallet } from '../../lib/auth/eoa-required-onboarding.js'
import { loginWithGoogle } from '../../lib/auth/google-oauth.js'
import { ROUTES, SCW_URL } from '../../lib/constants.js'
import {
	type SessionCookie,
	isGoogleDomain,
	parseAllSessionCookies,
	waitForPopup,
} from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'

const test = createWalletFixture('EOA_LINKED_WALLET_SEED')

/**
 * Derive the expected EOA wallet address from EOA_LINKED_WALLET_SEED.
 * Explicitly uses MetaMask's default HD path (m/44'/60'/0'/0/0).
 * Lazily evaluated on first access to avoid crashing other test suites
 * when EOA_LINKED_WALLET_SEED is not set.
 */
const getExpectedEOAAddress = (): string => {
	const seed = process.env.EOA_LINKED_WALLET_SEED
	if (!seed) throw new Error('EOA_LINKED_WALLET_SEED env var is required')
	return mnemonicToAccount(seed).address
}

let _expectedEOAAddress: string | undefined
const EXPECTED_EOA_ADDRESS = (): string => {
	if (!_expectedEOAAddress) _expectedEOAAddress = getExpectedEOAAddress()
	return _expectedEOAAddress
}

const TESTAPP_PRESERVED_LOCAL_STORAGE_KEYS = [
	'scw_url',
	'selected_sdk_version',
] as const

/**
 * Wait for SDK popup to reach /connect-wallet and click Approve.
 */
const approveConnection = async (sdkPopup: Page): Promise<void> => {
	await sdkPopup.waitForURL((url) => url.pathname.includes('/connect-wallet'))
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}

const hasExpectedEOAAddress = (accounts: string[]): boolean =>
	accounts.some(
		(account) => account.toLowerCase() === EXPECTED_EOA_ADDRESS().toLowerCase(),
	)

const formatAccounts = (accounts: string[]): string =>
	JSON.stringify(accounts, null, 2)

const expectConnectedToast = async (page: Page): Promise<void> => {
	await expect(page.locator('#toast-connected').first()).toBeVisible()
}

const waitForPopupIfOpened = async (
	page: Page,
	trigger: () => Promise<void>,
): Promise<Page | null> => {
	const popupPromise = page
		.waitForEvent('popup', { timeout: 10_000 })
		.then(async (popup) => {
			await popup.waitForLoadState('domcontentloaded')
			return popup
		})
		.catch(() => null)

	await trigger()
	return popupPromise
}

const getLinkedWalletLocator = (page: Page): Locator =>
	page
		.getByText('EOA wallet', { exact: true })
		.or(page.getByText('MetaMask', { exact: true }))

const waitForLinkedWalletDetails = async (page: Page): Promise<boolean> =>
	page
		.getByRole('button', { name: 'Disconnect wallet' })
		.first()
		.waitFor({ state: 'visible', timeout: 20_000 })
		.then(() => true)
		.catch(() => false)

const openLinkedWalletDetails = async (page: Page): Promise<void> => {
	for (let attempt = 0; attempt < 3; attempt++) {
		const linkedWallet = getLinkedWalletLocator(page).first()
		await linkedWallet.waitFor({ state: 'visible' })
		await linkedWallet.click()

		if (await waitForLinkedWalletDetails(page)) return

		await page.goto(`${SCW_URL}wallets`)
		await expect(page.getByText('Linked wallets')).toBeVisible()
	}

	throw new Error(
		'Linked wallet details page did not load the Disconnect wallet action after 3 attempts',
	)
}

/**
 * Disconnect a single linked wallet from Super App.
 * Assumes the page is on /wallets and the wallet row is visible.
 * Clicks the wallet row → "Disconnect wallet" → confirm dialog.
 */
const disconnectOneLinkedWallet = async (page: Page): Promise<void> => {
	await openLinkedWalletDetails(page)

	// Click "Disconnect wallet" on edit page to open confirmation dialog
	await page.getByRole('button', { name: 'Disconnect wallet' }).first().click()

	// Wait for dialog to render, then click the red confirm button
	const confirmButton = page
		.getByRole('button', { name: 'Disconnect wallet' })
		.last()
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
const MAX_LINKED_WALLETS = 10

const disconnectAllLinkedWallets = async (page: Page): Promise<number> => {
	const linkedWallet = getLinkedWalletLocator(page)

	await linkedWallet
		.first()
		.waitFor({ state: 'visible', timeout: 5_000 })
		.catch(() => {})

	let disconnected = 0

	while (await linkedWallet.first().isVisible().catch(() => false)) {
		if (disconnected >= MAX_LINKED_WALLETS) {
			throw new Error(
				`Exceeded ${MAX_LINKED_WALLETS} wallet disconnections — possible infinite loop`,
			)
		}
		await disconnectOneLinkedWallet(page)
		disconnected++
	}

	return disconnected
}

/**
 * Delete all non-Google cookies from the current browser context.
 * Keeps Google cookies from GOOGLE_SESSION_STATE so runtime login
 * can still bypass "Verify it's you" challenges.
 */
const deleteCookies = async (
	context: BrowserContext,
	page: Page,
	cookies: {
		name: string
		domain: string
		path?: string
	}[],
): Promise<void> => {
	const cdp = await context.newCDPSession(page)
	try {
		for (const cookie of cookies) {
			await cdp.send('Network.deleteCookies', {
				name: cookie.name,
				domain: cookie.domain,
				path: cookie.path,
			})
		}
	} finally {
		await cdp.detach()
	}
}

const deleteInjectedNonGoogleCookies = async (
	context: BrowserContext,
	page: Page,
	cookies: SessionCookie[] | undefined,
): Promise<void> => {
	const nonGoogleCookies =
		cookies?.filter((cookie) => !isGoogleDomain(cookie.domain)) ?? []
	if (nonGoogleCookies.length === 0) return

	await deleteCookies(context, page, nonGoogleCookies)
}

const deleteRuntimeNonGoogleCookies = async (
	context: BrowserContext,
	page: Page,
): Promise<void> => {
	const cdp = await context.newCDPSession(page)
	try {
		const result = await cdp.send('Network.getAllCookies')
		const nonGoogleCookies = result.cookies.filter(
			(cookie) => !isGoogleDomain(cookie.domain),
		)

		for (const cookie of nonGoogleCookies) {
			await cdp.send('Network.deleteCookies', {
				name: cookie.name,
				domain: cookie.domain,
				path: cookie.path,
			})
		}
	} finally {
		await cdp.detach()
	}
}

/**
 * Clear only testapp-side SDK state while preserving dashboard config
 * needed for E2E runs (SDK version + scw_url).
 *
 * Calls provider.disconnect() first so the SDK clears its persisted
 * account state and IndexedDB-backed keys before we drop localStorage.
 */
const clearTestappSDKLocalState = async (page: Page): Promise<void> => {
	await page.evaluate(async (preservedKeys) => {
		const keepKeys = new Set<string>(preservedKeys as string[])
		const ethereum = (
			window as typeof window & {
				ethereum?: {
					disconnect?: () => Promise<void>
				}
			}
		).ethereum

		if (ethereum?.disconnect) {
			try {
				await ethereum.disconnect()
			} catch {
				// Ignore disconnect failures and continue clearing local state.
			}
		}

		for (const key of Object.keys(localStorage)) {
			if (keepKeys.has(key)) continue

			if (
				key === 'startale-app-sdk.store' ||
				key.startsWith('cbwsdk.') ||
				key.startsWith('-CBWSDK:') ||
				key.startsWith('base-acc-sdk')
			) {
				localStorage.removeItem(key)
			}
		}
	}, [...TESTAPP_PRESERVED_LOCAL_STORAGE_KEYS])
}

const ensureEOARequiredEnabled = async (page: Page): Promise<void> => {
	const toggle = page.getByTestId('switch-eoa-required')
	await toggle.waitFor({ state: 'visible' })

	if (!(await toggle.isChecked())) {
		await toggle.click()
		await expect(toggle).toBeChecked()
	}
}

const openDashboardWithEOARequiredEnabled = async (page: Page): Promise<void> => {
	await page.goto(ROUTES.dashboard)
	const dashboard = dashboardPage(page)
	await dashboard.verifyLoaded()
	await ensureEOARequiredEnabled(page)
}

const resetEOARequiredBrowserState = async (
	page: Page,
	context: BrowserContext,
): Promise<void> => {
	// First load: needed so page.evaluate() can access localStorage/SDK state
	await openDashboardWithEOARequiredEnabled(page)
	await clearTestappSDKLocalState(page)
	await deleteRuntimeNonGoogleCookies(context, page)
	// Second load: picks up the freshly cleared state
	await openDashboardWithEOARequiredEnabled(page)
}

const runEOARequiredOnboarding = async (
	page: Page,
	context: BrowserContext,
): Promise<void> => {
	await openDashboardWithEOARequiredEnabled(page)

	const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')

	// Open SDK popup. If no popup appears quickly, treat it as an
	// already-connected state and let ensureExpectedEOAConnected()
	// validate whether the connected account is the expected EOA.
	let sdkPopup = await waitForPopupIfOpened(page, () =>
		ethRequestAccounts.submit(),
	)
	if (!sdkPopup) {
		const connectedAccounts = await requestConnectedAccounts(page).catch(
			() => [],
		)
		if (hasExpectedEOAAddress(connectedAccounts)) return

		await resetEOARequiredBrowserState(page, context)
		sdkPopup = await waitForPopup(page, () =>
			ethRequestAccounts.submit(),
		)
	}

	if (!sdkPopup) {
		throw new Error(
			'eth_requestAccounts did not open the SDK popup after resetting local SDK state',
		)
	}

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

	await expectConnectedToast(page)
}

type WindowWithEthereum = typeof window & {
	ethereum?: {
		request?: (args: { method: string }) => Promise<unknown>
	}
}

const requestConnectedAccounts = async (page: Page): Promise<string[]> => {
	await expect
		.poll(
			() =>
				page.evaluate(() =>
					Boolean((window as WindowWithEthereum).ethereum?.request),
				),
			{ message: 'window.ethereum.request should be available' },
		)
		.toBe(true)

	return page.evaluate(async () => {
		const ethereum = (window as WindowWithEthereum).ethereum

		if (!ethereum?.request) {
			throw new Error('window.ethereum.request is unavailable')
		}

		const response = await ethereum.request({ method: 'eth_requestAccounts' })
		if (!Array.isArray(response)) {
			throw new Error(
				`Expected eth_requestAccounts to return an array, received: ${JSON.stringify(response)}`,
			)
		}

		return response.map((account) => String(account))
	})
}

const disconnectStaleLinkedWalletAndReset = async (
	page: Page,
	context: BrowserContext,
	actualAccounts: string[],
): Promise<void> => {
	await page.goto(`${SCW_URL}wallets`)
	const hasLinkedWalletsPage = await page
		.getByText('Linked wallets')
		.waitFor({ state: 'visible', timeout: 5_000 })
		.then(() => true)
		.catch(() => false)

	const disconnected = hasLinkedWalletsPage
		? await disconnectAllLinkedWallets(page)
		: 0

	await resetEOARequiredBrowserState(page, context)

	if (disconnected === 0 && hasLinkedWalletsPage) {
		throw new Error(
			`eth_requestAccounts returned an unexpected wallet (${formatAccounts(actualAccounts)}), but no linked wallets were available to disconnect`,
		)
	}
}

const ensureExpectedEOAConnected = async (
	page: Page,
	context: BrowserContext,
): Promise<void> => {
	await runEOARequiredOnboarding(page, context)

	let connectedAccounts = await requestConnectedAccounts(page)
	if (hasExpectedEOAAddress(connectedAccounts)) return

	await disconnectStaleLinkedWalletAndReset(page, context, connectedAccounts)
	await runEOARequiredOnboarding(page, context)

	connectedAccounts = await requestConnectedAccounts(page)
	if (hasExpectedEOAAddress(connectedAccounts)) return

	throw new Error(
		`EOA Required onboarding connected an unexpected wallet. Expected ${EXPECTED_EOA_ADDRESS().toLowerCase()}, received ${formatAccounts(connectedAccounts).toLowerCase()}`,
	)
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
		// EOA_LINKED_WALLET_SEED is validated by the fixture (wallet.fixture.ts)
		if (!process.env.GOOGLE_TEST_EMAIL) {
			throw new Error(
				'GOOGLE_TEST_EMAIL env var is required for EOA Required tests',
			)
		}
	})

	let page: Page
	let context: BrowserContext

	test.beforeAll(async ({ page: fixturedPage, context: walletContext }) => {
		page = fixturedPage
		context = walletContext

		// Inject session cookies via CDP. context.addCookies() does not work
		// reliably with dappwright's persistent browser context.
		const allCookies = parseAllSessionCookies()
		const cookiePayload = allCookies?.map((c) => ({
			name: c.name,
			value: c.value,
			domain: c.domain,
			path: c.path ?? '/',
			secure: c.secure ?? true,
			httpOnly: c.httpOnly ?? false,
			sameSite: c.sameSite ?? 'None',
			expires: c.expires ?? -1,
		}))

		if (cookiePayload && cookiePayload.length > 0) {
			const cdp = await walletContext.newCDPSession(page)
			try {
				await cdp.send('Network.setCookies', { cookies: cookiePayload })
			} finally {
				await cdp.detach()
			}
		}

		// Start clean for SCW/Dynamic Auth even if GOOGLE_SESSION_STATE
		// accidentally includes non-Google cookies.
		await deleteInjectedNonGoogleCookies(walletContext, page, allCookies)

		// Dappwright uses a persistent browser context, so proactively clear
		// any leftover SDK state before the first onboarding attempt.
		await page.goto(ROUTES.dashboard)
		const dashboard = dashboardPage(page)
		await dashboard.verifyLoaded()
		await clearTestappSDKLocalState(page)
	})

	test('should complete EOA required onboarding with Google + MetaMask', async () => {
		await ensureExpectedEOAConnected(page, context)
	})

	test('should return EOA wallet address from eth_requestAccounts', async () => {
		const accounts = await requestConnectedAccounts(page)
		expect(accounts.map((account) => account.toLowerCase())).toContain(
			EXPECTED_EOA_ADDRESS().toLowerCase(),
		)
	})

	test('should show linked EOA wallet on Super App wallets page', async () => {
		await page.goto(`${SCW_URL}wallets`)

		await expect(page.getByText('Linked wallets')).toBeVisible()
		await expect(getLinkedWalletLocator(page).first()).toBeVisible()
	})

	test('should disconnect EOA wallet from Super App', async () => {
		await page.goto(`${SCW_URL}wallets`)
		await expect(page.getByText('Linked wallets')).toBeVisible()

		const disconnected = await disconnectAllLinkedWallets(page)
		expect(disconnected).toBeGreaterThan(0)
	})
})
