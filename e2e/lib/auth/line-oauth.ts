import type { BrowserContext, Page } from '@playwright/test'

import { SCW_URL } from '../constants.js'

/**
 * Find the LINE login page — either as a separate popup or as the
 * sdkPopup itself after redirect.
 *
 * Dynamic Auth may open LINE login as:
 * 1. A new browser window (popup) — new page in context
 * 2. A redirect of the sdkPopup — sdkPopup URL changes to access.line.me
 *
 * This function handles both cases by racing between popup detection
 * and URL navigation.
 */
const findLineLoginPage = async (
	sdkPopup: Page,
	existingPages: Set<Page>,
): Promise<{ page: Page; isRedirect: boolean }> => {
	const context = sdkPopup.context()

	// Race: new page in context vs sdkPopup navigating to LINE
	const result = await Promise.race([
		// Case 1: New popup/page opens
		context.waitForEvent('page').then((newPage) => ({
			page: newPage,
			isRedirect: false,
		})),
		// Case 2: sdkPopup itself navigates to LINE
		sdkPopup
			.waitForURL((url) => url.hostname.includes('line.me'))
			.then(() => ({
				page: sdkPopup,
				isRedirect: true,
			})),
		// Case 3: Already opened — check existing pages
		new Promise<{ page: Page; isRedirect: boolean }>((resolve) => {
			const check = (): void => {
				// Check if sdkPopup already navigated
				if (sdkPopup.url().includes('line.me')) {
					resolve({ page: sdkPopup, isRedirect: true })
					return
				}
				// Check for new pages
				for (const p of context.pages()) {
					if (!existingPages.has(p)) {
						resolve({ page: p, isRedirect: false })
						return
					}
				}
				setTimeout(check, 500)
			}
			check()
		}),
	])

	await result.page.waitForLoadState('domcontentloaded')
	return result
}

/**
 * Handle the LINE login page.
 *
 * SSO path (cookies present): "Continue as [user]" screen with "Log in" button.
 * Manual path (no cookies): email/password form with "Log in" button.
 */
const handleLineLoginPage = async (linePopup: Page): Promise<void> => {
	const email = process.env.LINE_TEST_EMAIL
	const password = process.env.LINE_TEST_PASSWORD

	// LINE uses a custom Vue component for buttons — getByRole('button') does not
	// resolve accessible names reliably. Use CSS selectors instead.
	const loginButton = linePopup.locator('button.c-button--allow')
	const emailInput = linePopup.locator('input[name="tid"]')

	// Race: SSO screen vs email/password form
	const firstVisible = await Promise.race([
		loginButton
			.waitFor({ state: 'visible' })
			.then(() => 'sso' as const),
		emailInput
			.waitFor({ state: 'visible' })
			.then(() => 'manual' as const),
	])

	if (firstVisible === 'sso') {
		await loginButton.click()
		return
	}

	// Manual path: fill email and password
	if (!email || !password) {
		throw new Error(
			'LINE_TEST_EMAIL and LINE_TEST_PASSWORD env vars required for manual LINE login',
		)
	}

	await emailInput.fill(email)

	const passwordInput = linePopup.locator('input[type="password"]')
	await passwordInput.waitFor({ state: 'visible' })
	await passwordInput.fill(password)

	await loginButton.click()
}

/**
 * Login with LINE OAuth via the SDK popup.
 *
 * Flow:
 * 1. Click LINE button on SCW sign-up page
 * 2. If consent dialog appears: check checkbox + click "Continue with LINE"
 * 3. Find LINE login page (popup or redirect)
 * 4. Handle SSO or manual login on LINE page
 * 5. Wait for LINE page to close/navigate back
 * 6. Click "Approve" on the connect-wallet permission screen
 */
export const loginWithLine = async (
	sdkPopup: Page,
	options?: { skipApprove?: boolean },
): Promise<void> => {
	const context = sdkPopup.context()
	const existingPages = new Set(context.pages())

	// Click LINE button on the SCW sign-up page
	const lineButton = sdkPopup.getByRole('button', { name: 'LINE' })
	await lineButton.waitFor({ state: 'visible' })
	await lineButton.click()

	// Consent dialog may or may not appear.
	const consentCheckbox = sdkPopup.getByRole('checkbox')
	const hasConsent = await consentCheckbox
		.waitFor({ state: 'visible', timeout: 5_000 })
		.then(() => true)
		.catch(() => false)

	if (hasConsent) {
		const isChecked = await consentCheckbox.isChecked().catch(() => false)
		if (!isChecked) {
			await consentCheckbox.check()
		}
		const continueButton = sdkPopup.getByRole('button', {
			name: 'Continue with LINE',
		})
		await continueButton.waitFor({ state: 'visible' })
		await continueButton.click()
	}

	// Find LINE login page — could be a popup or a redirect of sdkPopup
	const { page: linePage, isRedirect } = await findLineLoginPage(
		sdkPopup,
		existingPages,
	)

	await handleLineLoginPage(linePage)

	// Wait for LINE login to complete
	if (isRedirect) {
		// sdkPopup redirected to LINE, will navigate back to SCW after login
		const scwOrigin = new URL(SCW_URL).origin
		await sdkPopup.waitForURL((url) => url.origin === scwOrigin)
	} else {
		// Separate popup — wait for it to close
		if (!linePage.isClosed()) {
			await linePage.waitForEvent('close')
		}
	}

	if (!options?.skipApprove) {
		const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
		await approveButton.waitFor({ state: 'visible' })
		await approveButton.click()
	}
}
