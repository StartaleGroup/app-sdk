const ALLOWED_PARENT_ORIGINS = ['https://app.startale.com']

export function isAllowedOrigin(origin: string): boolean {
	if (ALLOWED_PARENT_ORIGINS.includes(origin)) return true
	try {
		const url = new URL(origin)
		return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
	} catch {
		return false
	}
}

export function getParentOrigin(): string {
	if (typeof document !== 'undefined' && document.referrer) {
		try {
			return new URL(document.referrer).origin
		} catch {
			// fallback
		}
	}
	return ''
}

export function isEmbeddedInIframe(): boolean {
	return typeof window !== 'undefined' && window.parent !== window
}

export function shouldUseIframeMode(): boolean {
	if (!isEmbeddedInIframe()) return false
	const origin = getParentOrigin()
	// If referrer is unavailable, still try iframe mode —
	// the IframeCommunicator handshake will validate the actual origin.
	if (origin === '') return true
	return isAllowedOrigin(origin)
}
