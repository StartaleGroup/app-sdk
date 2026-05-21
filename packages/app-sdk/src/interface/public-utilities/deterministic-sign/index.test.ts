import { describe, expect, it, vi } from 'vitest'

import { ProviderInterface } from ':core/provider/interface.js'
import { requestDeterministicSign } from './index.js'

describe('requestDeterministicSign', () => {
	const address = '0x1234567890abcdef1234567890abcdef12345678' as const

	const makeProvider = (returnValue: string): ProviderInterface =>
		({
			request: vi.fn().mockResolvedValue(returnValue),
		}) as unknown as ProviderInterface

	it('forwards a string message hex-encoded to wallet_deterministicSign', async () => {
		const provider = makeProvider('0xdeadbeef')

		const signature = await requestDeterministicSign({
			provider,
			message: 'Authorize',
			address,
		})

		expect(provider.request).toHaveBeenCalledWith({
			method: 'wallet_deterministicSign',
			params: ['0x417574686f72697a65', address],
		})
		expect(signature).toBe('0xdeadbeef')
	})

	it('passes through a hex-encoded message unchanged', async () => {
		const provider = makeProvider('0xdeadbeef')
		const hex = '0x417574686f72697a65' as const

		await requestDeterministicSign({ provider, message: hex, address })

		expect(provider.request).toHaveBeenCalledWith({
			method: 'wallet_deterministicSign',
			params: [hex, address],
		})
	})
})
