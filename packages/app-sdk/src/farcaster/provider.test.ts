import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FarcasterProvider } from './provider.js'

// biome-ignore lint/suspicious/noExplicitAny: test mock
function createMockHost(): any {
	return {
		ethProviderRequestV2: vi.fn(),
		ethProviderRequest: vi.fn(),
		context: Promise.resolve({ user: { fid: 123 } }),
	}
}

describe('FarcasterProvider', () => {
	// biome-ignore lint/suspicious/noExplicitAny: test mock
	let host: any
	let provider: FarcasterProvider

	beforeEach(() => {
		host = createMockHost()
		provider = new FarcasterProvider(host)
	})

	afterEach(() => {
		provider.disconnect()
	})

	it('should forward requests to host ethProviderRequestV2', async () => {
		host.ethProviderRequestV2.mockResolvedValue({ result: '0x1' })

		const result = await provider.request({ method: 'eth_chainId' })

		expect(host.ethProviderRequestV2).toHaveBeenCalledWith({
			method: 'eth_chainId',
			params: undefined,
		})
		expect(result).toBe('0x1')
	})

	it('should forward request params', async () => {
		host.ethProviderRequestV2.mockResolvedValue({ result: '0x0' })

		await provider.request({
			method: 'eth_getBalance',
			params: ['0xabc', 'latest'],
		})

		expect(host.ethProviderRequestV2).toHaveBeenCalledWith({
			method: 'eth_getBalance',
			params: ['0xabc', 'latest'],
		})
	})

	it('should throw on RPC errors from host', async () => {
		host.ethProviderRequestV2.mockResolvedValue({
			error: { code: 4001, details: 'User rejected' },
		})

		await expect(
			provider.request({ method: 'eth_sendTransaction' }),
		).rejects.toMatchObject({
			code: 4001,
			message: 'User rejected',
		})
	})

	it('should fall back to ethProviderRequest v1 when v2 is unsupported', async () => {
		host.ethProviderRequestV2.mockRejectedValue(
			new TypeError("Cannot read property 'apply' of undefined"),
		)
		host.ethProviderRequest.mockResolvedValue('0x1')

		const result = await provider.request({ method: 'eth_chainId' })

		expect(host.ethProviderRequest).toHaveBeenCalledWith({
			method: 'eth_chainId',
			params: undefined,
		})
		expect(result).toBe('0x1')
	})

	it('should re-throw non-v1-fallback errors', async () => {
		host.ethProviderRequestV2.mockRejectedValue(new Error('Network error'))

		await expect(
			provider.request({ method: 'eth_chainId' }),
		).rejects.toThrow('Network error')
	})

	it('should emit disconnect event on disconnect', async () => {
		const listener = vi.fn()
		provider.on('disconnect', listener)

		await provider.disconnect()

		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ code: 4900 }),
		)
	})

	it('should forward ethProvider events from postMessage', () => {
		const listener = vi.fn()
		provider.on('accountsChanged', listener)

		// Simulate Farcaster host sending ethProvider event via postMessage
		const event = new MessageEvent('message', {
			data: {
				type: 'frameEthProviderEvent',
				event: 'accountsChanged',
				params: [['0x1234']],
			},
		})
		window.dispatchEvent(event)

		expect(listener).toHaveBeenCalledWith(['0x1234'])
	})

	it('should have isFarcaster flag', () => {
		expect(provider.isFarcaster).toBe(true)
	})

	it('should translate wallet_connect into eth_requestAccounts + eth_chainId', async () => {
		host.ethProviderRequestV2
			.mockResolvedValueOnce({ result: ['0xabc', '0xdef'] }) // eth_requestAccounts
			.mockResolvedValueOnce({ result: '0x1' }) // eth_chainId

		const result = await provider.request({
			method: 'wallet_connect',
			params: [{ version: '1', capabilities: {} }],
		})

		expect(host.ethProviderRequestV2).toHaveBeenCalledWith({
			method: 'eth_requestAccounts',
			params: undefined,
		})
		expect(host.ethProviderRequestV2).toHaveBeenCalledWith({
			method: 'eth_chainId',
			params: undefined,
		})
		expect(result).toEqual({
			accounts: [
				{ address: '0xabc', capabilities: {} },
				{ address: '0xdef', capabilities: {} },
			],
			chainIds: ['0x1'],
		})
	})
})
