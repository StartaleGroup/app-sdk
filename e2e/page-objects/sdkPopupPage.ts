import type { Page } from '@playwright/test'

/**
 * Page object for SDK auth popup (app.startale.com).
 *
 * Selectors are based on actual DOM inspection via Playwright MCP:
 * - Sign up page: "Log in with Google", "Log in with LINE", "Connect a wallet"
 * - Wallet modal: "metamask MetaMask" button
 * - Approval page: "Approve" button
 * - Sign page: "Sign" button
 * - Confirm page: "Confirm" button
 * - Transaction page: "Send" button
 */
export const sdkPopupPage = (page: Page) => ({
	// Auth buttons on /create-account
	googleSignInButton: page.getByRole('button', { name: 'Log in with Google' }),
	lineSignInButton: page.getByRole('button', { name: 'Log in with LINE' }),
	connectWalletButton: page.getByRole('button', { name: 'Connect a wallet' }),

	// Wallet selection modal
	metamaskOption: page.getByRole('button', { name: 'metamask MetaMask' }),

	// Action buttons on approval/signing/confirmation screens
	approveButton: page.getByRole('button', { name: 'Approve' }),
	signButton: page.getByRole('button', { name: 'Sign' }),
	confirmButton: page.getByRole('button', { name: 'Confirm' }),
	sendButton: page.getByRole('button', { name: 'Send' }),
	cancelButton: page.getByRole('button', { name: 'Cancel' }),
})
