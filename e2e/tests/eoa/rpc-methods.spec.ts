import type { Page } from '@playwright/test'
import { expect, test } from '../../fixtures/wallet.fixture.js'
import { loginWithMetaMask } from '../../lib/auth/metamask-eoa.js'
import { ROUTES } from '../../lib/constants.js'
import { waitForPopup, waitForPopupClose } from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'
import { registerRpcMethodTests } from '../../lib/rpc-test-suite.js'

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

		// Verify "Connected" toast appears
		await expect(page.locator('#toast-connected')).toBeVisible()

		await dashboard.verifyConnectedSections()
	})

	test.afterAll(async () => {
		await page?.close()
	})

	registerRpcMethodTests(test, () => page)
})
