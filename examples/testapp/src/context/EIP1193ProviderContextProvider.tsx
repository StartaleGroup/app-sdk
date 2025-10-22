import { createBaseAccountSDK as createBaseAccountSDKHEAD } from '@startale/app-sdk'
import {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { soneium, soneiumMinato } from 'viem/chains'
import { DisconnectedAlert } from '../components/alerts/DisconnectedAlert'
import { useEventListeners } from '../hooks/useEventListeners'
import { useSpyOnDisconnectedError } from '../hooks/useSpyOnDisconnectedError'
import { scwUrls } from '../store/config'
import { useConfig } from './ConfigContextProvider'

type EIP1193ProviderContextProviderProps = {
	children: ReactNode
}

type EIP1193ProviderContextType = {
	sdk: ReturnType<typeof createBaseAccountSDKHEAD>
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
		const paymasterId = process.env.NEXT_PUBLIC_PAYMASTER_ID
		const paymasterApiKey = process.env.NEXT_PUBLIC_PAYMASTER_API_KEY
		const bundlerApiKey = process.env.NEXT_PUBLIC_BUNDLER_API_KEY

		const sdkParams = {
			appName: 'Startale app SDK Playground',
			appLogoUrl: 'https://startale.com/image/symbol.png',
			appChainIds: [soneiumMinato.id, soneium.id],
			preference: {
				attribution: config.attribution,
				walletUrl: scwUrl ?? scwUrls[0],
				telemetry: false,
			},
			subAccounts: subAccountsConfig,
			paymasterId,
			paymasterApiKey,
			bundlerApiKey,
			rpcUrls: {
				[soneium.id]: process.env.NEXT_PUBLIC_SONEIUM_RPC_URL,
				[soneiumMinato.id]: process.env.NEXT_PUBLIC_MINATO_RPC_URL,
			},
		}

		const sdk = createBaseAccountSDKHEAD(sdkParams)

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
