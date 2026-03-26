import {
	expect,
	test,
	type BrowserContext,
	type Page,
} from '@playwright/test'
import { loginWithGoogle } from '../../lib/auth/google-oauth.js'
import { CHAIN_IDS, ROUTES } from '../../lib/constants.js'
import {
	injectSCWUrl,
	triggerAndApproveSDKPopup,
	waitForPopup,
	waitForPopupClose,
} from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'

/**
 * All RPC method tests that require Google OAuth authentication.
 *
 * These tests run in serial mode sharing the same browser context
 * so that the SDK popup session (SCW_URL) is preserved
 * across tests. storageState alone cannot restore the popup session.
 */
test.describe('Google OAuth — RPC Methods', () => {
	test.describe.configure({ mode: 'serial' })

	test.skip(
		process.env.SKIP_GOOGLE_OAUTH === 'true',
		'Google OAuth skipped via SKIP_GOOGLE_OAUTH env',
	)

	let context: BrowserContext
	let page: Page

	test.beforeAll(async ({ browser, baseURL }) => {
		const googleSession = process.env.GOOGLE_SESSION_STATE
			? JSON.parse(process.env.GOOGLE_SESSION_STATE)
			: undefined

		// Keep only Google cookies to bypass "Verify it's you" challenge.
		// Exclude all other cookies (SCW, Dynamic Auth, privy) so the
		// normal login flow runs from a clean state.
		const isGoogleDomain = (domain: string) =>
			domain === 'google.com' ||
			domain.endsWith('.google.com') ||
			domain === 'accounts.google.com' ||
			domain.endsWith('.google.com.sg')

		const storageState = googleSession
			? {
					cookies: googleSession.cookies.filter(
						(c: { domain: string }) => isGoogleDomain(c.domain),
					),
					origins: [],
				}
			: undefined
		context = await browser.newContext({ baseURL, storageState })
		page = await context.newPage()

		await injectSCWUrl(page)

		await page.goto(ROUTES.dashboard)
		const dashboard = dashboardPage(page)
		await dashboard.verifyLoaded()

		const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')
		const sdkPopup = await waitForPopup(page, () =>
			ethRequestAccounts.submit(),
		)

		await loginWithGoogle(sdkPopup)
		await waitForPopupClose(sdkPopup)

		await expect(page.locator('#toast-connected')).toBeVisible()

		await dashboard.verifyConnectedSections()
	})

	test.afterAll(async () => {
		await context?.close()
	})

	// --- Signing ---

	test('personal_sign — sign a message via shortcut', async () => {
		const personalSign = rpcMethodCard(page, 'personal_sign')
		await triggerAndApproveSDKPopup(page, () =>
			personalSign.clickShortcut('Example Message'),
		)
		await personalSign.waitForResponse()
		const response = await personalSign.getResponse()
		expect(response).toContain('0x')
	})

	test('eth_signTypedData_v4 — sign typed data via shortcut', async () => {
		const signTypedData = rpcMethodCard(page, 'eth_signTypedData_v4')
		await triggerAndApproveSDKPopup(page, () =>
			signTypedData.clickShortcut('Example Message'),
		)
		await signTypedData.waitForResponse()
		const response = await signTypedData.getResponse()
		expect(response).toContain('0x')
	})

	// --- Transactions ---

	test('eth_sendTransaction — send example transaction', async () => {
		const sendTx = rpcMethodCard(page, 'eth_sendTransaction')
		await triggerAndApproveSDKPopup(page, () =>
			sendTx.clickShortcut('Example Tx'),
		)
		await sendTx.waitForResponse()
		const response = await sendTx.getResponse()
		expect(response).toContain('0x')
	})

	test('wallet_sendCalls — send calls via shortcut', async () => {
		const walletSendCalls = rpcMethodCard(
			page,
			'wallet_sendCalls',
			'section-wallet-tx',
		)
		await triggerAndApproveSDKPopup(page, () =>
			walletSendCalls.clickShortcut('wallet_sendCalls'),
		)
		await walletSendCalls.waitForResponse()
		const response = await walletSendCalls.getResponse()
		expect(response).toBeTruthy()
	})

	// --- Chain ---

	// Switches to Minato and does NOT revert — subsequent tests are chain-agnostic
	// (read-only RPC calls and error cases work on any chain).
	test('wallet_switchEthereumChain — switch chain via shortcut', async () => {
		const switchChain = rpcMethodCard(page, 'wallet_switchEthereumChain')
		await switchChain.clickShortcut('Minato')
		const eventSection = page.getByTestId('section-event-listeners')
		await expect(eventSection.getByText(CHAIN_IDS.MINATO)).toBeVisible()
		// Chakra UI toasts use HTML id (from toast({ id })) — not data-testid
		await expect(page.locator('#toast-chain-changed')).toBeVisible()
	})

	// --- Read-only ---

	test('eth_getBalance — get balance via shortcut', async () => {
		const getBalance = rpcMethodCard(page, 'eth_getBalance')
		await getBalance.clickShortcut('Get your address balance')
		await getBalance.waitForResponse()
		const response = await getBalance.getResponse()
		expect(response).toContain('0x')
	})

	// --- Error cases ---
	// Read-only methods return errors without opening SDK popups

	test('eth_getBalance — error on invalid address', async () => {
		const getBalance = rpcMethodCard(page, 'eth_getBalance')
		await getBalance.openParams()
		await getBalance.fillParam('address', 'invalid_address')
		await getBalance.fillParam('blockNumber', 'latest')
		await getBalance.submit()
		await getBalance.waitForResponse()
		const error = await getBalance.getError()
		expect(error).toBeTruthy()
	})

	test('eth_getTransactionCount — error on invalid address', async () => {
		const getTxCount = rpcMethodCard(page, 'eth_getTransactionCount')
		await getTxCount.openParams()
		await getTxCount.fillParam('address', 'invalid_address')
		await getTxCount.fillParam('blockNumber', 'latest')
		await getTxCount.submit()
		await getTxCount.waitForResponse()
		const error = await getTxCount.getError()
		expect(error).toBeTruthy()
	})
})
