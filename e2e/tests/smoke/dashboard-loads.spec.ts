import { expect, test } from '@playwright/test'

import { dashboardPage } from '../../page-objects/dashboardPage.js'

test.describe('Dashboard smoke tests', () => {
	test('dashboard loads with expected sections', async ({ page }) => {
		const dashboard = dashboardPage(page)
		await dashboard.goto()
		await dashboard.verifyLoaded()
	})

	test('eth_requestAccounts card is visible', async ({ page }) => {
		const dashboard = dashboardPage(page)
		await dashboard.goto()

		await expect(page.getByTestId('rpc-card-eth_requestAccounts')).toBeVisible()
	})

	test('wallet_connect card is visible', async ({ page }) => {
		const dashboard = dashboardPage(page)
		await dashboard.goto()

		await expect(page.getByTestId('rpc-card-wallet_connect')).toBeVisible()
	})
})
