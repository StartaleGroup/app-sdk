/**
 * Wallet Fixture for dappwright/MetaMask integration
 *
 * Provides a worker-scoped wallet context for MetaMask E2E tests.
 * Overrides built-in `page` fixture as worker-scoped so that serial
 * tests share the same page instance and preserve authentication state.
 *
 * Use `createWalletFixture` to create a fixture with a custom seed env var.
 * The default export uses WALLET_SEED.
 */

import { test as base, type BrowserContext, type Page } from '@playwright/test'
import {
	bootstrap,
	type Dappwright,
	getWallet,
	MetaMaskWallet,
} from '@tenkeylabs/dappwright'

import { BASE_URL, SONEIUM_CHAIN } from '../lib/constants.js'
import { injectSCWUrl } from '../lib/helpers.js'

// Enable Playwright to attach to Chrome side panel (required for MetaMask 13+)
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = '1'

/**
 * Create a wallet fixture that reads the seed from the given env var.
 * Allows different test suites to use different MetaMask wallets
 * (e.g. WALLET_SEED for EOA tests, EOA_LINKED_WALLET_SEED for EOA Required).
 */
export const createWalletFixture = (seedEnvVar: string) =>
	base.extend<
		{ wallet: Dappwright; page: Page },
		{ walletContext: BrowserContext; workerPage: Page }
	>({
		walletContext: [
			async ({}, use) => {
				const seedPhrase = process.env[seedEnvVar]
				if (!seedPhrase)
					throw new Error(`${seedEnvVar} env var required`)
				const [, , context] = await bootstrap('', {
					wallet: 'metamask',
					version: MetaMaskWallet.recommendedVersion,
					seed: seedPhrase,
					headless: false,
				})

				const wallet = await getWallet('metamask', context)
				await wallet
					.addNetwork({
						networkName: SONEIUM_CHAIN.networkName,
						rpc: SONEIUM_CHAIN.rpc,
						chainId: SONEIUM_CHAIN.chainId,
						symbol: SONEIUM_CHAIN.symbol,
					})
					.catch(() => {})
				await wallet
					.switchNetwork(SONEIUM_CHAIN.networkName)
					.catch((err) => {
						console.warn(
							`[wallet.fixture/${seedEnvVar}] switchNetwork failed:`,
							err?.message,
						)
					})

				await use(context)
				await context.close()
			},
			{ scope: 'worker' },
		],

		workerPage: [
			async ({ walletContext }, use) => {
				const page = await walletContext.newPage()
				const originalGoto = page.goto.bind(page)
				page.goto = (
					url: string,
					options?: Parameters<Page['goto']>[1],
				) => {
					const resolvedUrl = url.startsWith('/')
						? `${BASE_URL}${url}`
						: url
					return originalGoto(resolvedUrl, options)
				}

				await injectSCWUrl(page)

				await use(page)
				await page.close()
			},
			{ scope: 'worker' },
		],

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

/** Default wallet fixture using WALLET_SEED */
export const test = createWalletFixture('WALLET_SEED')

export { expect } from '@playwright/test'
