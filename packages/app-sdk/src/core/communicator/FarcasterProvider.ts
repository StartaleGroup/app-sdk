import { standardErrors } from ':core/error/errors.js'
import {
	ProviderEventEmitter,
	ProviderInterface,
	RequestArguments,
} from ':core/provider/interface.js'
import { sdk as farcasterSdk } from '@farcaster/miniapp-sdk'
import { Address } from 'viem'

type EIP1193Provider = {
	request(args: RequestArguments): Promise<unknown>
	on(event: string, listener: (...args: unknown[]) => void): void
	removeListener(event: string, listener: (...args: unknown[]) => void): void
}

const EIP_1193_EVENTS = ['accountsChanged', 'chainChanged', 'connect', 'disconnect'] as const
const INIT_TIMEOUT_MS = 5_000

/**
 * Wraps the Farcaster miniapp-sdk EIP-1193 provider as a ProviderInterface.
 *
 * Lazy-initialised: the first `request()` call triggers `sdk.actions.ready()`
 * and acquires the Ethereum provider from `sdk.wallet.getEthereumProvider()`.
 */
export class FarcasterProvider extends ProviderEventEmitter implements ProviderInterface {
	private farcasterProvider: EIP1193Provider | null = null
	private initPromise: Promise<void> | null = null
	private eventForwarders = new Map<string, (...args: unknown[]) => void>()

	private async init(): Promise<void> {
		if (this.farcasterProvider) return
		if (this.initPromise) return this.initPromise

		this.initPromise = (async () => {
			try {
				farcasterSdk.actions.ready()

				const provider = await withTimeout(
					farcasterSdk.wallet.getEthereumProvider(),
					INIT_TIMEOUT_MS,
					'FarcasterProvider init timed out — host may not be ready',
				)
				this.farcasterProvider = provider as EIP1193Provider

				for (const event of EIP_1193_EVENTS) {
					const forwarder = (...args: unknown[]) => {
						this.emit(event, ...args)
					}
					this.eventForwarders.set(event, forwarder)
					this.farcasterProvider.on(event, forwarder)
				}
			} catch (error) {
				// Clear so the next request() retries init
				this.initPromise = null
				throw error
			}
		})()

		return this.initPromise
	}

	async request(args: RequestArguments): Promise<unknown> {
		await this.init()

		if (args.method === 'wallet_connect') {
			return this.handleWalletConnect(args)
		}

		return this.farcasterProvider!.request(args)
	}

	/**
	 * Translates the proprietary `wallet_connect` RPC into standard EIP-1193
	 * calls so the startale-connector gets the response shape it expects.
	 */
	private async handleWalletConnect(args: RequestArguments): Promise<unknown> {
		const accounts = (await this.farcasterProvider!.request({
			method: 'eth_requestAccounts',
		})) as Address[]

		const chainId = (await this.farcasterProvider!.request({
			method: 'eth_chainId',
		})) as number

		const params = args.params as [{ chainIds?: string[] }] | undefined
		const requestedChainIds = params?.[0]?.chainIds

		return {
			accounts: accounts.map((address) => ({ address })),
			chainIds: [
				chainId,
				...(requestedChainIds ?? []).filter((id) => id !== String(chainId)),
			],
		}
	}

	async disconnect(): Promise<void> {
		if (this.farcasterProvider) {
			for (const [event, forwarder] of this.eventForwarders) {
				this.farcasterProvider.removeListener(event, forwarder)
			}
			this.eventForwarders.clear()
		}

		this.farcasterProvider = null
		this.initPromise = null

		this.emit(
			'disconnect',
			standardErrors.provider.disconnected('User initiated disconnection'),
		)
	}

	async close(): Promise<void> {
		farcasterSdk.actions.close()
	}
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms)
		promise.then(
			(value) => { clearTimeout(timer); resolve(value) },
			(error) => { clearTimeout(timer); reject(error) },
		)
	})
}
