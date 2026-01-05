import * as telemetryModule from ':core/telemetry/initCCA.js'
import { store } from ':store/store.js'
import * as checkCrossOriginModule from ':util/checkCrossOriginOpenerPolicy.js'
import * as validatePreferencesModule from ':util/validatePreferences.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BaseAccountProvider } from './BaseAccountProvider.js'
import {
	CreateProviderOptions,
	createStartaleAccountSDK,
} from './createStartaleAccountSDK.js'
import * as getInjectedProviderModule from './getInjectedProvider.js'

// Mock all dependencies
vi.mock(':store/store.js', () => ({
	store: {
		subAccountsConfig: {
			set: vi.fn(),
		},
		config: {
			set: vi.fn(),
		},
		persist: {
			rehydrate: vi.fn(),
		},
	},
}))

vi.mock(':core/telemetry/initCCA.js', () => ({
	loadTelemetryScript: vi.fn(),
}))

vi.mock(':util/checkCrossOriginOpenerPolicy.js', () => ({
	checkCrossOriginOpenerPolicy: vi.fn(),
}))

vi.mock(':util/validatePreferences.js', () => ({
	validatePreferences: vi.fn(),
	validateSubAccount: vi.fn(),
}))

vi.mock('./BaseAccountProvider.js', () => ({
	BaseAccountProvider: vi.fn(),
}))

vi.mock('./getInjectedProvider.js', () => ({
	getInjectedProvider: vi.fn(),
}))

const mockStore = store as any
const mockLoadTelemetryScript = telemetryModule.loadTelemetryScript as any
const mockCheckCrossOriginOpenerPolicy =
	checkCrossOriginModule.checkCrossOriginOpenerPolicy as any
const mockValidatePreferences =
	validatePreferencesModule.validatePreferences as any
const mockValidateSubAccount =
	validatePreferencesModule.validateSubAccount as any
const mockBaseAccountProvider = BaseAccountProvider as any
const mockGetInjectedProvider =
	getInjectedProviderModule.getInjectedProvider as any

describe('createProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockBaseAccountProvider.mockReturnValue({
			mockProvider: true,
		})
		// Default: getInjectedProvider returns null to test BaseAccountProvider fallback
		mockGetInjectedProvider.mockReturnValue(null)
	})

	describe('Basic functionality', () => {
		it('should create a provider with minimal parameters', () => {
			const result = createStartaleAccountSDK({}).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith({
				metadata: {
					appName: 'App',
					appLogoUrl: '',
					appChainIds: [],
				},
				preference: {},
				paymasterUrls: undefined,
			})

			expect(result).toEqual({ mockProvider: true })
		})

		it('should create a provider with custom app metadata', () => {
			const params: CreateProviderOptions = {
				appName: 'Test App',
				appLogoUrl: 'https://example.com/logo.png',
				appChainIds: [1, 137],
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith({
				metadata: {
					appName: 'Test App',
					appLogoUrl: 'https://example.com/logo.png',
					appChainIds: [1, 137],
				},
				preference: {},
				paymasterUrls: undefined,
			})
		})

		it('should create a provider with custom preference', () => {
			const params: CreateProviderOptions = {
				preference: {
					attribution: { auto: true },
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith({
				metadata: {
					appName: 'App',
					appLogoUrl: '',
					appChainIds: [],
				},
				preference: {
					attribution: { auto: true },
				},
				paymasterUrls: undefined,
			})
		})

		it('should create a provider with paymaster URLs', () => {
			const params: CreateProviderOptions = {
				paymasterUrls: {
					1: 'https://paymaster.example.com',
					137: 'https://paymaster-polygon.example.com',
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith(
				expect.objectContaining({
					paymasterUrls: {
						1: 'https://paymaster.example.com',
						137: 'https://paymaster-polygon.example.com',
					},
				}),
			)
		})
	})

	describe('Sub-account configuration', () => {
		it('should set sub-account configuration when provided', () => {
			const mockToOwnerAccount = vi.fn()
			const params: CreateProviderOptions = {
				subAccounts: {
					toOwnerAccount: mockToOwnerAccount,
					// @ts-expect-error - enableAutoSubAccounts is not officially supported yet
					enableAutoSubAccounts: true,
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount)
			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: mockToOwnerAccount,
				enableAutoSubAccounts: true,
				unstable_enableAutoSpendPermissions: true,
			})
		})

		it('should handle partial sub-account configuration', () => {
			const params: CreateProviderOptions = {
				subAccounts: {
					// @ts-expect-error - enableAutoSubAccounts is not officially supported yet
					enableAutoSubAccounts: true,
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockValidateSubAccount).not.toHaveBeenCalled()
			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: undefined,
				enableAutoSubAccounts: true,
				unstable_enableAutoSpendPermissions: true,
			})
		})

		it('should handle empty sub-account configuration', () => {
			const params: CreateProviderOptions = {
				subAccounts: undefined,
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: undefined,
				enableAutoSubAccounts: undefined,
				unstable_enableAutoSpendPermissions: true,
			})
		})

		it('should set unstable_enableAutoSpendPermissions when provided', () => {
			const mockToOwnerAccount = vi.fn()
			const params: CreateProviderOptions = {
				subAccounts: {
					toOwnerAccount: mockToOwnerAccount,
					// @ts-expect-error - enableAutoSubAccounts is not officially supported yet
					enableAutoSubAccounts: true,
					unstable_enableAutoSpendPermissions: true,
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount)
			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: mockToOwnerAccount,
				enableAutoSubAccounts: true,
				unstable_enableAutoSpendPermissions: true,
			})
		})

		it('should default unstable_enableAutoSpendPermissions to true when not provided', () => {
			const mockToOwnerAccount = vi.fn()
			const params: CreateProviderOptions = {
				subAccounts: {
					toOwnerAccount: mockToOwnerAccount,
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: mockToOwnerAccount,
				enableAutoSubAccounts: undefined,
				unstable_enableAutoSpendPermissions: true,
			})
		})

		it('should default unstable_enableAutoSpendPermissions to true when explicitly set to undefined', () => {
			const mockToOwnerAccount = vi.fn()
			const params: CreateProviderOptions = {
				subAccounts: {
					toOwnerAccount: mockToOwnerAccount,
					unstable_enableAutoSpendPermissions: undefined,
				},
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: mockToOwnerAccount,
				enableAutoSubAccounts: undefined,
				unstable_enableAutoSpendPermissions: true,
			})
		})
	})

	describe('Store configuration', () => {
		it('should set store configuration', () => {
			const params: CreateProviderOptions = {
				appName: 'Test App',
				preference: {},
				paymasterUrls: { 1: 'https://paymaster.example.com' },
			}

			createStartaleAccountSDK(params).getProvider()

			expect(mockStore.config.set).toHaveBeenCalledWith({
				metadata: {
					appName: 'Test App',
					appLogoUrl: '',
					appChainIds: [],
				},
				preference: {},
				paymasterUrls: { 1: 'https://paymaster.example.com' },
			})
		})

		it('should rehydrate store from storage', () => {
			createStartaleAccountSDK({}).getProvider()

			expect(mockStore.persist.rehydrate).toHaveBeenCalled()
		})
	})

	describe('Validation', () => {
		it('should validate preferences', () => {
			const preference = { telemetry: true }
			createStartaleAccountSDK({ preference }).getProvider()

			expect(mockValidatePreferences).toHaveBeenCalledWith(preference)
		})

		it('should validate sub-account when toOwnerAccount is provided', () => {
			const mockToOwnerAccount = vi.fn()
			createStartaleAccountSDK({
				subAccounts: { toOwnerAccount: mockToOwnerAccount },
			}).getProvider()

			expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount)
		})

		it('should check cross-origin opener policy', () => {
			createStartaleAccountSDK({}).getProvider()

			expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled()
		})
	})

	describe('Telemetry', () => {
		it('should load telemetry script when telemetry is not disabled', () => {
			createStartaleAccountSDK({
				preference: { telemetry: true },
			}).getProvider()

			expect(mockLoadTelemetryScript).toHaveBeenCalled()
		})

		it('should load telemetry script when telemetry is undefined (default)', () => {
			createStartaleAccountSDK({
				preference: {},
			}).getProvider()

			expect(mockLoadTelemetryScript).toHaveBeenCalled()
		})

		it('should not load telemetry script when telemetry is disabled', () => {
			createStartaleAccountSDK({
				preference: { telemetry: false },
			}).getProvider()

			expect(mockLoadTelemetryScript).not.toHaveBeenCalled()
		})
	})

	describe('Error handling', () => {
		it('should handle sub-account validation errors', () => {
			mockValidateSubAccount.mockImplementationOnce(() => {
				throw new Error('Invalid sub-account function')
			})

			expect(() => {
				createStartaleAccountSDK({
					subAccounts: { toOwnerAccount: 'not-a-function' as any },
				}).getProvider()
			}).toThrow('Invalid sub-account function')
		})
	})

	describe('Provider fallback behavior', () => {
		it('should use injected provider when getInjectedProvider returns a provider', () => {
			const mockInjectedProvider = {
				request: vi.fn(),
				isCoinbaseBrowser: true,
				type: 'injected',
			}
			mockGetInjectedProvider.mockReturnValue(mockInjectedProvider)

			const result = createStartaleAccountSDK({}).getProvider()

			expect(mockGetInjectedProvider).toHaveBeenCalled()
			expect(mockBaseAccountProvider).not.toHaveBeenCalled()
			expect(result).toBe(mockInjectedProvider)
		})

		it('should fallback to BaseAccountProvider when getInjectedProvider returns null', () => {
			mockGetInjectedProvider.mockReturnValue(null)

			const result = createStartaleAccountSDK({}).getProvider()

			expect(mockGetInjectedProvider).toHaveBeenCalled()
			expect(mockBaseAccountProvider).toHaveBeenCalledWith({
				metadata: {
					appName: 'App',
					appLogoUrl: '',
					appChainIds: [],
				},
				preference: {},
				paymasterUrls: undefined,
			})
			expect(result).toEqual({ mockProvider: true })
		})
	})

	describe('Integration', () => {
		it('should perform all setup steps in correct order', () => {
			const mockToOwnerAccount = vi.fn()
			const params: CreateProviderOptions = {
				appName: 'Integration Test',
				appLogoUrl: 'https://example.com/logo.png',
				appChainIds: [1, 137],
				preference: {
					telemetry: true,
				},
				subAccounts: {
					toOwnerAccount: mockToOwnerAccount,
					// @ts-expect-error - enableAutoSubAccounts is not officially supported yet
					enableAutoSubAccounts: true,
				},
				paymasterUrls: {
					1: 'https://paymaster.example.com',
				},
			}

			const result = createStartaleAccountSDK(params).getProvider()

			// Check sub-account validation and configuration
			expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount)
			expect(mockStore.subAccountsConfig.set).toHaveBeenCalledWith({
				toOwnerAccount: mockToOwnerAccount,
				enableAutoSubAccounts: true,
				unstable_enableAutoSpendPermissions: true,
			})

			// Check store configuration
			expect(mockStore.config.set).toHaveBeenCalledWith({
				metadata: {
					appName: 'Integration Test',
					appLogoUrl: 'https://example.com/logo.png',
					appChainIds: [1, 137],
				},
				preference: {
					telemetry: true,
				},
				paymasterUrls: {
					1: 'https://paymaster.example.com',
				},
			})

			// Check store rehydration
			expect(mockStore.persist.rehydrate).toHaveBeenCalled()

			// Check validation
			expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled()
			expect(mockValidatePreferences).toHaveBeenCalledWith({
				telemetry: true,
			})

			// Check telemetry
			expect(mockLoadTelemetryScript).toHaveBeenCalled()

			// Check provider creation
			expect(mockBaseAccountProvider).toHaveBeenCalledWith({
				metadata: {
					appName: 'Integration Test',
					appLogoUrl: 'https://example.com/logo.png',
					appChainIds: [1, 137],
				},
				preference: {
					telemetry: true,
				},
				paymasterUrls: {
					1: 'https://paymaster.example.com',
				},
			})

			expect(result).toEqual({ mockProvider: true })
		})
	})

	describe('Edge cases', () => {
		it('should handle null app logo URL', () => {
			createStartaleAccountSDK({ appLogoUrl: null }).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						appLogoUrl: '',
					}),
				}),
			)
		})

		it('should handle empty app chain IDs array', () => {
			createStartaleAccountSDK({ appChainIds: [] }).getProvider()

			expect(mockBaseAccountProvider).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						appChainIds: [],
					}),
				}),
			)
		})

		it('should handle complex nested preference objects', () => {
			const complexPreference = {
				attribution: { dataSuffix: '0x1234567890123456' as `0x${string}` },
				telemetry: false,
				customProperty: 'custom value',
			}

			createStartaleAccountSDK({ preference: complexPreference }).getProvider()

			expect(mockValidatePreferences).toHaveBeenCalledWith(complexPreference)
			expect(mockBaseAccountProvider).toHaveBeenCalledWith(
				expect.objectContaining({
					preference: complexPreference,
				}),
			)
		})
	})
})
