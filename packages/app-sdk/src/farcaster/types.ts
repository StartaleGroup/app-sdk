/**
 * Minimal Farcaster miniapp host wire protocol types.
 * Based on the actual @farcaster/miniapp-core WireMiniAppHost interface.
 */

export interface EthProviderRequest {
	method: string
	params?: readonly unknown[] | object
}

export interface EthProviderResponse {
	result?: unknown
	error?: {
		code: number
		message?: string
		details?: string
		data?: unknown
	}
}

/**
 * Subset of the Farcaster WireMiniAppHost interface exposed over comlink.
 * Only the ethProvider-related methods and detection properties are included.
 *
 * NOTE: `context` is a PROPERTY (not a method) in the Farcaster protocol.
 * Comlink proxies property access as a Promise, so accessing `host.context`
 * returns Promise<FarcasterContext>.
 */
export interface WireMiniAppHost {
	/** Context is a property, accessed via comlink as a Promise */
	context: FarcasterContext
	ethProviderRequestV2(request: EthProviderRequest): Promise<EthProviderResponse>
	/** V1 fallback for older hosts that don't support ethProviderRequestV2 */
	ethProviderRequest(request: EthProviderRequest): Promise<unknown>
}

export interface FarcasterContext {
	user?: {
		fid?: number
	}
}
