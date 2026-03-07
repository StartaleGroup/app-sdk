import type { Page } from '@playwright/test'
import * as OTPAuth from 'otpauth'

const generateGoogleTOTP = (secret: string): string => {
	const totp = new OTPAuth.TOTP({
		issuer: 'Google',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret),
	})
	return totp.generate()
}

/**
 * Handle Google 2FA challenge if it appears.
 */
const handle2FA = async (page: Page): Promise<void> => {
	const totpSecret = process.env.GOOGLE_TOTP_SECRET
	if (!totpSecret) throw new Error('GOOGLE_TOTP_SECRET env var required')

	// Wait for 2FA challenge page
	await page
		.waitForURL('**/signin/v2/challenge/**', { timeout: 10_000 })
		.catch(() => {})

	const totpInput = page.locator('input[type="tel"]')
	const isVisible = await totpInput
		.isVisible({ timeout: 5_000 })
		.catch(() => false)

	if (isVisible) {
		const code = generateGoogleTOTP(totpSecret)
		await totpInput.fill(code)
		await page.getByRole('button', { name: /Next/i }).click()
	}
}

/**
 * Login with Google OAuth via the SDK popup.
 *
 * Flow:
 * 1. Click Google sign-in button in SDK popup
 * 2. Handle Google OAuth form (email, password, 2FA)
 * 3. Wait for redirect back to app.startale.com
 */
export const loginWithGoogle = async (sdkPopup: Page): Promise<void> => {
	const email = process.env.GOOGLE_TEST_EMAIL
	const password = process.env.GOOGLE_TEST_PASSWORD

	if (!email || !password) {
		throw new Error(
			'GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD env vars required',
		)
	}

	// Click "Log in with Google"
	await sdkPopup
		.getByRole('button', { name: 'Log in with Google' })
		.click()

	// Wait for Google OAuth page to load
	await sdkPopup.waitForURL('**/accounts.google.com/**')

	// Email input with human-like typing
	const emailInput = sdkPopup.locator('input[type="email"]')
	await emailInput.waitFor({ state: 'visible' })
	await emailInput.type(email, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Password input — use name="Passwd" to avoid hidden decoy input
	const passwordInput = sdkPopup.locator('input[name="Passwd"]')
	await passwordInput.waitFor({ state: 'visible' })
	await passwordInput.type(password, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Handle 2FA if configured
	if (process.env.GOOGLE_TOTP_SECRET) {
		await handle2FA(sdkPopup)
	}

	// Wait for redirect back to app.startale.com (connect-wallet approval page)
	await sdkPopup.waitForURL('**/app.startale.com/**')

	// Click the "Approve" button on the connect-wallet permission screen
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}
