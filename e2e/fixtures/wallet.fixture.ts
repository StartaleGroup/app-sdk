/**
 * Wallet Fixture for dappwright/MetaMask integration
 *
 * Provides a worker-scoped wallet context for MetaMask E2E tests.
 * Overrides built-in `page` fixture as worker-scoped so that serial
 * tests share the same page instance and preserve authentication state.
 */

import { test as base, type BrowserContext, type Page } from '@playwright/test'
import {
	bootstrap,
	type Dappwright,
	getWallet,
	MetaMaskWallet,
} from '@tenkeylabs/dappwright'

import { BASE_URL, SONEIUM_CHAIN } from '../lib/constants.js'

// Enable Playwright to attach to Chrome side panel (required for MetaMask 13+)
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1'

export const test = base.extend<
	{ wallet: Dappwright; page: Page },
	{ walletContext: BrowserContext; workerPage: Page }
>({
	walletContext: [
		async ({}, use) => {
			const seedPhrase = process.env.WALLET_SEED
			if (!seedPhrase) throw new Error('WALLET_SEED env var required')
			const [, , context] = await bootstrap('', {
				wallet: 'metamask',
				version: MetaMaskWallet.recommendedVersion,
				seed: seedPhrase,
				headless: false,
			})

			const wallet = await getWallet('metamask', context)
			// addNetwork may fail if network already exists or MetaMask UI is unstable
			await wallet
				.addNetwork({
					networkName: SONEIUM_CHAIN.networkName,
					rpc: SONEIUM_CHAIN.rpc,
					chainId: SONEIUM_CHAIN.chainId,
					symbol: SONEIUM_CHAIN.symbol,
				})
				.catch(() => {})
			await wallet.switchNetwork(SONEIUM_CHAIN.networkName).catch((err) => {
				console.warn('[wallet.fixture] switchNetwork failed:', err?.message)
			})

			await use(context)
			await context.close()
		},
		{ scope: 'worker' },
	],

	// Worker-scoped page created from dappwright context.
	// Serial tests share this instance to preserve authentication state.
	workerPage: [
		async ({ walletContext }, use) => {
			const page = await walletContext.newPage()
			const originalGoto = page.goto.bind(page)
			// dappwright context does not inherit Playwright's baseURL — patch goto
			// so relative URLs are resolved against BASE_URL, matching default behavior.
			page.goto = (url: string, options?: Parameters<Page['goto']>[1]) => {
				const resolvedUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url
				return originalGoto(resolvedUrl, options)
			}
			await use(page)
			await page.close()
		},
		{ scope: 'worker' },
	],

	// Override built-in page to expose the worker-scoped workerPage.
	page: async ({ workerPage }, use) => {
		await use(workerPage)
	},

	context: async ({ walletContext }, use) => {
		await use(walletContext)
	},

	wallet: async ({ walletContext }, use) => {
		const w = await getWallet('metamask', walletContext)
		await use(w)
	},
})

export { expect } from '@playwright/test'
