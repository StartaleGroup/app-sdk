import { createStartaleAccountSDK as createStartaleAccountSDKHEAD } from '@startale/app-sdk'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as EventListeners from '../hooks/useEventListeners'
import * as DisconnectedError from '../hooks/useSpyOnDisconnectedError'
import * as CleanupUtils from '../utils/cleanupSDKLocalStorage'
import * as ConfigContext from './ConfigContextProvider'
import { scwUrls } from '../store/config'
import {
	EIP1193ProviderContextProvider,
	useEIP1193Provider,
} from './EIP1193ProviderContextProvider'

vi.mock('@startale/app-sdk', () => ({
	createStartaleAccountSDK: vi.fn(() => ({
		getProvider: vi.fn(() => mockProvider),
	})),
}))

const mockProvider = {
	on: vi.fn(),
	removeListener: vi.fn(),
	request: vi.fn(),
}

const mockAddEventListeners = vi.fn()
const mockRemoveEventListeners = vi.fn()
const mockSpyOnDisconnectedError = vi.fn()

function TestConsumer() {
	const context = useEIP1193Provider()
	return (
		<div>
			<div data-testid="sdk-exists">
				{context.sdk ? 'SDK exists' : 'No SDK'}
			</div>
			<div data-testid="provider-exists">
				{context.provider ? 'Provider exists' : 'No Provider'}
			</div>
		</div>
	)
}

describe('EIP1193ProviderContextProvider', () => {
	beforeEach(() => {
		vi.spyOn(ConfigContext, 'useConfig').mockReturnValue({
			version: 'HEAD',
			scwUrl: scwUrls[0],
			config: {
				attribution: { dataSuffix: '0xtestattribution' },
				telemetry: false,
			},
			setSDKVersion: vi.fn(),
			setScwUrlAndSave: vi.fn(),
			setConfig: vi.fn(),
			subAccountsConfig: {
				enableAutoSubAccounts: true,
			},
			setSubAccountsConfig: vi.fn(),
		})

		vi.spyOn(EventListeners, 'useEventListeners').mockReturnValue({
			addEventListeners: mockAddEventListeners,
			removeEventListeners: mockRemoveEventListeners,
		})

		vi.spyOn(DisconnectedError, 'useSpyOnDisconnectedError').mockReturnValue({
			spyOnDisconnectedError: mockSpyOnDisconnectedError,
			isOpen: false,
			onClose: vi.fn(),
		})

		vi.spyOn(CleanupUtils, 'cleanupSDKLocalStorage').mockImplementation(
			vi.fn(),
		)
	})

	afterEach(() => {
		cleanup()
		vi.resetAllMocks()
	})

	it('initializes SDK with HEAD version when version is HEAD', () => {
		render(
			<EIP1193ProviderContextProvider>
				<TestConsumer />
			</EIP1193ProviderContextProvider>,
		)

		expect(createStartaleAccountSDKHEAD).toHaveBeenCalledWith(
			expect.objectContaining({
				appName: 'Startale app SDK Playground',
				appLogoUrl: 'https://startale.com/image/symbol.png',
				appChainIds: [1946, 1868],
				preference: {
					attribution: { dataSuffix: '0xtestattribution' },
					walletUrl: scwUrls[0],
					telemetry: false,
				},
				subAccounts: {
					enableAutoSubAccounts: true,
				},
			}),
		)
		expect(screen.getByTestId('sdk-exists')).toBeTruthy()
		expect(screen.getByTestId('provider-exists')).toBeTruthy()
		expect(mockAddEventListeners).toHaveBeenCalledWith(mockProvider)
		expect(mockSpyOnDisconnectedError).toHaveBeenCalledWith(mockProvider)
	})

	it('initializes SDK with latest version when version is not HEAD', () => {
		vi.spyOn(ConfigContext, 'useConfig').mockReturnValue({
			version: 'HEAD',
			scwUrl: scwUrls[0],
			config: {
				attribution: { dataSuffix: '0xtestattribution' },
				telemetry: false,
			},
			subAccountsConfig: {
				enableAutoSubAccounts: true,
			},
			setSDKVersion: vi.fn(),
			setScwUrlAndSave: vi.fn(),
			setConfig: vi.fn(),
			setSubAccountsConfig: vi.fn(),
		})

		render(
			<EIP1193ProviderContextProvider>
				<TestConsumer />
			</EIP1193ProviderContextProvider>,
		)

		expect(createStartaleAccountSDKHEAD).toHaveBeenCalledWith(
			expect.objectContaining({
				appName: 'Startale app SDK Playground',
				appLogoUrl: 'https://startale.com/image/symbol.png',
				appChainIds: [1946, 1868],
				preference: {
					attribution: { dataSuffix: '0xtestattribution' },
					walletUrl: scwUrls[0],
					telemetry: false,
				},
				subAccounts: {
					enableAutoSubAccounts: true,
				},
			}),
		)
	})

	it('cleans up event listeners on unmount', () => {
		const { unmount } = render(
			<EIP1193ProviderContextProvider>
				<TestConsumer />
			</EIP1193ProviderContextProvider>,
		)

		unmount()
		expect(mockRemoveEventListeners).toHaveBeenCalledWith(mockProvider)
	})
})
