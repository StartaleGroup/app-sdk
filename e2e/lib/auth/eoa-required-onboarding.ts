/**
 * Helper for EOA Required wallet linking flow.
 *
 * Handles MetaMask wallet linking in the SDK popup.
 * Full linking flow: click Link wallet, select MetaMask,
 * approve Connect, confirm SIWE sign-in, and click Approve.
 */

import type { BrowserContext, Page } from '@playwright/test'

/**
 * Wait for the SIWE signature popup to appear.
 *
 * After approving Connect, MetaMask may show SIWE in the same popup
 * (URL changes to signature-request) or open a new popup. This
 * function handles both cases by racing them.
 */
const waitForSignaturePopup = async (
	context: BrowserContext,
	metaMaskPopup: Page,
): Promise<Page> => {
	const signButton = metaMaskPopup.getByTestId('confirm-footer-button')

	if (metaMaskPopup.url().includes('signature-request')) {
		await signButton.waitFor({ state: 'visible' })
		return metaMaskPopup
	}

	const nextPopupPromise = context.waitForEvent('page')

	// Case 1: Same popup transitions to signature page
	const samePopupSignature = Promise.race([
		metaMaskPopup.waitForURL(/signature-request/).then(() => metaMaskPopup),
		signButton.waitFor({ state: 'visible' }).then(() => metaMaskPopup),
	])

	// Case 2: Popup closes, new one opens for signature
	const nextPopupSignature = metaMaskPopup
		.waitForEvent('close')
		.then(async () => {
			const nextPopup = await nextPopupPromise
			const nextSignButton = nextPopup.getByTestId('confirm-footer-button')

			await nextPopup.waitForLoadState('domcontentloaded')
			await nextPopup.bringToFront()
			await Promise.race([
				nextPopup.waitForURL(/signature-request/),
				nextSignButton.waitFor({ state: 'visible' }),
			])

			return nextPopup
		})

	return Promise.race([samePopupSignature, nextPopupSignature])
}

/**
 * Handle MetaMask Connect + SIWE approval in the notification popup.
 *
 * Uses bringToFront() to ensure MetaMask renders the notification UI
 * (without focus, Chrome extension popups may stay blank).
 */
const approveMetaMaskSignin = async (
	context: BrowserContext,
	metaMaskPopup: Page,
): Promise<void> => {
	const confirmBtn = metaMaskPopup.getByTestId('confirm-btn')

	// MetaMask extension popups start as blank pages — wait for content
	// to load before interacting (replaces global slowMo approach).
	await metaMaskPopup.waitForLoadState('domcontentloaded')
	await metaMaskPopup.bringToFront()
	await Promise.race([
		metaMaskPopup.waitForURL(/(connect)|(signature-request)/),
		confirmBtn
			.or(metaMaskPopup.getByTestId('confirm-footer-button'))
			.waitFor({ state: 'visible' }),
	])

	let signaturePopup = metaMaskPopup

	// Handle Connect approval if shown
	if (await confirmBtn.isVisible().catch(() => false)) {
		const signaturePopupPromise = waitForSignaturePopup(context, metaMaskPopup)
		await confirmBtn.scrollIntoViewIfNeeded()
		await confirmBtn.click()
		signaturePopup = await signaturePopupPromise
	}

	// Handle SIWE signature
	const signButton = signaturePopup.getByTestId('confirm-footer-button')
	const popupClosed = signaturePopup
		.waitForEvent('close')
		.catch(() => undefined)

	await signButton.waitFor({ state: 'visible' })
	await signButton.scrollIntoViewIfNeeded()
	await signButton.click()

	if (!signaturePopup.isClosed()) {
		await popupClosed
	}
}

/**
 * Open the "Link a new wallet" modal and wait for it to be ready.
 *
 * Dynamic Auth's wallet modal can transiently fail with
 * "Something went wrong. Please try again." on initialization.
 * When this happens, close the modal and retry (up to maxRetries).
 */
const openWalletModal = async (
	sdkPopup: Page,
	maxRetries = 3,
): Promise<void> => {
	const errorBanner = sdkPopup.getByText('Something went wrong')
	const metaMaskButton = sdkPopup.getByRole('button', {
		name: 'metamask MetaMask',
	})

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		await sdkPopup.getByRole('button', { name: 'Link wallet' }).click()

		// Wait for either MetaMask button or error banner to appear
		await metaMaskButton
			.or(errorBanner)
			.first()
			.waitFor({ state: 'visible' })

		const hasError = await errorBanner.isVisible().catch(() => false)
		if (!hasError) return

		console.warn(
			`[linkEOAWallet] Wallet modal error on attempt ${attempt + 1}/${maxRetries}, retrying...`,
		)

		// Close modal via X button and retry.
		// Uses aria-label selector: Dynamic Auth modal does not support data-testid.
		const closeButton = sdkPopup.locator('button[aria-label="close"]')
		if (await closeButton.isVisible().catch(() => false)) {
			await closeButton.click()
		} else {
			await sdkPopup.keyboard.press('Escape')
		}
		// Wait for error banner to disappear (signals modal has closed)
		await errorBanner.waitFor({ state: 'hidden' }).catch(() => {})
	}

	throw new Error(
		'Wallet modal failed with "Something went wrong" after all retries',
	)
}

/**
 * Link an EOA wallet via MetaMask in the SDK popup.
 *
 * Assumes the popup is on the /link-eoa page (after Google OAuth).
 *
 * Flow:
 * 1. Click "Link wallet" — opens "Link a new wallet" modal (with retry)
 * 2. Set up MetaMask popup listener (before clicking MetaMask!)
 * 3. Click MetaMask option — triggers MetaMask popup
 * 4. Approve Connect + SIWE in MetaMask popup
 * 5. Wait for SDK popup to navigate to /connect-wallet
 * 6. Click "Approve" on /connect-wallet permission page
 *
 * The popup listener is set up BEFORE clicking MetaMask to avoid
 * a race condition where MetaMask opens its notification popup
 * before the listener is ready (dappwright's signin() has this bug).
 */
export const linkEOAWallet = async (sdkPopup: Page): Promise<void> => {
	// Step 1: Open wallet modal (retries on "Something went wrong" error)
	await openWalletModal(sdkPopup)

	// Step 2-3: Set up popup listener BEFORE clicking MetaMask to
	// avoid race condition where MetaMask opens before the listener.
	const metaMaskPopupPromise = sdkPopup.context().waitForEvent('page')
	await sdkPopup.getByRole('button', { name: 'metamask MetaMask' }).click()
	const metaMaskPopup = await metaMaskPopupPromise

	// Step 4: Handle Connect + SIWE in MetaMask popup
	await approveMetaMaskSignin(sdkPopup.context(), metaMaskPopup)

	// Step 5: Wait for SDK popup to navigate to /connect-wallet.
	// Dynamic Auth's backend confirms the wallet linking asynchronously.
	// The /link-eoa page sometimes doesn't detect the state change even
	// though the linking succeeded on the backend. When that happens,
	// close the stale popup so the caller can re-open a fresh one —
	// the new popup will see the linked wallet and go to /connect-wallet.
	await sdkPopup.bringToFront()
	const navigated = await sdkPopup
		.waitForURL('**/connect-wallet**', { timeout: 15_000 })
		.then(() => true)
		.catch(() => false)

	if (!navigated) {
		if (!sdkPopup.isClosed()) await sdkPopup.close()
		return
	}

	// Step 6: Click "Approve" on /connect-wallet permission page
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}
