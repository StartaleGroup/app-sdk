/**
 * FarcasterDetectingProvider — auto-detecting wrapper that lazily resolves
 * to either FarcasterProvider or BaseAccountProvider on first request().
 */

import {
	ConstructorOptions,
	ProviderEventEmitter,
	ProviderInterface,
	RequestArguments,
} from ':core/provider/interface.js'
import { BaseAccountProvider } from ':interface/builder/core/BaseAccountProvider.js'
import { confirmFarcasterMiniApp } from './detect.js'
import { FarcasterProvider } from './provider.js'

export class FarcasterDetectingProvider
	extends ProviderEventEmitter
	implements ProviderInterface
{
	private readonly options: ConstructorOptions
	private resolvedProvider: ProviderInterface | null = null
	private detecting: Promise<ProviderInterface> | null = null

	constructor(options: ConstructorOptions) {
		super()
		this.options = options
	}

	async request<T>(args: RequestArguments): Promise<T> {
		const provider = await this.resolve()
		return provider.request(args) as Promise<T>
	}

	async disconnect(): Promise<void> {
		if (this.resolvedProvider) {
			return this.resolvedProvider.disconnect()
		}
	}

	private async resolve(): Promise<ProviderInterface> {
		if (this.resolvedProvider) return this.resolvedProvider

		// Deduplicate concurrent detection attempts
		if (!this.detecting) {
			this.detecting = this.detect()
		}

		return this.detecting
	}

	private async detect(): Promise<ProviderInterface> {
		try {
			const host = await confirmFarcasterMiniApp()
			if (host) {
				this.resolvedProvider = new FarcasterProvider(host)
			} else {
				this.resolvedProvider = new BaseAccountProvider(this.options)
			}
		} catch {
			this.resolvedProvider = new BaseAccountProvider(this.options)
		}

		// Forward events from the resolved provider to listeners on this wrapper
		this.forwardEvents(this.resolvedProvider)

		return this.resolvedProvider
	}

	private forwardEvents(provider: ProviderInterface) {
		const events = [
			'connect',
			'disconnect',
			'chainChanged',
			'accountsChanged',
		] as const
		for (const event of events) {
			provider.on(event, (data: unknown) => {
				// biome-ignore lint/suspicious/noExplicitAny: event forwarding
				this.emit(event, data as any)
			})
		}
	}
}
