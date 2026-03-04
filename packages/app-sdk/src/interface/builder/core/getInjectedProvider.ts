import { ProviderInterface } from ':core/provider/interface.js'

declare global {
	interface Window {
		ethereum?: InjectedProvider
	}
}

const TBA_PROVIDER_IDENTIFIER = 'isCoinbaseBrowser'

type InjectedProvider = ProviderInterface & {
	[TBA_PROVIDER_IDENTIFIER]?: boolean
}

export function getInjectedProvider(): InjectedProvider | null {
	let injectedProvider: InjectedProvider | undefined

	try {
		injectedProvider = window.top?.ethereum ?? window.ethereum
	} catch {
		// window.top access throws when inside a cross-origin iframe (e.g. Farcaster miniapp)
		injectedProvider = window.ethereum
	}

	if (injectedProvider?.[TBA_PROVIDER_IDENTIFIER]) {
		return injectedProvider
	}

	return null
}
