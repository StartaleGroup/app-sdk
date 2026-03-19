import type { Page } from '@playwright/test'
import * as OTPAuth from 'otpauth'

import { SCW_URL } from '../constants.js'

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

	// If already redirected past Google, 2FA was skipped
	const { hostname } = new URL(page.url())
	if (hostname !== 'google.com' && !hostname.endsWith('.google.com')) return

	// Short timeout: 2FA challenge appears within seconds if triggered, without timeout, it takes a long time to resolve the popup to click the "Approve" button
	await page
		.waitForURL('**/signin/v2/challenge/**', { timeout: 5_000 })
		.catch(() => {})

	const totpInput = page.locator('input[type="tel"]')
	const isVisible = await totpInput
		.isVisible()
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

	// type() with delay simulates human-like keystroke timing (100ms per char)
	// to avoid Google's bot detection. fill() sets the value instantly and is
	// more likely to be flagged as automated input.
	const emailInput = sdkPopup.locator('input[type="email"]')
	await emailInput.waitFor({ state: 'visible' })
	await emailInput.pressSequentially(email, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Use name="Passwd" — Google's login page contains hidden decoy
	// password inputs that cause type="password" selectors to fail. Perhaps there are decoys
	const passwordInput = sdkPopup.locator('input[name="Passwd"]')
	await passwordInput.waitFor({ state: 'visible' })
	await passwordInput.pressSequentially(password, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Handle 2FA if configured
	if (process.env.GOOGLE_TOTP_SECRET) {
		await handle2FA(sdkPopup)
	}

	// Wait for redirect back to SCW (connect-wallet approval page).
	// Use origin (scheme + host + port) so the pattern works for both
	// production (https://app.startale.com) and localhost (http://localhost:3000).
	const scwOrigin = new URL(SCW_URL).origin
	await sdkPopup.waitForURL(`${scwOrigin}/**`)

	// Click the "Approve" button on the connect-wallet permission screen
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}
