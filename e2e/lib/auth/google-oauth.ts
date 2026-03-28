import type { Locator, Page } from '@playwright/test'
import * as OTPAuth from 'otpauth'

import { SCW_URL } from '../constants.js'
import { isGoogleDomain } from '../helpers.js'

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
	if (!isGoogleDomain(hostname)) return

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
 * Enter password and handle 2FA on Google's login page.
 * Shared by both the email form and account chooser flows.
 */
const enterPasswordAndHandle2FA = async (
	page: Page,
	password: string,
): Promise<void> => {
	// Use name="Passwd" — Google's login page contains hidden decoy
	// password inputs that cause type="password" selectors to fail.
	const passwordInput = page.locator('input[name="Passwd"]')
	await passwordInput.waitFor({ state: 'visible' })
	await passwordInput.pressSequentially(password, { delay: 100 })
	await page.getByRole('button', { name: /Next/i }).click()

	if (process.env.GOOGLE_TOTP_SECRET) {
		await handle2FA(page)
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

	await enterPasswordAndHandle2FA(sdkPopup, password)
}

const completeGoogleOAuthAfterAccountSelection = async (
	sdkPopup: Page,
	email: string,
	password: string,
	scwOrigin: string,
): Promise<void> => {
	const nextStep = await Promise.race([
		sdkPopup
			.waitForURL((url) => url.origin === scwOrigin)
			.then(() => 'scw' as const),
		sdkPopup
			.locator('input[name="Passwd"]')
			.waitFor({ state: 'visible' })
			.then(() => 'password' as const),
		sdkPopup
			.locator('input[type="email"]')
			.waitFor({ state: 'visible' })
			.then(() => 'email' as const),
	])

	if (nextStep === 'scw') return
	if (nextStep === 'password') {
		await enterPasswordAndHandle2FA(sdkPopup, password)
		return
	}

	await completeGoogleOAuthForm(sdkPopup, email, password)
}

const continueFromAccountChooser = async (
	sdkPopup: Page,
	email: string,
	password: string,
	scwOrigin: string,
): Promise<void> => {
	const useAnotherAccount = sdkPopup.getByText('Use another account')
	const hasSignedOutAccount = await sdkPopup
		.getByText('Signed out')
		.isVisible()
		.catch(() => false)

	if (hasSignedOutAccount && (await useAnotherAccount.isVisible().catch(() => false))) {
		await useAnotherAccount.click()
		await completeGoogleOAuthForm(sdkPopup, email, password)
		return
	}

	await sdkPopup.getByText(email).click()
	await completeGoogleOAuthAfterAccountSelection(
		sdkPopup,
		email,
		password,
		scwOrigin,
	)
}

const resolveGoogleManualLoginState = async (
	sdkPopup: Page,
	scwOrigin: string,
): Promise<'chooser' | 'email' | 'password' | 'complete' | 'scw'> => {
	const currentUrl = sdkPopup.url()
	if (currentUrl.includes('/accountchooser')) return 'chooser'
	if (new URL(currentUrl).origin === scwOrigin) return 'scw'
	if (
		await sdkPopup
			.getByText('You may now close this window')
			.isVisible()
			.catch(() => false)
	) {
		return 'complete'
	}

	const passwordInput = sdkPopup.locator('input[name="Passwd"]')
	if (await passwordInput.isVisible().catch(() => false)) return 'password'

	const emailInput = sdkPopup.locator('input[type="email"]')
	if (await emailInput.isVisible().catch(() => false)) return 'email'

	const chooserAccount = sdkPopup.getByText('Use another account')
	if (await chooserAccount.isVisible().catch(() => false)) return 'chooser'

	return Promise.race([
		sdkPopup
			.waitForURL((url) => url.pathname.includes('/accountchooser'))
			.then(() => 'chooser' as const),
		passwordInput
			.waitFor({ state: 'visible' })
			.then(() => 'password' as const),
		emailInput
			.waitFor({ state: 'visible' })
			.then(() => 'email' as const),
		sdkPopup
			.getByText('You may now close this window')
			.waitFor({ state: 'visible' })
			.then(() => 'complete' as const),
		sdkPopup
			.waitForURL((url) => url.origin === scwOrigin)
			.then(() => 'scw' as const),
	]).catch(() => {
		throw new Error(
			`Unable to determine Google manual login state from popup URL: ${sdkPopup.url()}`,
		)
	})
}

const isPostAuthSCWPath = (url: URL, scwOrigin: string): boolean =>
	url.origin === scwOrigin &&
	(url.pathname.includes('/connect-wallet') ||
		url.pathname.includes('/link-eoa'))

/**
 * Locator for the Google sign-in button on the SDK popup.
 * The button text varies by page: "Log in with Google" (login) or "Google" (sign up).
 */
const getGoogleSignInButton = (page: Page): Locator =>
	page
		.getByRole('button', { name: 'Log in with Google' })
		.or(page.getByRole('button', { name: 'Google' }))

const resolveOAuthEntryState = async (
	sdkPopup: Page,
	scwOrigin: string,
): Promise<'login' | 'google' | 'post-auth'> => {
	const currentUrl = new URL(sdkPopup.url())
	if (isPostAuthSCWPath(currentUrl, scwOrigin)) return 'post-auth'
	if (isGoogleDomain(currentUrl.hostname)) return 'google'

	const googleButton = getGoogleSignInButton(sdkPopup)

	return Promise.race([
		googleButton
			.waitFor({ state: 'visible' })
			.then(() => 'login' as const),
		sdkPopup
			.waitForURL((url) => isGoogleDomain(url.hostname))
			.then(() => 'google' as const),
		sdkPopup
			.waitForURL((url) => isPostAuthSCWPath(url, scwOrigin))
			.then(() => 'post-auth' as const),
	]).catch(async () => {
		const latestUrl = new URL(sdkPopup.url())
		if (isPostAuthSCWPath(latestUrl, scwOrigin)) return 'post-auth'
		if (isGoogleDomain(latestUrl.hostname)) return 'google'
		if (await googleButton.isVisible().catch(() => false)) return 'login'

		throw new Error(
			`Unable to determine Google OAuth entry state from popup URL: ${sdkPopup.url()}`,
		)
	})
}

const waitForGoogleAuthPage = async (
	sdkPopup: Page,
	scwOrigin: string,
): Promise<{ authPage: Page; needsManualLogin: boolean }> =>
	Promise.any([
		sdkPopup
			.waitForEvent('popup')
			.then(async (popup) => {
				await popup.waitForLoadState('domcontentloaded')
				return {
					authPage: popup,
					needsManualLogin: true,
				} as const
			}),
		sdkPopup
			.waitForURL((url) => isGoogleDomain(url.hostname))
			.then(
				() =>
					({
						authPage: sdkPopup,
						needsManualLogin: true,
					}) as const,
			),
		sdkPopup
			.waitForURL((url) => isPostAuthSCWPath(url, scwOrigin))
			.then(
				() =>
					({
						authPage: sdkPopup,
						needsManualLogin: false,
					}) as const,
			),
	]).catch(() => {
		throw new Error(
			`Google OAuth did not open a popup or navigate to a post-auth state from ${sdkPopup.url()}`,
		)
	})

const waitForPostGoogleAuthState = async (
	sdkPopup: Page,
	authPage: Page,
	scwOrigin: string,
): Promise<void> => {
	const postAuthReady = Promise.race([
		sdkPopup.waitForURL((url) => isPostAuthSCWPath(url, scwOrigin)),
		sdkPopup
			.getByRole('button', { name: 'Approve' })
			.waitFor({ state: 'visible' }),
	])

	if (authPage === sdkPopup) {
		await postAuthReady
		return
	}

	await Promise.race([
		postAuthReady,
		authPage
			.waitForEvent('close')
			.then(() => undefined),
		authPage
			.getByText('You may now close this window')
			.waitFor({ state: 'visible' })
			.then(async () => {
				if (!authPage.isClosed()) {
					await authPage.close().catch(() => {})
				}
			}),
	])

	await postAuthReady
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

	const entryState = await resolveOAuthEntryState(sdkPopup, scwOrigin)
	let authPage = sdkPopup
	let needsManualLogin = entryState === 'google'

	if (entryState === 'login') {
		const googleButton = getGoogleSignInButton(sdkPopup)
		const nextState = waitForGoogleAuthPage(sdkPopup, scwOrigin)
		await googleButton.click()
		const result = await nextState
		authPage = result.authPage
		needsManualLogin = result.needsManualLogin
	}

	if (needsManualLogin) {
		// Google may briefly land on intermediate URLs before rendering the
		// actual prompt. Wait for the visible chooser/form state instead of
		// branching on the first Google-domain URL we see.
		const manualLoginState = await resolveGoogleManualLoginState(
			authPage,
			scwOrigin,
		)

		switch (manualLoginState) {
			case 'chooser':
				await continueFromAccountChooser(authPage, email, password, scwOrigin)
				break
			case 'password':
				await enterPasswordAndHandle2FA(authPage, password)
				break
			case 'email':
				await completeGoogleOAuthForm(authPage, email, password)
				break
			case 'complete':
				if (authPage !== sdkPopup) await authPage.close().catch(() => {})
				break
			case 'scw':
				// Google auto-authenticated via session cookies and already
				// redirected to the SCW origin. No manual login needed —
				// waitForPostGoogleAuthState below will confirm the final state.
				if (authPage !== sdkPopup) await authPage.close().catch(() => {})
				break
		}

		await waitForPostGoogleAuthState(sdkPopup, authPage, scwOrigin)
	}

	if (!options?.skipApprove) {
		// Click the "Approve" button on the connect-wallet permission screen
		const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
		await approveButton.waitFor({ state: 'visible' })
		await approveButton.click()
	}
}
