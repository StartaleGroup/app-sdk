import type { Page } from '@playwright/test'

import { approveMetaMaskSignin } from './metamask-popup.js'

/**
 * Login with MetaMask via the SDK popup.
 *
 * Flow:
 * 1. Click "Connect a wallet" button
 * 2. Click MetaMask in wallet selection modal
 * 3. Approve Connect + SIWE in the MetaMask popup(s)
 * 4. Click "Approve" on the connect-wallet permission screen
 *
 * Relies on config-level actionTimeout (60s).
 */
export const loginWithMetaMask = async (sdkPopup: Page): Promise<void> => {
	await sdkPopup
		.getByRole('button', { name: 'Connect a wallet' })
		.click()

	// Listen before clicking: MetaMask can open its popup before a later listener attaches.
	const metaMaskPopupPromise = sdkPopup.context().waitForEvent('page')
	// 'metamask MetaMask' = icon alt text ('metamask') + button label ('MetaMask')
	await sdkPopup.getByRole('button', { name: 'metamask MetaMask' }).click()
	await approveMetaMaskSignin(sdkPopup.context(), await metaMaskPopupPromise)

	await sdkPopup.bringToFront()
	await sdkPopup.getByRole('button', { name: 'Approve' }).click()
}
