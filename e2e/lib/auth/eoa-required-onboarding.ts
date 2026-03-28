/**
 * Helper for EOA Required wallet linking flow.
 *
 * Handles MetaMask wallet linking in the SDK popup.
 * Full linking flow: click Link wallet, select MetaMask,
 * approve Connect, confirm SIWE sign-in, and click Approve.
 */

import type { BrowserContext, Locator, Page } from '@playwright/test'

const isTargetClosedError = (error: unknown): boolean => {
	if (error instanceof AggregateError) {
		return error.errors.every((nestedError) => isTargetClosedError(nestedError))
	}

	return (
		error instanceof Error &&
		/Target page, context or browser has been closed|has been closed/i.test(
			error.message,
		)
	)
}

const ignoreClosedError = async <T>(
	promise: Promise<T>,
): Promise<T | null> => {
	try {
		return await promise
	} catch (error) {
		if (isTargetClosedError(error)) return null
		throw error
	}
}

const getMetaMaskConnectButton = (page: Page): Locator =>
	page
		.getByTestId('confirm-btn')
		.or(page.getByRole('button', { name: 'Connect' }))

const getMetaMaskSignButton = (page: Page): Locator =>
	page
		.getByTestId('confirm-footer-button')
		.or(page.getByRole('button', { name: /^(Sign|Confirm)$/ }))

const waitForMetaMaskAction = async (
	page: Page,
): Promise<'connect' | 'sign' | 'closed'> => {
	const connectButton = getMetaMaskConnectButton(page)
	const signButton = getMetaMaskSignButton(page)

	if (await connectButton.isVisible().catch(() => false)) return 'connect'
	if (await signButton.isVisible().catch(() => false)) return 'sign'

	const nextAction = await Promise.race([
		ignoreClosedError(
			connectButton.waitFor({ state: 'visible' }).then(() => 'connect' as const),
		),
		ignoreClosedError(
			signButton.waitFor({ state: 'visible' }).then(() => 'sign' as const),
		),
		page.waitForEvent('close').then(() => 'closed' as const),
	])

	return nextAction ?? 'closed'
}

const waitForMetaMaskSignAction = async (
	page: Page,
): Promise<'sign' | 'closed'> => {
	const signButton = getMetaMaskSignButton(page)

	if (await signButton.isVisible().catch(() => false)) return 'sign'

	const nextAction = await Promise.race([
		ignoreClosedError(
			signButton.waitFor({ state: 'visible' }).then(() => 'sign' as const),
		),
		page.waitForEvent('close').then(() => 'closed' as const),
	])

	return nextAction ?? 'closed'
}

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
): Promise<Page | null> => {
	const signButton = getMetaMaskSignButton(metaMaskPopup)

	if (metaMaskPopup.url().includes('signature-request')) {
		await signButton.waitFor({ state: 'visible' })
		return metaMaskPopup
	}

	const nextPopupPromise = context.waitForEvent('page', { timeout: 15_000 }).catch(
		() => null,
	)
	const samePopupState = await waitForMetaMaskSignAction(metaMaskPopup)
	if (samePopupState === 'sign') return metaMaskPopup

	const nextPopup = await nextPopupPromise
	if (!nextPopup) return null

	await nextPopup.waitForLoadState('domcontentloaded')
	await nextPopup.bringToFront()

	const nextPopupReady = await waitForMetaMaskSignAction(nextPopup)

	if (nextPopupReady === 'sign') return nextPopup

	return null
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
	const confirmBtn = getMetaMaskConnectButton(metaMaskPopup)

	// MetaMask extension popups start as blank pages — wait for content
	// to load before interacting (replaces global slowMo approach).
	await metaMaskPopup.waitForLoadState('domcontentloaded')
	await metaMaskPopup.bringToFront()
	const initialAction = await waitForMetaMaskAction(metaMaskPopup)
	if (initialAction === 'closed' || metaMaskPopup.isClosed()) return

	let signaturePopup: Page | null = metaMaskPopup

	// Handle Connect approval if shown
	if (initialAction === 'connect') {
		const signaturePopupPromise = waitForSignaturePopup(context, metaMaskPopup)
		await confirmBtn.scrollIntoViewIfNeeded()
		await confirmBtn.click()
		signaturePopup = await signaturePopupPromise
	}
	if (!signaturePopup || signaturePopup.isClosed()) return

	// Handle SIWE signature
	const signButton = getMetaMaskSignButton(signaturePopup)
	const popupClosed = signaturePopup
		.waitForEvent('close')
		.catch(() => undefined)

	const signReady = await ignoreClosedError(
		signButton.waitFor({ state: 'visible' }).then(() => true),
	)
	if (!signReady || signaturePopup.isClosed()) return

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
		console.warn(
			'[linkEOAWallet] /connect-wallet navigation timed out — closing popup for re-open',
		)
		if (!sdkPopup.isClosed()) await sdkPopup.close()
		return
	}

	// Step 6: Click "Approve" on /connect-wallet permission page
	const approveButton = sdkPopup.getByRole('button', { name: 'Approve' })
	await approveButton.waitFor({ state: 'visible' })
	await approveButton.click()
}
