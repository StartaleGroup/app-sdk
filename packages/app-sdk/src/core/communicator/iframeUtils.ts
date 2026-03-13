export function isEmbeddedInIframe(): boolean {
	return typeof window !== 'undefined' && window.parent !== window
}

export function shouldUseIframeMode(): boolean {
	return isEmbeddedInIframe()
}
