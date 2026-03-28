import type { Page } from '@playwright/test'

import { SCW_URL } from './constants.js'

/**
 * Check if a cookie domain belongs to Google.
 * Used to filter Google session cookies from GOOGLE_SESSION_STATE.
 * Covers known Google TLDs observed in session cookies (.google.com, .google.com.sg).
 */
export const isGoogleDomain = (domain: string): boolean =>
	domain === 'google.com' ||
	domain.endsWith('.google.com') ||
	domain.endsWith('.google.com.sg')

export type SessionCookie = {
	name: string
	value: string
	domain: string
	path: string
	expires: number
	httpOnly: boolean
	secure: boolean
	sameSite: 'None' | 'Strict' | 'Lax'
}

/**
 * Parse GOOGLE_SESSION_STATE env var and return all cookies.
 * Returns undefined when the env var is not set or contains invalid JSON.
 */
export const parseAllSessionCookies = (): SessionCookie[] | undefined => {
	if (!process.env.GOOGLE_SESSION_STATE) return undefined

	// CI secret — shape is controlled by save-google-session.ts output.
	// Wrap in try-catch to surface clear errors on malformed JSON
	// instead of crashing during beforeAll setup.
	let session: { cookies?: SessionCookie[] } | undefined
	try {
		session = JSON.parse(process.env.GOOGLE_SESSION_STATE) as
			| { cookies?: SessionCookie[] }
			| undefined
	} catch {
		console.warn(
			'[parseAllSessionCookies] GOOGLE_SESSION_STATE contains invalid JSON',
		)
		return undefined
	}

	if (!session?.cookies || !Array.isArray(session.cookies)) {
		console.warn(
			'[parseAllSessionCookies] GOOGLE_SESSION_STATE does not contain a valid cookies array',
		)
		return undefined
	}

	return session.cookies
}

/**
 * Parse GOOGLE_SESSION_STATE env var and return only Google cookies.
 * Returns undefined when the env var is not set.
 */
export const parseGoogleSessionCookies = (): SessionCookie[] | undefined =>
	parseAllSessionCookies()?.filter((c) => isGoogleDomain(c.domain))

/**
 * Inject SCW_URL into testapp localStorage so ConfigContextProvider
 * uses the correct wallet URL on mount. No-op when SCW_URL is not set.
 */
export const injectSCWUrl = async (page: Page): Promise<void> => {
	if (!process.env.SCW_URL) return
	await page.goto('/')
	await page.evaluate((url) => localStorage.setItem('scw_url', url), SCW_URL)
}

/**
 * Wait for a popup to appear after triggering an action.
 * Returns the popup Page.
 */
export const waitForPopup = async (
	page: Page,
	trigger: () => Promise<void>,
): Promise<Page> => {
	const popupPromise = page.waitForEvent('popup')
	await trigger()
	const popup = await popupPromise
	await popup.waitForLoadState('domcontentloaded')
	return popup
}

/**
 * Wait for a popup to close (e.g. after auth completes).
 */
export const waitForPopupClose = async (popup: Page): Promise<void> => {
	await popup.waitForEvent('close')
}

/**
 * Approve an SDK popup action (Sign, Confirm, Approve).
 *
 * The SDK popup (SCW_URL, defaults to app.startale.com) shows different confirmation screens:
 * - /connect-wallet → "Approve" button
 * - /message-sign  → "Sign" button
 * - /transaction   → "Confirm" button
 *
 * This helper clicks whichever action button appears and waits for the popup to close.
 * Relies on config-level actionTimeout (60s) for button visibility.
 */
export const approveSDKPopup = async (popup: Page): Promise<void> => {
	const actionButton = popup
		.getByRole('button', { name: 'Sign' })
		.or(popup.getByRole('button', { name: 'Approve' }))
		.or(popup.getByRole('button', { name: 'Confirm' }))
		.or(popup.getByRole('button', { name: 'Send' }))

	// Race: button becomes clickable vs popup closes (error/auto-sign)
	const popupClosed = popup
		.waitForEvent('close')
		.then(() => 'closed' as const)

	const buttonReady = actionButton
		.waitFor({ state: 'visible' })
		.then(() => actionButton.click())
		.then(() => 'clicked' as const)
		.catch(() => 'button-failed' as const)

	const result = await Promise.race([popupClosed, buttonReady])

	// 'closed': popup auto-closed (SDK handled it, e.g. auto-sign)
	// 'button-failed' with closed popup: same as above
	if (result === 'clicked' && !popup.isClosed()) {
		await popupClosed
	} else if (result === 'button-failed' && !popup.isClosed()) {
		throw new Error(
			'SDK popup action button (Sign/Approve/Confirm/Send) not found while popup is still open',
		)
	}
}

/**
 * Handle an RPC call that triggers an SDK popup requiring approval.
 *
 * Flow:
 * 1. Trigger the action (shortcut click, submit, etc.)
 * 2. Wait for the SDK popup to open
 * 3. Click the action button (Sign/Approve/Confirm)
 * 4. Wait for the popup to close
 */
export const triggerAndApproveSDKPopup = async (
	page: Page,
	trigger: () => Promise<void>,
): Promise<void> => {
	const popup = await waitForPopup(page, trigger)
	await approveSDKPopup(popup)
}
