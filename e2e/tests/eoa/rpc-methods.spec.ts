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
 * EOA authentication pathway verification.
 *
 * Full RPC method coverage runs via Google OAuth (tests/google/).
 * This suite only verifies that MetaMask EOA login works and
 * can execute a basic signing operation.
 */
test.describe('EOA — RPC Methods', () => {
	test.describe.configure({ mode: 'serial' })

	let page: Page

	test.beforeAll(async ({ walletContext, wallet, baseURL }) => {
		page = await walletContext.newPage()

		// dappwright's walletContext does not inherit Playwright's baseURL
		// (unlike browser.newContext() which gets it from project config).
		// Resolve the full URL manually.
		await page.goto(`${baseURL}${ROUTES.dashboard}`)
		const dashboard = dashboardPage(page)
		await dashboard.verifyLoaded()

		const ethRequestAccounts = rpcMethodCard(page, 'eth_requestAccounts')

		const sdkPopup = await waitForPopup(page, () =>
			ethRequestAccounts.submit(),
		)

		await loginWithMetaMask(sdkPopup, wallet)
		await waitForPopupClose(sdkPopup)

		// Verify "Connected" toast appears
		await expect(page.locator('#toast-connected')).toBeVisible()

		await dashboard.verifyConnectedSections()
	})

	test.afterAll(async () => {
		await page?.close()
	})

	test('personal_sign — sign a message via shortcut', async () => {
		const personalSign = rpcMethodCard(page, 'personal_sign')
		await triggerAndApproveSDKPopup(page, () =>
			personalSign.clickShortcut('Example Message'),
		)
		await personalSign.waitForResponse()
		const response = await personalSign.getResponse()
		expect(response).toContain('0x')
	})
})
