import type { Page } from '@playwright/test'

import { expect, test } from '../../fixtures/wallet.fixture.js'
import { loginWithMetaMask } from '../../lib/auth/metamask-eoa.js'
import { ROUTES } from '../../lib/constants.js'
import {
	triggerAndApproveSDKPopup,
	waitForPopup,
	waitForPopupClose,
} from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'

/**
 * All RPC method tests that require MetaMask EOA authentication.
 *
 * These tests run in serial mode sharing the same browser context
 * so that the SDK popup session (app.startale.com) is preserved
 * across tests. MetaMask login is performed once in beforeAll,
 * then each test reuses the same authenticated page.
 *
 * We create a page from walletContext directly (worker-scoped) instead of
 * using walletPage fixture (test-scoped) to avoid page cleanup between tests.
 */
test.describe('EOA — RPC Methods', () => {
	test.describe.configure({ mode: 'serial' })

	let page: Page

	test.beforeAll(async ({ walletContext, wallet, baseURL }) => {
		page = await walletContext.newPage()

		// dappwright context does not inherit Playwright's baseURL — resolve manually
		await page.goto(`${baseURL}${ROUTES.dashboard}`)
		const dashboard = dashboardPage(page)
		await dashboard.verifyLoaded()

		const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')

		const sdkPopup = await waitForPopup(page, () =>
			ethRequestAccounts.submit(),
		)

		await loginWithMetaMask(sdkPopup, wallet)
		await waitForPopupClose(sdkPopup)

		await dashboard.verifyConnectedSections()

		// Verify "Connected" toast appears
		await expect(page.locator('#toast-connected')).toBeVisible()
	})

	test.afterAll(async () => {
		await page?.close()
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

		// May return a signature (0x...) or an error if the signer account
		// is not yet deployed on-chain (code 4001).
		await signTypedData.waitForResponse()
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

	test('wallet_switchEthereumChain — switch chain via shortcut', async () => {
		const switchChain = rpcMethodCard(page, 'wallet_switchEthereumChain')

		await switchChain.clickShortcut('Minato')

		// wallet_switchEthereumChain returns null on success (no card response).
		// Verify the chain switch via the chainChanged event listener.
		const eventSection = page.getByTestId('section-event-listeners')
		await expect(eventSection.getByText('0x79a')).toBeVisible()

		// Verify "Chain changed" toast appears
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
})
