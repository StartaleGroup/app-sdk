/**
 * FarcasterProvider — EIP-1193 provider that delegates to Farcaster's ethProvider
 * communicated over comlink via postMessage to the host (Warpcast).
 *
 * Matches the @farcaster/miniapp-sdk ethereumProvider implementation:
 * - Uses ethProviderRequestV2 with v1 fallback
 * - Listens for ethProvider events via separate postMessage (not comlink)
 */

import type { Remote } from 'comlink'
import {
	ProviderEventEmitter,
	ProviderInterface,
	RequestArguments,
} from ':core/provider/interface.js'
import type { WireMiniAppHost } from './types.js'

export class FarcasterProvider
	extends ProviderEventEmitter
	implements ProviderInterface
{
	private readonly host: Remote<WireMiniAppHost>
	private cleanupListeners: (() => void) | null = null

	constructor(host: Remote<WireMiniAppHost>) {
		super()
		this.host = host
		this.setupEventListeners()
	}

	async request<T>(args: RequestArguments): Promise<T> {
		// wallet_connect is a Coinbase-specific method. Farcaster's ethProvider
		// doesn't support it, so we translate it into standard EIP-1193 calls.
		if (args.method === 'wallet_connect') {
			return this.handleWalletConnect() as T
		}

		return this.sendRequest<T>(args)
	}

	private async handleWalletConnect(): Promise<unknown> {
		const accounts = (await this.sendRequest<string[]>({
			method: 'eth_requestAccounts',
		}))
		const chainId = (await this.sendRequest<string>({
			method: 'eth_chainId',
		}))

		return {
			accounts: accounts.map((address: string) => ({
				address,
				capabilities: {},
			})),
			chainIds: [chainId],
		}
	}

	private async sendRequest<T>(args: RequestArguments): Promise<T> {
		const request = { method: args.method, params: args.params }

		try {
			const response = await this.host.ethProviderRequestV2(request)

			if (response.error) {
				const err = new Error(
					response.error.details ?? response.error.message ?? 'Unknown provider RPC error',
				) as Error & { code: number; data?: unknown }
				err.code = response.error.code
				err.data = response.error.data
				throw err
			}

			return response.result as T
		} catch (e) {
			// ethProviderRequestV2 not supported, fall back to v1
			if (
				e instanceof Error &&
				e.message.match(/cannot read property 'apply'/i)
			) {
				return (await this.host.ethProviderRequest(request)) as T
			}
			throw e
		}
	}

	async disconnect(): Promise<void> {
		this.removeEventListeners()
		this.emit('disconnect', {
			message: 'Disconnected from Farcaster',
			code: 4900,
			name: 'ProviderRpcError',
		})
	}

	/**
	 * Set up listeners for ethProvider events from the Farcaster host.
	 * These events come via separate postMessage (not comlink), matching
	 * the actual Farcaster SDK implementation.
	 */
	private setupEventListeners() {
		if (typeof window === 'undefined') return

		// Web iframe: ethProvider events come as postMessage with type 'frameEthProviderEvent'
		const webHandler = (event: MessageEvent) => {
			if (event.data?.type === 'frameEthProviderEvent') {
				const { event: eventName, params } = event.data
				if (eventName && params) {
					this.emit(eventName, ...params)
				}
			}
		}
		window.addEventListener('message', webHandler)

		// React Native WebView: ethProvider events come as 'FarcasterFrameEthProviderEvent'
		const rnHandler = (event: Event) => {
			if (event instanceof MessageEvent) {
				const { event: eventName, params } = event.data
				if (eventName && params) {
					this.emit(eventName, ...params)
				}
			}
		}
		if (typeof document !== 'undefined') {
			document.addEventListener('FarcasterFrameEthProviderEvent', rnHandler)
		}

		this.cleanupListeners = () => {
			window.removeEventListener('message', webHandler)
			if (typeof document !== 'undefined') {
				document.removeEventListener('FarcasterFrameEthProviderEvent', rnHandler)
			}
		}
	}

	private removeEventListeners() {
		this.cleanupListeners?.()
		this.cleanupListeners = null
	}

	readonly isFarcaster = true
}
