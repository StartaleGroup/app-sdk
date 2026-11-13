/**
 * MetaMask notification popup handling shared by EOA login and linking flows.
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
export const approveMetaMaskSignin = async (
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
