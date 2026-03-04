import type { Remote } from 'comlink'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WireMiniAppHost } from './types.js'

// Mock detect module before importing
vi.mock('./detect.js', () => ({
	confirmFarcasterMiniApp: vi.fn(),
}))

vi.mock(':interface/builder/core/BaseAccountProvider.js', () => ({
	BaseAccountProvider: vi.fn().mockImplementation(() => ({
		request: vi.fn().mockResolvedValue('base-result'),
		disconnect: vi.fn(),
		on: vi.fn(),
		emit: vi.fn(),
	})),
}))

import { BaseAccountProvider } from ':interface/builder/core/BaseAccountProvider.js'
import { FarcasterDetectingProvider } from './FarcasterDetectingProvider.js'
import { confirmFarcasterMiniApp } from './detect.js'

const mockConfirm = confirmFarcasterMiniApp as ReturnType<typeof vi.fn>
const MockBaseAccountProvider = BaseAccountProvider as unknown as ReturnType<typeof vi.fn>

function createMockHost(): Remote<WireMiniAppHost> {
	return {
		ethProviderRequestV2: vi.fn().mockResolvedValue({ result: 'farcaster-result' }),
		ethProviderRequest: vi.fn().mockResolvedValue('farcaster-result'),
		context: Promise.resolve({ user: { fid: 123 } }),
	} as unknown as Remote<WireMiniAppHost>
}

describe('FarcasterDetectingProvider', () => {
	const options = {
		metadata: { appName: 'Test', appLogoUrl: '', appChainIds: [] },
		preference: {},
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should use FarcasterProvider when Farcaster is confirmed', async () => {
		const host = createMockHost()
		mockConfirm.mockResolvedValue(host)

		const provider = new FarcasterDetectingProvider(options)
		const result = await provider.request({ method: 'eth_chainId' })

		expect(result).toBe('farcaster-result')
		expect(host.ethProviderRequestV2).toHaveBeenCalledWith({
			method: 'eth_chainId',
			params: undefined,
		})
	})

	it('should fallback to BaseAccountProvider when Farcaster is not confirmed', async () => {
		mockConfirm.mockResolvedValue(null)

		const provider = new FarcasterDetectingProvider(options)
		const result = await provider.request({ method: 'eth_chainId' })

		expect(result).toBe('base-result')
		expect(MockBaseAccountProvider).toHaveBeenCalledWith(options)
	})

	it('should fallback to BaseAccountProvider when detection throws', async () => {
		mockConfirm.mockRejectedValue(new Error('detection failed'))

		const provider = new FarcasterDetectingProvider(options)
		const result = await provider.request({ method: 'eth_chainId' })

		expect(result).toBe('base-result')
	})

	it('should deduplicate concurrent detection attempts', async () => {
		const host = createMockHost()
		mockConfirm.mockResolvedValue(host)

		const provider = new FarcasterDetectingProvider(options)

		// Fire two requests concurrently
		await Promise.all([
			provider.request({ method: 'eth_chainId' }),
			provider.request({ method: 'eth_accounts' }),
		])

		// confirmFarcasterMiniApp should only be called once
		expect(mockConfirm).toHaveBeenCalledTimes(1)
	})

	it('should handle disconnect before detection', async () => {
		const provider = new FarcasterDetectingProvider(options)
		// Should not throw
		await provider.disconnect()
	})

	it('should delegate disconnect to resolved provider', async () => {
		mockConfirm.mockResolvedValue(null)

		const provider = new FarcasterDetectingProvider(options)
		await provider.request({ method: 'eth_chainId' })
		await provider.disconnect()

		const baseInstance = MockBaseAccountProvider.mock.results[0].value
		expect(baseInstance.disconnect).toHaveBeenCalled()
	})
})
