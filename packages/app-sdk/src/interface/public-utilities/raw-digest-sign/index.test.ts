import { describe, expect, it, vi } from 'vitest'

import { ProviderInterface } from ':core/provider/interface.js'
import { requestSignRawDigest } from './index.js'

describe('requestSignRawDigest', () => {
	const address = '0x1234567890abcdef1234567890abcdef12345678' as const
	const digest = `0x${'ab'.repeat(32)}` as const

	const makeProvider = (returnValue: string): ProviderInterface =>
		({
			request: vi.fn().mockResolvedValue(returnValue),
		}) as unknown as ProviderInterface

	it('forwards a 32-byte digest to wallet_signRawDigest', async () => {
		const provider = makeProvider('0xdeadbeef')

		const signature = await requestSignRawDigest({
			provider,
			digest,
			address,
		})

		expect(provider.request).toHaveBeenCalledWith({
			method: 'wallet_signRawDigest',
			params: [digest, address],
		})
		expect(signature).toBe('0xdeadbeef')
	})

	it('rejects digests that are not exactly 32 bytes', async () => {
		const provider = makeProvider('0xdeadbeef')

		await expect(
			requestSignRawDigest({
				provider,
				digest: '0x1234' as `0x${string}`,
				address,
			}),
		).rejects.toThrow('digest must be a 32-byte hex string')
		expect(provider.request).not.toHaveBeenCalled()
	})

	it('rejects non-hex digests of the right length', async () => {
		const provider = makeProvider('0xdeadbeef')

		await expect(
			requestSignRawDigest({
				provider,
				digest: `0x${'zz'.repeat(32)}` as `0x${string}`,
				address,
			}),
		).rejects.toThrow('digest must be a 32-byte hex string')
	})
})
