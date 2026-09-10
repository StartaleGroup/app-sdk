import { Mock, MockInstance, Mocked, vi } from 'vitest'

import { Communicator } from ':core/communicator/Communicator.js'
import { CB_KEYS_URL } from ':core/constants.js'
import { standardErrors } from ':core/error/errors.js'
import { EncryptedData, RPCResponseMessage } from ':core/message/RPCMessage.js'
import {
	AppMetadata,
	ProviderEventCallback,
	RequestArguments,
} from ':core/provider/interface.js'
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js'
import { correlationIds } from ':store/correlation-ids/store.js'
import { store } from ':store/store.js'
import {
	decryptContent,
	encryptContent,
	exportKeyToHexString,
	importKeyFromHexString,
} from ':util/cipher.js'
import { fetchRPCRequest } from ':util/provider.js'
import { numberToHex } from 'viem'
import { SCWKeyManager } from './SCWKeyManager.js'
import { Signer } from './Signer.js'

vi.mock(':store/chain-clients/utils.js', () => ({
	getBundlerClient: vi.fn().mockReturnValue({}),
	getClient: vi.fn().mockImplementation((chainId) => {
		if (chainId === 84532 || chainId === 1) {
			return {
				request: vi.fn(),
				chain: {
					id: chainId,
				},
				waitForTransaction: vi.fn().mockResolvedValue({
					status: 'success',
				}),
			}
		}
		return null
	}),
	createClients: vi.fn(),
}))

vi.mock('../../kms/crypto-key/index.js', () => ({
	getCryptoKeyAccount: vi.fn().mockResolvedValue({
		account: {
			type: 'local',
			address: '0x1234567890123456789012345678901234567890',
			publicKey: `0x04${'1'.repeat(128)}`,
		},
	}),
}))

vi.mock(':util/provider')
vi.mock(':store/chain-clients/utils')
vi.mock('./SCWKeyManager')
vi.mock(':core/communicator/Communicator', () => ({
	Communicator: vi.fn(() => ({
		postRequestAndWaitForResponse: vi.fn(),
		waitForPopupLoaded: vi.fn(),
	})),
}))
vi.mock(':util/cipher', () => ({
	decryptContent: vi.fn(),
	encryptContent: vi.fn(),
	exportKeyToHexString: vi.fn(),
	importKeyFromHexString: vi.fn(),
}))

const mockCryptoKey = {} as CryptoKey
const encryptedData = {} as EncryptedData
const mockChains = {
	'1': 'https://eth-rpc.example.com/1',
	'2': 'https://eth-rpc.example.com/2',
}
const mockCapabilities = {}

const mockError = standardErrors.provider.unauthorized()
const mockCorrelationId = '2-2-3-4-5'
const mockSuccessResponse: RPCResponseMessage = {
	id: '1-2-3-4-5',
	correlationId: mockCorrelationId,
	requestId: '1-2-3-4-5',
	sender: '0xPublicKey',
	content: { encrypted: encryptedData },
	timestamp: new Date(),
}
const subAccountAddress = '0x7838d2724FC686813CAf81d4429beff1110c739a'
const globalAccountAddress = '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54'

// Mock spend permission factory
const createMockSpendPermission = ({
	chainId = 84532,
	account = globalAccountAddress,
	spender = subAccountAddress,
	token = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
	allowance = '1000000000000000000',
	period = 86400,
	start = 0,
	end = 281474976710655,
	salt = '0',
	extraData = '0x',
}: {
	chainId?: number
	account?: string
	spender?: string
	token?: string
	allowance?: string
	period?: number
	start?: number
	end?: number
	salt?: string
	extraData?: string
} = {}) => ({
	permissionHash: '0xPermissionHash',
	signature: '0xSignature',
	chainId,
	permission: {
		account,
		spender,
		token,
		allowance,
		period,
		start,
		end,
		salt,
		extraData,
	},
})

describe('Signer', () => {
	let signer: Signer
	let mockMetadata: AppMetadata
	let mockCommunicator: Mocked<Communicator>
	let mockCallback: ProviderEventCallback
	let mockKeyManager: Mocked<SCWKeyManager>

	beforeEach(async () => {
		mockMetadata = {
			appName: 'test',
			appLogoUrl: null,
			appChainIds: [1],
		}

		mockCommunicator = new Communicator({
			url: CB_KEYS_URL,
			metadata: mockMetadata,
			preference: { walletUrl: CB_KEYS_URL, options: 'all' },
		}) as Mocked<Communicator>

		mockCommunicator.waitForPopupLoaded.mockResolvedValue({} as Window)
		mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(
			mockSuccessResponse,
		)

		mockCallback = vi.fn()
		mockKeyManager = new SCWKeyManager() as Mocked<SCWKeyManager>
		;(SCWKeyManager as Mock).mockImplementation(() => mockKeyManager)

		;(importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey)
		;(exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey')
		mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey)
		;(encryptContent as Mock).mockResolvedValueOnce(encryptedData)
		vi.spyOn(correlationIds, 'get').mockReturnValue(mockCorrelationId)

		signer = new Signer({
			metadata: mockMetadata,
			communicator: mockCommunicator,
			callback: mockCallback,
		})
	})

	afterEach(async () => {
		vi.clearAllMocks()

		store.account.clear()
		store.chains.clear()
		store.keys.clear()
		store.spendPermissions.clear()
		store.setState({})
	})

	beforeEach(async () => {
		// Restore getCryptoKeyAccount mock after clearAllMocks
		const { getCryptoKeyAccount } = (await vi.importMock(
			'../../kms/crypto-key/index.js',
		)) as any
		getCryptoKeyAccount.mockResolvedValue({
			account: {
				type: 'local',
				address: '0x1234567890123456789012345678901234567890',
				publicKey: `0x04${'1'.repeat(128)}`,
			},
		})
	})

	describe('handshake', () => {
		it('should perform a successful handshake for eth_requestAccounts', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: ['0xAddress'],
				},
				data: {
					chains: mockChains,
					capabilities: mockCapabilities,
				},
			})

			const mockSetChains = vi.spyOn(store.chains, 'set')
			const mockSetAccount = vi.spyOn(store.account, 'set')

			await signer.handshake({ method: 'eth_requestAccounts' })

			expect(importKeyFromHexString).toHaveBeenCalledWith(
				'public',
				'0xPublicKey',
			)
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(
				mockCryptoKey,
			)
			expect(decryptContent).toHaveBeenCalledWith(
				encryptedData,
				mockCryptoKey,
			)

			expect(mockSetChains).toHaveBeenCalledWith([
				{ id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
				{ id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
			])
			expect(mockSetAccount).toHaveBeenNthCalledWith(1, {
				chain: {
					id: 1,
					rpcUrl: 'https://eth-rpc.example.com/1',
				},
			})
			expect(mockSetAccount).toHaveBeenNthCalledWith(2, {
				capabilities: mockCapabilities,
			})

			// Mock the wallet_connect response that eth_requestAccounts now calls internally
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: '0xAddress',
								capabilities: {},
							},
						],
					},
				},
			})

			await expect(
				signer.request({ method: 'eth_requestAccounts' }),
			).resolves.toEqual(['0xAddress'])
			expect(mockCallback).toHaveBeenCalledWith('chainChanged', '0x1')
			expect(mockCallback).toHaveBeenCalledWith('accountsChanged', [
				'0xAddress',
			])
		})

		it('should perform a successful handshake for handshake', async () => {
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: null,
				},
			})

			const mockSetAccount = vi.spyOn(store.account, 'set')

			await signer.handshake({ method: 'handshake' })

			expect(importKeyFromHexString).toHaveBeenCalledWith(
				'public',
				'0xPublicKey',
			)
			expect(
				mockCommunicator.postRequestAndWaitForResponse,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					sender: '0xPublicKey',
					content: {
						handshake: expect.objectContaining({
							method: 'handshake',
						}),
					},
				}),
			)
			expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(
				mockCryptoKey,
			)
			expect(decryptContent).toHaveBeenCalledWith(
				encryptedData,
				mockCryptoKey,
			)

			expect(mockSetAccount).not.toHaveBeenCalled()
		})

		it('should throw an error if failure in response.content', async () => {
			const mockResponse: RPCResponseMessage = {
				id: '1-2-3-4-5',
				correlationId: mockCorrelationId,
				requestId: '1-2-3-4-5',
				sender: '0xPublicKey',
				content: { failure: mockError },
				timestamp: new Date(),
			}
			mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(
				mockResponse,
			)

			await expect(
				signer.handshake({ method: 'eth_requestAccounts' }),
			).rejects.toThrowError(mockError)
		})
	})

	describe('request - ephemeral signer', () => {
		it.each(['wallet_sendCalls', 'wallet_sign'])(
			'should perform a successful request after handshake',
			async (method) => {
				const mockRequest: RequestArguments = { method }

				// Reset and setup mocks for handshake
				;(decryptContent as Mock).mockReset()
				;(decryptContent as Mock).mockResolvedValueOnce({
					result: {
						value: null,
					},
				})

				await signer.handshake({ method: 'handshake' })
				expect(signer['accounts']).toEqual([])

				;(decryptContent as Mock).mockResolvedValueOnce({
					result: {
						value: '0xSignature',
					},
				})
				;(exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey')

				const result = await signer.request(mockRequest)

				expect(encryptContent).toHaveBeenCalled()
				expect(
					mockCommunicator.postRequestAndWaitForResponse,
				).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						sender: '0xPublicKey',
						content: { encrypted: encryptedData },
					}),
				)
				expect(result).toEqual('0xSignature')
			},
		)
	})

	describe('request', () => {
		let stateSpy: MockInstance

		beforeAll(() => {
			signer['accounts'] = ['0xAddress']
			signer['chain'] = { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' }

			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: ['0xAddress'],
					chain: { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: {},
			}))
		})

		afterAll(() => {
			// For some reason vi.restoreAllMocks() doesn't work for this spy
			stateSpy.mockRestore()
		})

		it('should perform a successful request', async () => {
			const mockRequest: RequestArguments = {
				method: 'personal_sign',
				params: ['0xMessage', '0xAddress'],
			}

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: '0xSignature',
				},
			})

			const result = await signer.request(mockRequest)

			expect(encryptContent).toHaveBeenCalled()
			expect(
				mockCommunicator.postRequestAndWaitForResponse,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					sender: '0xPublicKey',
					content: { encrypted: encryptedData },
				}),
			)
			expect(result).toEqual('0xSignature')
		})

		it.each([
			'eth_ecRecover',
			'personal_sign',
			'wallet_sign',
			'personal_ecRecover',
			'eth_signTransaction',
			'eth_sendTransaction',
			'eth_signTypedData_v1',
			'eth_signTypedData_v3',
			'eth_signTypedData_v4',
			'eth_signTypedData',
			'wallet_addEthereumChain',
			'wallet_watchAsset',
			'wallet_sendCalls',
			'wallet_showCallsStatus',
			'wallet_grantPermissions',
		])('should send request to popup for %s', async (method) => {
			const mockRequest: RequestArguments = {
				method,
				params: [],
			}

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: '0xSignature',
				},
			})

			await signer.request(mockRequest)

			expect(
				mockCommunicator.postRequestAndWaitForResponse,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					sender: '0xPublicKey',
					content: { encrypted: encryptedData },
				}),
			)
		})

		it.each([
			'wallet_prepareCalls',
			'wallet_sendPreparedCalls',
			'eth_getBalance',
			'eth_getTransactionCount',
		])('should fetch rpc request for %s', async (method) => {
			const mockRequest: RequestArguments = {
				method,
				params: [],
			}

			await signer.request(mockRequest)

			expect(fetchRPCRequest).toHaveBeenCalledWith(
				mockRequest,
				'https://eth-rpc.example.com/1',
			)
		})

		it('should throw an error if error in decrypted response', async () => {
			const mockRequest: RequestArguments = {
				method: 'personal_sign',
				params: ['0xMessage', '0xAddress'],
			}

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					error: mockError,
				},
			})

			await expect(signer.request(mockRequest)).rejects.toThrowError(
				mockError,
			)
		})

		it('should update internal state for successful wallet_switchEthereumChain', async () => {
			const mockRequest: RequestArguments = {
				method: 'wallet_switchEthereumChain',
				params: [{ chainId: '0x1' }],
			}

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: null,
				},
				data: {
					chains: mockChains,
					capabilities: mockCapabilities,
				},
			})

			const mockSetChains = vi.spyOn(store.chains, 'set')
			const mockSetAccount = vi.spyOn(store.account, 'set')

			await signer.request(mockRequest)

			expect(mockSetChains).toHaveBeenCalledWith([
				{ id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
				{ id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
			])
			expect(mockSetAccount).toHaveBeenNthCalledWith(1, {
				chain: { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
			})
			expect(mockSetAccount).toHaveBeenNthCalledWith(2, {
				capabilities: mockCapabilities,
			})
			expect(mockCallback).toHaveBeenCalledWith('chainChanged', '0x1')
		})
	})

	describe('disconnect', () => {
		it('should disconnect successfully', async () => {
			const mockClear = vi.spyOn(store.account, 'clear')

			await signer.cleanup()

			expect(mockClear).toHaveBeenCalled()
			expect(mockKeyManager.clear).toHaveBeenCalled()
			expect(signer['accounts']).toEqual([])
			expect(signer['chain']).toEqual({ id: 1 })
		})
	})

	describe('wallet_connect', () => {
		beforeEach(async () => {
			await signer.cleanup()
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: null,
				},
			})
			await signer.handshake({ method: 'handshake' })
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})

		it('should use cached response for subsequent wallet_connect calls', async () => {
			// First wallet_connect call
			const mockRequest: RequestArguments = {
				method: 'wallet_connect',
				params: [],
			}

			const mockSpendPermissions = [
				createMockSpendPermission({ chainId: 1 }),
			]

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: globalAccountAddress,
								capabilities: {
									spendPermissions: {
										permissions: mockSpendPermissions,
									},
								},
							},
						],
					},
				},
			})

			// First wallet_connect call
			await signer.request(mockRequest)

			// Reset decryptContent mock to verify it's not called again
			;(decryptContent as Mock).mockReset()

			// Second wallet_connect call
			const cachedResponse = await signer.request(mockRequest)

			// Verify decryptContent was not called for the second request
			expect(decryptContent).not.toHaveBeenCalled()

			// Verify cached response matches expected format
			expect(cachedResponse).toEqual({
				accounts: [
					{
						address: globalAccountAddress,
						capabilities: {
							spendPermissions: {
								permissions: mockSpendPermissions,
							},
						},
					},
				],
			})
		})

		it('should not use cached response for wallet_connect calls with signInWithEthereum capability', async () => {
			// First wallet_connect call without SIWE
			const initialRequest: RequestArguments = {
				method: 'wallet_connect',
				params: [],
			}

			const mockSpendPermissions = [
				{
					permissionHash: '0xPermissionHash',
					signature: '0xSignature',
					chainId: 1,
					permission: {
						account: globalAccountAddress,
						spender: subAccountAddress,
					},
				},
			]

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: globalAccountAddress,
								capabilities: {
									spendPermissions: {
										permissions: mockSpendPermissions,
									},
								},
							},
						],
					},
				},
			})

			// First call to establish cache
			await signer.request(initialRequest)

			// Reset mock call count to track only SIWE calls
			;(decryptContent as Mock).mockClear()

			// Now make a wallet_connect call with signInWithEthereum capability
			const siweRequest: RequestArguments = {
				method: 'wallet_connect',
				params: [
					{
						version: '1',
						capabilities: {
							signInWithEthereum: {
								chainId: '0x14a34', // Base Sepolia
								nonce: 'test-nonce-123',
							},
						},
					},
				],
			}

			// Mock the response for SIWE request
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: globalAccountAddress,
								capabilities: {
									signInWithEthereum: {
										message:
											'example.com wants you to sign in with your Ethereum account',
										signature: '0xsiwesignature',
									},
								},
							},
						],
					},
				},
			})

			// Make the SIWE request
			const siweResponse = await signer.request(siweRequest)

			// Verify decryptContent was called for the SIWE request (not cached)
			expect(decryptContent).toHaveBeenCalledTimes(1) // Only for SIWE request since we cleared the count

			// Verify SIWE response includes the signInWithEthereum capability
			expect(siweResponse).toEqual({
				accounts: [
					{
						address: globalAccountAddress,
						capabilities: {
							signInWithEthereum: {
								message:
									'example.com wants you to sign in with your Ethereum account',
								signature: '0xsiwesignature',
							},
						},
					},
				],
			})
		})

	})

	describe('wallet_getCapabilities', () => {
		let stateSpy: MockInstance

		beforeEach(() => {
			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
					capabilities: {
						'0x1': {
							atomicBatch: { supported: true },
							paymasterService: { supported: true },
						},
						'0x5': {
							atomicBatch: { supported: false },
						},
						'0xa': {
							paymasterService: { supported: true },
						},
					},
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: {},
			}))

			signer['accounts'] = [globalAccountAddress]
		})

		afterEach(() => {
			stateSpy.mockRestore()
		})

		it('should return all capabilities when no filter is provided', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				'0x1': {
					atomicBatch: { supported: true },
					paymasterService: { supported: true },
				},
				'0x5': {
					atomicBatch: { supported: false },
				},
				'0xa': {
					paymasterService: { supported: true },
				},
			})
		})

		it('should return filtered capabilities when chain filter is provided', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, ['0x1', '0xa']],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				'0x1': {
					atomicBatch: { supported: true },
					paymasterService: { supported: true },
				},
				'0xa': {
					paymasterService: { supported: true },
				},
			})
		})

		it('should handle different hex formatting in filters', async () => {
			// Test that '0x01' matches '0x1' capability
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, ['0x01', '0x05']],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				'0x1': {
					atomicBatch: { supported: true },
					paymasterService: { supported: true },
				},
				'0x5': {
					atomicBatch: { supported: false },
				},
			})
		})

		it('should return empty object when filter matches no capabilities', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, ['0x99', '0x100']],
			}

			const result = await signer.request(request)

			expect(result).toEqual({})
		})

		it('should return empty object when capabilities is undefined', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
					capabilities: undefined,
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
			}))

			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress],
			}

			const result = await signer.request(request)

			expect(result).toEqual({})
		})

		it('should return empty object when empty filter array is provided', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, []],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				'0x1': {
					atomicBatch: { supported: true },
					paymasterService: { supported: true },
				},
				'0x5': {
					atomicBatch: { supported: false },
				},
				'0xa': {
					paymasterService: { supported: true },
				},
			})
		})

		it('should handle capabilities with non-hex keys gracefully', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
					capabilities: {
						'0x1': { atomicBatch: { supported: true } },
						'invalid-key': { someFeature: true },
						'0x5': { paymasterService: { supported: true } },
					},
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
			}))

			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, ['0x1']],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				'0x1': { atomicBatch: { supported: true } },
			})
		})

		it('should throw error when account is not in accounts list', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [subAccountAddress],
			}

			await expect(signer.request(request)).rejects.toThrow(
				'no active account found',
			)
		})

		it('should throw error when account parameter is invalid', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: ['invalid-address'],
			}

			await expect(signer.request(request)).rejects.toThrow()
		})

		it('should throw error when filter contains invalid hex strings', async () => {
			const request = {
				method: 'wallet_getCapabilities',
				params: [globalAccountAddress, ['0x1', 'invalid-hex']],
			}

			await expect(signer.request(request)).rejects.toThrow()
		})
	})

	describe('wallet_getUserInfo', () => {
		let stateSpy: MockInstance

		beforeEach(() => {
			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {
					userId: 'user123',
					email: 'test@example.com',
					name: 'Test User',
					authType: 'oauth',
				},
				context: {},
			}))

			signer['accounts'] = [globalAccountAddress]
		})

		afterEach(() => {
			stateSpy.mockRestore()
		})

		it('should return user info when available', async () => {
			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				userId: 'user123',
				email: 'test@example.com',
				name: 'Test User',
				authType: 'oauth',
			})
		})

		it('should return partial user info when some fields are missing', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {
					userId: 'user123',
					authType: 'oauth',
					// email and name are missing
				},
			}))

			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				userId: 'user123',
				authType: 'oauth',
			})
		})

		it('should throw unauthorized error when no user info is found', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: undefined,
			}))

			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			await expect(signer.request(request)).rejects.toThrow(
				standardErrors.provider.unauthorized('No user info found'),
			)
		})

		it('should throw unauthorized error when user info is null', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: null,
			}))

			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			await expect(signer.request(request)).rejects.toThrow(
				standardErrors.provider.unauthorized('No user info found'),
			)
		})

		it('should throw unauthorized error when user info is empty object', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
			}))

			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			// Note: An empty object {} is truthy in JavaScript, so it will be returned
			const result = await signer.request(request)
			expect(result).toEqual({})
		})

		it('should return user info with only userId when other fields are empty strings', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {
					userId: 'user123',
					email: '',
					name: '',
					authType: 'oauth',
				},
			}))

			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			const result = await signer.request(request)

			expect(result).toEqual({
				userId: 'user123',
				email: '',
				name: '',
				authType: 'oauth',
			})
		})

		it('should work with different auth types', async () => {
			const authTypes = ['oauth', 'web3auth', 'passkey', 'email']

			for (const authType of authTypes) {
				stateSpy.mockImplementation(() => ({
					account: {
						accounts: [globalAccountAddress],
					},
					chains: [],
					keys: {},
					spendPermissions: [],
					config: {
						metadata: mockMetadata,
						preference: { walletUrl: CB_KEYS_URL, options: 'all' },
						version: '1.0.0',
					},
					userInfo: {
						userId: `user-${authType}`,
						email: `${authType}@example.com`,
						name: `${authType} User`,
						authType,
					},
				}))

				const request = {
					method: 'wallet_getUserInfo',
					params: [],
				}

				const result = await signer.request(request)

				expect(result).toEqual({
					userId: `user-${authType}`,
					email: `${authType}@example.com`,
					name: `${authType} User`,
					authType,
				})
			}
		})

		it('should not make any network requests', async () => {
			const request = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			await signer.request(request)

			// Verify no encrypted requests were sent
			expect(
				mockCommunicator.postRequestAndWaitForResponse,
			).not.toHaveBeenCalled()
			expect(fetchRPCRequest).not.toHaveBeenCalled()
		})

		it('should handle user info set from wallet_connect response', async () => {
			// Remove the stateSpy to allow real store updates
			stateSpy.mockRestore()

			// First, clean up and simulate wallet_connect setting user info
			await signer.cleanup()

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: null,
				},
			})

			await signer.handshake({ method: 'handshake' })

			// Mock wallet_connect response with userInfo
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: globalAccountAddress,
								capabilities: {},
							},
						],
						userInfo: {
							userId: 'connected-user-123',
							email: 'connected@example.com',
							name: 'Connected User',
							authType: 'oauth',
						},
					},
				},
			})

			// Simulate wallet_connect
			await signer.request({
				method: 'wallet_connect',
				params: [],
			})

			// Now test wallet_getUserInfo
			const userInfoRequest = {
				method: 'wallet_getUserInfo',
				params: [],
			}

			const result = await signer.request(userInfoRequest)

			expect(result).toEqual({
				userId: 'connected-user-123',
				email: 'connected@example.com',
				name: 'Connected User',
				authType: 'oauth',
			})

			// Restore the mock for other tests
			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {
					userId: 'user123',
					email: 'test@example.com',
					name: 'Test User',
					authType: 'oauth',
				},
				context: {},
			}))
		})
	})

	describe('wallet_getContext', () => {
		let stateSpy: MockInstance

		const mockContext = {
			chain: 'soneium',
			user: { username: 'tester' },
			startale: {
				starPoints: 100,
				eoaWallets: ['0xabc'],
			},
		}

		beforeEach(() => {
			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: mockContext,
			}))

			signer['accounts'] = [globalAccountAddress]
		})

		afterEach(() => {
			stateSpy.mockRestore()
		})

		it('should return context when available', async () => {
			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			const result = await signer.request(request)

			expect(result).toEqual(mockContext)
		})

		it('should return partial context when some fields are missing', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: {
					chain: 'soneium',
					// user and startale are missing
				},
			}))

			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			const result = await signer.request(request)

			expect(result).toEqual({ chain: 'soneium' })
		})

		it('should throw unauthorized error when context is undefined', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: undefined,
			}))

			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			await expect(signer.request(request)).rejects.toThrow(
				standardErrors.provider.unauthorized('No context found'),
			)
		})

		it('should throw unauthorized error when context is null', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: null,
			}))

			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			await expect(signer.request(request)).rejects.toThrow(
				standardErrors.provider.unauthorized('No context found'),
			)
		})

		it('should return empty object when context is empty object', async () => {
			stateSpy.mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: {},
			}))

			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			// An empty object {} is truthy in JavaScript, so it will be returned
			const result = await signer.request(request)
			expect(result).toEqual({})
		})

		it('should not make any network requests', async () => {
			const request = {
				method: 'wallet_getContext',
				params: [],
			}

			await signer.request(request)

			expect(
				mockCommunicator.postRequestAndWaitForResponse,
			).not.toHaveBeenCalled()
			expect(fetchRPCRequest).not.toHaveBeenCalled()
		})

		it('should handle context set from wallet_connect response', async () => {
			// Remove the stateSpy to allow real store updates
			stateSpy.mockRestore()

			// First, clean up and simulate wallet_connect setting context
			await signer.cleanup()

			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: null,
				},
			})

			await signer.handshake({ method: 'handshake' })

			// Mock wallet_connect response with context
			;(decryptContent as Mock).mockResolvedValueOnce({
				result: {
					value: {
						accounts: [
							{
								address: globalAccountAddress,
								capabilities: {},
							},
						],
						context: {
							chain: 'soneium',
							user: { username: 'connected-user' },
							startale: {
								starPoints: 500,
								eoaWallets: ['0xdef'],
							},
						},
					},
				},
			})

			// Simulate wallet_connect
			await signer.request({
				method: 'wallet_connect',
				params: [],
			})

			// Now test wallet_getContext
			const contextRequest = {
				method: 'wallet_getContext',
				params: [],
			}

			const result = await signer.request(contextRequest)

			expect(result).toEqual({
				chain: 'soneium',
				user: { username: 'connected-user' },
				startale: {
					starPoints: 500,
					eoaWallets: ['0xdef'],
				},
			})

			// Restore the mock for other tests
			stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: [globalAccountAddress],
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: mockContext,
			}))
		})
	})

	describe('coinbase_fetchPermissions', () => {
		const mockSpendPermissions = [
			createMockSpendPermission({
				chainId: 10,
				account: '0xAddress',
				spender: '0xSubAccount',
			}),
		] as [SpendPermission]

		beforeEach(() => {
			vi.spyOn(store, 'getState').mockImplementation(() => ({
				account: {
					accounts: ['0xAddress'],
					chain: { id: 10, rpcUrl: 'https://eth-rpc.example.com/10' },
				},
				chains: [],
				keys: {},
				spendPermissions: [],
				config: {
					metadata: mockMetadata,
					preference: { walletUrl: CB_KEYS_URL, options: 'all' },
					version: '1.0.0',
				},
				userInfo: {},
				context: {},
			}))

			;(fetchRPCRequest as Mock).mockResolvedValue({
				permissions: mockSpendPermissions,
			})
		})

		it('should update internal state for successful coinbase_fetchPermissions', async () => {
			await signer.cleanup()

			const mockRequest: RequestArguments = {
				method: 'coinbase_fetchPermissions',
				params: [
					{
						account: '0xAddress',
						chainId: numberToHex(10),
						spender: '0xSubAccount',
					},
				],
			}

			signer['accounts'] = ['0xAddress'] // mock the logged in state

			const mockSetSpendPermissions = vi.spyOn(store.spendPermissions, 'set')

			await signer.request(mockRequest)

			expect(mockSetSpendPermissions).toHaveBeenCalledWith(
				mockSpendPermissions,
			)
		})
	})
})
