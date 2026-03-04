import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMaybeFarcasterMiniApp } from './detect.js'

describe('isMaybeFarcasterMiniApp', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it('should return false when not in iframe and no ReactNativeWebView', () => {
		// In jsdom, window === window.parent by default (no iframe)
		expect(isMaybeFarcasterMiniApp()).toBe(false)
	})

	it('should return true when window !== window.parent (iframe)', () => {
		const mockParent = {} as Window
		vi.stubGlobal('parent', mockParent)

		expect(isMaybeFarcasterMiniApp()).toBe(true)
	})

	it('should return true when ReactNativeWebView exists', () => {
		vi.stubGlobal('ReactNativeWebView', { postMessage: vi.fn() })

		expect(isMaybeFarcasterMiniApp()).toBe(true)
	})

	it('should return false when window is undefined', () => {
		const windowSpy = vi.spyOn(globalThis, 'window', 'get')
		windowSpy.mockReturnValue(undefined as unknown as Window & typeof globalThis)

		expect(isMaybeFarcasterMiniApp()).toBe(false)
	})
})
