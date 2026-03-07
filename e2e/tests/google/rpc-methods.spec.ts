import {
	test,
	expect,
	type Page,
	type BrowserContext,
} from '@playwright/test'
import { loginWithGoogle } from '../../lib/auth/google-oauth.js'
import { ROUTES } from '../../lib/constants.js'
import { waitForPopup, waitForPopupClose } from '../../lib/helpers.js'
import { dashboardPage } from '../../page-objects/dashboardPage.js'
import { rpcMethodCard } from '../../page-objects/rpcMethodCard.js'
import { registerRpcMethodTests } from '../../lib/rpc-test-suite.js'

/**
 * All RPC method tests that require Google OAuth authentication.
 *
 * These tests run in serial mode sharing the same browser context
 * so that the SDK popup session (app.startale.com) is preserved
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

	test.beforeAll(async ({ browser }) => {
		context = await browser.newContext()
		page = await context.newPage()

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

	registerRpcMethodTests(test, () => page)
})
