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

	// Short timeout: 2FA challenge appears within seconds if triggered.
	// Without a timeout, the popup waits too long before reaching the "Approve" button.
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
 * Complete the Google OAuth email → password → 2FA form.
 * Called only when Google shows the login form (no pre-existing session cookies).
 */
const completeGoogleOAuthForm = async (
	sdkPopup: Page,
	email: string,
	password: string,
): Promise<void> => {
	// type() with delay simulates human-like keystroke timing (100ms per char)
	// to avoid Google's bot detection. fill() sets the value instantly and is
	// more likely to be flagged as automated input.
	const emailInput = sdkPopup.locator('input[type="email"]')
	await emailInput.waitFor({ state: 'visible' })
	await emailInput.pressSequentially(email, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Use name="Passwd" — Google's login page contains hidden decoy
	// password inputs that cause type="password" selectors to fail.
	const passwordInput = sdkPopup.locator('input[name="Passwd"]')
	await passwordInput.waitFor({ state: 'visible' })
	await passwordInput.pressSequentially(password, { delay: 100 })
	await sdkPopup.getByRole('button', { name: /Next/i }).click()

	// Handle 2FA if configured
	if (process.env.GOOGLE_TOTP_SECRET) {
		await handle2FA(sdkPopup)
	}
}

/**
 * Login with Google OAuth via the SDK popup.
 *
 * Flow:
 * 1. Click Google sign-in button in SDK popup
 * 2. Handle Google OAuth form (email, password, 2FA) — OR skip if
 *    Google auto-authenticates via pre-loaded session cookies
 * 3. Wait for redirect back to SCW (app.startale.com or localhost)
 * 4. Click "Approve" on the connect-wallet permission screen
 */
export const loginWithGoogle = async (
	sdkPopup: Page,
	options?: { skipApprove?: boolean },
): Promise<void> => {
	const email = process.env.GOOGLE_TEST_EMAIL
	const password = process.env.GOOGLE_TEST_PASSWORD

	if (!email || !password) {
		throw new Error(
			'GOOGLE_TEST_EMAIL and GOOGLE_TEST_PASSWORD env vars required',
		)
	}

	const scwOrigin = new URL(SCW_URL).origin

	// Click the Google sign-in button. The button text varies by page:
	// - Login page: "Log in with Google"
	// - Sign up page: "Google"
	const googleButton = sdkPopup
		.getByRole('button', { name: 'Log in with Google' })
		.or(sdkPopup.getByRole('button', { name: 'Google' }))
	await googleButton.click()

	// After clicking Google, the popup navigates to accounts.google.com.
	// If session cookies are present (GOOGLE_SESSION_STATE), Google may
	// auto-authenticate and redirect: SCW login → Google → SCW /connect-wallet.
	//
	// IMPORTANT: Race against specific post-auth SCW paths, not scwOrigin/*.
	// The popup STARTS on an SCW URL (the login page), so a generic scwOrigin
	// match would resolve immediately before navigation even begins.
	const needsManualLogin = await Promise.race([
		sdkPopup
			.waitForURL('**/accounts.google.com/**', { timeout: 30_000 })
			.then(() => true),
		sdkPopup
			.waitForURL(
				(url) =>
					url.origin === scwOrigin &&
					(url.pathname.includes('/connect-wallet') ||
						url.pathname.includes('/link-eoa')),
				{ timeout: 30_000 },
			)
			.then(() => false),
	])

	if (needsManualLogin) {
		// Google may show two different pages:
		// 1. Account chooser (/accountchooser) — session cookies exist but
		//    expired ("Signed out"). Click the account row to skip email entry.
		// 2. Email form (/identifier) — no session cookies, full login needed.
		const isAccountChooser = sdkPopup
			.url()
			.includes('/accountchooser')

		if (isAccountChooser) {
			// Click the test account to proceed to password entry
			await sdkPopup.getByText(email).click()

			const passwordInput = sdkPopup.locator('input[name="Passwd"]')
			await passwordInput.waitFor({ state: 'visible' })
			await passwordInput.pressSequentially(password, { delay: 100 })
			await sdkPopup.getByRole('button', { name: /Next/i }).click()

			if (process.env.GOOGLE_TOTP_SECRET) {
				await handle2FA(sdkPopup)
			}
		} else {
			await completeGoogleOAuthForm(sdkPopup, email, password)
		}

		await sdkPopup.waitForURL(`${scwOrigin}/**`)
	}

	if (!options?.skipApprove) {
		// Click the "Approve" button on the connect-wallet permission screen
		const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
		await approveButton.waitFor({ state: 'visible' })
		await approveButton.click()
	}
}
