import { FarcasterProvider } from ':core/communicator/FarcasterProvider.js'
import { shouldUseIframeMode } from ':core/communicator/iframeUtils.js'
import {
	AppMetadata,
	ConstructorOptions,
	PaymasterOptions,
	Preference,
	ProviderInterface
} from ':core/provider/interface.js'
import { loadTelemetryScript } from ':core/telemetry/initCCA.js'
import { store } from ':store/store.js'
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js'
import { validatePreferences } from ':util/validatePreferences.js'
import { BaseAccountProvider } from './BaseAccountProvider.js'
import { getInjectedProvider } from './getInjectedProvider.js'

export type CreateProviderOptions = Partial<AppMetadata> & {
	preference?: Preference
	paymasterOptions?: Record<number, PaymasterOptions>
}

/**
 * Create Startale AccountSDK instance with EIP-1193 compliant provider
 * @param params - Options to create a Startale account SDK instance.
 * @returns An SDK object with a getProvider method that returns an EIP-1193 compliant provider.
 */
export function createStartaleAccountSDK(params: CreateProviderOptions) {
	const options: ConstructorOptions = {
		metadata: {
			appName: params.appName || 'App',
			appLogoUrl: params.appLogoUrl || '',
			appChainIds: params.appChainIds || [],
		},
		preference: params.preference ?? {},
		paymasterOptions: params.paymasterOptions,
	}

	//  ====================================================================
	//  Set the options in the store and rehydrate the store from storage
	//  ====================================================================

	store.config.set(options)

	void store.persist.rehydrate()

	//  ====================================================================
	//  Validation and telemetry
	//  ====================================================================

	const useIframe = shouldUseIframeMode()

	// Skip COOP check in iframe mode (it's only relevant for popups)
	if (!useIframe) {
		void checkCrossOriginOpenerPolicy()
	}

	validatePreferences(options.preference)

	if (options.preference.telemetry !== false) {
		void loadTelemetryScript()
	}

	//  ====================================================================
	//  Return the provider
	//  ====================================================================

	let provider: ProviderInterface | null = null

	const sdk = {
		getProvider: () => {
			if (!provider) {
				if (useIframe) {
					provider = new FarcasterProvider()
				} else {
					provider = getInjectedProvider() ?? new BaseAccountProvider(options)
				}
			}

			return provider
		},
	}

	return sdk
}
