import { createStartaleAccountSDK as createStartaleAccountSDKHEAD } from '@startale/app-sdk'
import {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { mainnet, soneium, soneiumMinato } from 'viem/chains'
import { DisconnectedAlert } from '../components/alerts/DisconnectedAlert'
import { useEventListeners } from '../hooks/useEventListeners'
import { useSpyOnDisconnectedError } from '../hooks/useSpyOnDisconnectedError'
import { scwUrls } from '../store/config'
import { useConfig } from './ConfigContextProvider'

type EIP1193ProviderContextProviderProps = {
	children: ReactNode
}

type EIP1193ProviderContextType = {
	sdk: ReturnType<typeof createStartaleAccountSDKHEAD>
	provider: ReturnType<EIP1193ProviderContextType['sdk']['getProvider']>
}

const EIP1193ProviderContext = createContext<EIP1193ProviderContextType | null>(
	null,
)

export function EIP1193ProviderContextProvider({
	children,
}: EIP1193ProviderContextProviderProps) {
	const { scwUrl, config, subAccountsConfig } = useConfig()
	const { addEventListeners, removeEventListeners } = useEventListeners()
	const {
		spyOnDisconnectedError,
		isOpen: isDisconnectedAlertOpen,
		onClose: onDisconnectedAlertClose,
	} = useSpyOnDisconnectedError()

	const [sdk, setSdk] = useState(null)
	const [provider, setProvider] = useState(null)

	useEffect(() => {
		// Paymaster URL points at this app's same-origin proxy route
		// (`/api/paymaster/<chainId>`). The SCS API key and paymaster ID stay
		// server-side — never exposed to the browser. See
		// `src/pages/api/paymaster/[chainId].page.ts` and `.env.local.example`.
		const origin =
			typeof window !== 'undefined' ? window.location.origin : ''
		const paymasterUrl = (chainId: number) =>
			`${origin}/api/paymaster/${chainId}`

		const sdkParams = {
			appName: 'Startale app SDK Playground',
			appLogoUrl: 'https://startale.com/image/symbol.png',
			appChainIds: [soneium.id, soneiumMinato.id, mainnet.id],
			preference: {
				attribution: config.attribution,
				walletUrl: scwUrl ?? scwUrls[0],
				telemetry: false,
				eoaRequired: config.eoaRequired ?? false,
				authType: undefined,
			},
			subAccounts: subAccountsConfig,
			// `id` is read by the SDK but the proxy injects the paymaster ID
			// into the upstream SCS request itself, so we leave it empty.
			// SCS sponsors Soneium networks only — mainnet (ETH) is omitted.
			paymasterOptions: {
				[soneium.id]: { url: paymasterUrl(soneium.id), id: '' },
				[soneiumMinato.id]: {
					url: paymasterUrl(soneiumMinato.id),
					id: '',
				},
			},
		}

		const sdk = createStartaleAccountSDKHEAD(sdkParams)

		setSdk(sdk)

		const newProvider = sdk.getProvider()
		// biome-ignore lint/suspicious/noConsole: developer feedback
		console.log('Provider:', newProvider)

		addEventListeners(newProvider)
		spyOnDisconnectedError(newProvider)

		// @ts-ignore convenience for testing
		window.ethereum = newProvider
		setProvider(newProvider)

		return () => {
			removeEventListeners(newProvider)
		}
	}, [
		scwUrl,
		config,
		subAccountsConfig,
		spyOnDisconnectedError,
		addEventListeners,
		removeEventListeners,
	])

	const value = useMemo(
		() => ({
			sdk,
			provider,
		}),
		[sdk, provider],
	)

	return (
		<EIP1193ProviderContext.Provider value={value}>
			<>
				{children}
				<DisconnectedAlert
					isOpen={isDisconnectedAlertOpen}
					onClose={onDisconnectedAlertClose}
				/>
			</>
		</EIP1193ProviderContext.Provider>
	)
}

export function useEIP1193Provider() {
	const context = useContext(EIP1193ProviderContext)
	if (context === undefined) {
		throw new Error(
			'useEIP1193Provider must be used within a EIP1193ProviderContextProvider',
		)
	}
	return context
}
