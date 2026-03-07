import type { Page } from '@playwright/test'

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
 * The SDK popup at app.startale.com shows different confirmation screens:
 * - /connect-wallet → "Approve" button
 * - /message-sign  → "Sign" button
 * - /transaction   → "Confirm" button
 *
 * This helper clicks whichever action button appears and waits for the popup to close.
 * Relies on config-level actionTimeout (60s) for button visibility.
 */
export const approveSDKPopup = async (
	popup: Page,
): Promise<void> => {
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

	if (result === 'clicked') {
		await waitForPopupClose(popup)
	}
	// If 'closed' or 'button-failed', the popup already closed (SDK handled it)
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
