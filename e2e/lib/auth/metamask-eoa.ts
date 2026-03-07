import type { Page } from '@playwright/test'
import type { Dappwright } from '@tenkeylabs/dappwright'

/**
 * Login with MetaMask via the SDK popup.
 *
 * Flow:
 * 1. Click "Connect a wallet" button
 * 2. Click MetaMask in wallet selection modal
 * 3. Sign in via dappwright
 * 4. Click "Approve" on the connect-wallet permission screen
 *
 * Relies on config-level actionTimeout (60s).
 */
export const loginWithMetaMask = async (
	sdkPopup: Page,
	wallet: Dappwright,
): Promise<void> => {
	await sdkPopup
		.getByRole('button', { name: 'Connect a wallet' })
		.click()

	// 'metamask MetaMask' = icon alt text ('metamask') + button label ('MetaMask')
	await sdkPopup.getByRole('button', { name: 'metamask MetaMask' }).click()

	// wallet.signin() may fail on first attempt due to MetaMask UI initialization delay.
	// Wait 10s before retrying to give MetaMask time to fully initialize.
	await wallet
		.signin()
		.catch(
			() =>
				new Promise<void>((resolve) => setTimeout(resolve, 10_000)).then(
					() => wallet.signin(),
				),
		)

	await sdkPopup.getByRole('button', { name: 'Approve' }).click()
}
