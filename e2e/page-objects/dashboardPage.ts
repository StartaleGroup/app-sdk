import { expect, type Page } from '@playwright/test'

import { ROUTES } from '../lib/constants.js'

/**
 * Page object for testapp /dashboard page.
 * All selectors use data-testid for stability.
 */
export const dashboardPage = (page: Page) => ({
	goto: () => page.goto(ROUTES.dashboard),

	/** Verify dashboard loaded with expected sections */
	verifyLoaded: async () => {
		await expect(page.getByTestId('dashboard')).toBeVisible()
		await expect(page.getByTestId('section-event-listeners')).toBeVisible()
		await expect(page.getByTestId('section-sdk-config')).toBeVisible()
		await expect(page.getByTestId('section-wallet-connection')).toBeVisible()
	},

	/** Verify post-connection sections are visible */
	verifyConnectedSections: async () => {
		await expect(page.getByTestId('section-sign-message')).toBeVisible()
		await expect(page.getByTestId('section-send')).toBeVisible()
		await expect(page.getByTestId('section-readonly-json-rpc')).toBeVisible()
	},
})
