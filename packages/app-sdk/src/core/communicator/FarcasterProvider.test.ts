import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FarcasterProvider } from './FarcasterProvider.js'

const mockRequest = vi.fn()
const mockOn = vi.fn()
const mockRemoveListener = vi.fn()
const mockReady = vi.fn()
const mockClose = vi.fn()
const mockGetEthereumProvider = vi.fn()

vi.mock('@farcaster/miniapp-sdk', () => ({
	sdk: {
		actions: {
			ready: (...args: unknown[]) => mockReady(...args),
			close: (...args: unknown[]) => mockClose(...args),
		},
		wallet: {
			getEthereumProvider: (...args: unknown[]) => mockGetEthereumProvider(...args),
		},
	},
}))

describe('FarcasterProvider', () => {
	let provider: FarcasterProvider

	beforeEach(() => {
		vi.clearAllMocks()
		mockGetEthereumProvider.mockResolvedValue({
			request: mockRequest,
			on: mockOn,
			removeListener: mockRemoveListener,
		})
		provider = new FarcasterProvider()
	})

	describe('request', () => {
		it('should trigger init on first request and forward to farcaster provider', async () => {
			mockRequest.mockResolvedValue(['0x1234'])

			const result = await provider.request({ method: 'eth_accounts' })

			expect(mockReady).toHaveBeenCalledOnce()
			expect(mockGetEthereumProvider).toHaveBeenCalledOnce()
			expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_accounts' })
			expect(result).toEqual(['0x1234'])
		})

		it('should only init once across multiple requests', async () => {
			mockRequest.mockResolvedValue('0x1')

			await provider.request({ method: 'eth_chainId' })
			await provider.request({ method: 'eth_accounts' })

			expect(mockReady).toHaveBeenCalledOnce()
			expect(mockGetEthereumProvider).toHaveBeenCalledOnce()
			expect(mockRequest).toHaveBeenCalledTimes(2)
		})

		it('should forward request params', async () => {
			mockRequest.mockResolvedValue('0xabc')

			await provider.request({
				method: 'eth_call',
				params: [{ to: '0x1234', data: '0x' }],
			})

			expect(mockRequest).toHaveBeenCalledWith({
				method: 'eth_call',
				params: [{ to: '0x1234', data: '0x' }],
			})
		})
	})

	describe('wallet_connect', () => {
		it('should translate wallet_connect to eth_requestAccounts + eth_chainId', async () => {
			mockRequest
				.mockResolvedValueOnce(['0xabc', '0xdef']) // eth_requestAccounts
				.mockResolvedValueOnce('0x1') // eth_chainId

			const result = await provider.request({
				method: 'wallet_connect',
				params: [{ chainIds: ['0xa', '0x89'] }],
			})

			expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' })
			expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_chainId' })
			expect(result).toEqual({
				accounts: [{ address: '0xabc' }, { address: '0xdef' }],
				chainIds: ['0xa', '0x89'],
			})
		})

		it('should fall back to current chainId when no chainIds requested', async () => {
			mockRequest
				.mockResolvedValueOnce(['0xabc']) // eth_requestAccounts
				.mockResolvedValueOnce('0x89') // eth_chainId

			const result = await provider.request({
				method: 'wallet_connect',
				params: [{ capabilities: {} }],
			})

			expect(result).toEqual({
				accounts: [{ address: '0xabc' }],
				chainIds: ['0x89'],
			})
		})
	})

	describe('event forwarding', () => {
		it('should forward EIP-1193 events after init', async () => {
			mockRequest.mockResolvedValue(null)
			await provider.request({ method: 'eth_chainId' })

			// Verify event listeners were registered on the farcaster provider
			expect(mockOn).toHaveBeenCalledWith('accountsChanged', expect.any(Function))
			expect(mockOn).toHaveBeenCalledWith('chainChanged', expect.any(Function))
			expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function))
			expect(mockOn).toHaveBeenCalledWith('disconnect', expect.any(Function))
		})

		it('should re-emit events on the provider', async () => {
			mockRequest.mockResolvedValue(null)
			await provider.request({ method: 'eth_chainId' })

			const accountsListener = vi.fn()
			provider.on('accountsChanged', accountsListener)

			// Find the registered forwarder for accountsChanged
			const accountsCall = mockOn.mock.calls.find(
				(call) => call[0] === 'accountsChanged',
			)
			const forwarder = accountsCall![1]

			// Simulate the farcaster provider emitting the event
			forwarder(['0xnewaccount'])

			expect(accountsListener).toHaveBeenCalledWith('0xnewaccount')
		})
	})

	describe('disconnect', () => {
		it('should emit disconnect event', async () => {
			mockRequest.mockResolvedValue(null)
			await provider.request({ method: 'eth_chainId' })

			const disconnectListener = vi.fn()
			provider.on('disconnect', disconnectListener)

			await provider.disconnect()

			expect(disconnectListener).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('User initiated disconnection') }),
			)
		})

		it('should not call sdk.actions.close()', async () => {
			mockRequest.mockResolvedValue(null)
			await provider.request({ method: 'eth_chainId' })

			await provider.disconnect()

			expect(mockClose).not.toHaveBeenCalled()
		})

		it('should remove event listeners from farcaster provider', async () => {
			mockRequest.mockResolvedValue(null)
			await provider.request({ method: 'eth_chainId' })

			await provider.disconnect()

			expect(mockRemoveListener).toHaveBeenCalledWith('accountsChanged', expect.any(Function))
			expect(mockRemoveListener).toHaveBeenCalledWith('chainChanged', expect.any(Function))
			expect(mockRemoveListener).toHaveBeenCalledWith('connect', expect.any(Function))
			expect(mockRemoveListener).toHaveBeenCalledWith('disconnect', expect.any(Function))
		})

		it('should allow re-init after disconnect', async () => {
			mockRequest.mockResolvedValue('0x1')
			await provider.request({ method: 'eth_chainId' })
			await provider.disconnect()

			mockReady.mockClear()
			mockGetEthereumProvider.mockClear()

			await provider.request({ method: 'eth_chainId' })

			expect(mockReady).toHaveBeenCalledOnce()
			expect(mockGetEthereumProvider).toHaveBeenCalledOnce()
		})
	})

	describe('init timeout', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('should throw if getEthereumProvider hangs beyond timeout', async () => {
			mockGetEthereumProvider.mockReturnValue(new Promise(() => {})) // never resolves

			const promise = provider.request({ method: 'eth_chainId' }).catch((e: Error) => e)
			await vi.advanceTimersByTimeAsync(5_000)

			const error = await promise
			expect(error).toBeInstanceOf(Error)
			expect((error as Error).message).toContain('FarcasterProvider init timed out')
		})

		it('should allow retry after timeout', async () => {
			// First attempt: hangs
			mockGetEthereumProvider.mockReturnValueOnce(new Promise(() => {}))

			const promise = provider.request({ method: 'eth_chainId' }).catch((e: Error) => e)
			await vi.advanceTimersByTimeAsync(5_000)
			const error = await promise
			expect((error as Error).message).toContain('FarcasterProvider init timed out')

			// Second attempt: succeeds
			mockGetEthereumProvider.mockResolvedValueOnce({
				request: mockRequest,
				on: mockOn,
				removeListener: mockRemoveListener,
			})
			mockRequest.mockResolvedValue('0x1')

			const result = await provider.request({ method: 'eth_chainId' })
			expect(result).toBe('0x1')
		})
	})

	describe('close', () => {
		it('should call sdk.actions.close()', async () => {
			await provider.close()

			expect(mockClose).toHaveBeenCalledOnce()
		})
	})
})
