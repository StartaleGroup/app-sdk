/**
 * Farcaster miniapp environment detection utilities.
 * Matches the detection logic from @farcaster/miniapp-sdk.
 */

import { type Remote, wrap } from 'comlink'
import { createFarcasterEndpoint } from './endpoint.js'
import type { WireMiniAppHost } from './types.js'

const CONTEXT_TIMEOUT_MS = 1500

/** Cached host after successful detection */
let cachedHost: Remote<WireMiniAppHost> | null = null

/**
 * Synchronous pre-check: returns true if we *might* be in a Farcaster miniapp.
 * Checks for iframe embedding or React Native WebView.
 */
export function isMaybeFarcasterMiniApp(): boolean {
	if (typeof window === 'undefined') return false

	// React Native WebView
	if (window.ReactNativeWebView) return true

	try {
		// In an iframe (window !== window.parent)
		if (window !== window.parent) return true
	} catch {
		// Cross-origin iframe — also a candidate
		return true
	}

	return false
}

/**
 * Async confirmation: attempts to get Farcaster context from the host via comlink.
 * Returns the comlink-wrapped host if in a Farcaster miniapp, null otherwise.
 *
 * Matches the isInMiniApp() logic from @farcaster/miniapp-sdk/sdk.js:
 * - `host.context` is a property access; comlink proxies it as a Promise
 */
export async function confirmFarcasterMiniApp(): Promise<Remote<WireMiniAppHost> | null> {
	if (cachedHost) return cachedHost

	try {
		const endpoint = createFarcasterEndpoint()
		const host = wrap<WireMiniAppHost>(endpoint)

		const isInMiniApp = await Promise.race([
			host.context.then((ctx: unknown) => !!ctx),
			new Promise<false>((resolve) =>
				setTimeout(() => resolve(false), CONTEXT_TIMEOUT_MS),
			),
		]).catch(() => false)

		if (isInMiniApp) {
			cachedHost = host
			return host
		}
		return null
	} catch {
		return null
	}
}
