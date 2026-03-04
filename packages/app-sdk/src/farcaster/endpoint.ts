/**
 * Creates a comlink-compatible endpoint for communicating with the Farcaster host.
 * Matches the actual @farcaster/miniapp-sdk endpoint implementation.
 *
 * NOTE: This is a function (not a singleton) because our SDK may be loaded
 * during SSR where `window` is undefined. Creating the endpoint lazily ensures
 * we always get the real endpoint on the client.
 */

import { type Endpoint, windowEndpoint } from 'comlink'

declare global {
	interface Window {
		ReactNativeWebView?: {
			postMessage(message: string): void
		}
	}
}

/** SSR-safe noop endpoint */
const mockEndpoint: Endpoint = {
	postMessage() {
		// noop
	},
	addEventListener: () => {
		// noop
	},
	removeEventListener: () => {
		// noop
	},
}

/**
 * React Native WebView endpoint.
 * Uses 'FarcasterFrameCallback' event (matching the actual Farcaster SDK).
 */
const webViewEndpoint: Endpoint = {
	postMessage: (data: unknown) => {
		window.ReactNativeWebView?.postMessage(JSON.stringify(data))
	},
	addEventListener: (
		_type: string,
		listener: EventListenerOrEventListenerObject,
		...args: unknown[]
	) => {
		document.addEventListener(
			'FarcasterFrameCallback',
			listener,
			...(args as []),
		)
	},
	removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
		document.removeEventListener('FarcasterFrameCallback', listener)
	},
}

export function createFarcasterEndpoint(): Endpoint {
	if (typeof window === 'undefined') {
		return mockEndpoint
	}

	if (window.ReactNativeWebView) {
		return webViewEndpoint
	}

	return windowEndpoint(window?.parent ?? window)
}
