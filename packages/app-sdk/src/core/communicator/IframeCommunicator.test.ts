import { PACKAGE_NAME, PACKAGE_VERSION } from ':core/constants.js'
import { AppMetadata, Preference } from ':core/provider/interface.js'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { IframeCommunicator } from './IframeCommunicator.js'

const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

describe('IframeCommunicator', () => {
	const metadata: AppMetadata = {
		appName: 'Test App',
		appLogoUrl: null,
		appChainIds: [1],
	}
	const preference: Preference = {}
	const PARENT_ORIGIN = 'https://app.startale.com'

	let mockParent: { postMessage: ReturnType<typeof vi.fn> }
	let originalParent: typeof window.parent

	beforeEach(() => {
		vi.clearAllMocks()
		originalParent = window.parent
		mockParent = { postMessage: vi.fn() }
		Object.defineProperty(window, 'parent', {
			value: mockParent,
			writable: true,
			configurable: true,
		})
	})

	afterEach(() => {
		Object.defineProperty(window, 'parent', {
			value: originalParent,
			writable: true,
			configurable: true,
		})
	})

	function dispatchParentMessage(data: Record<string, unknown>) {
		const event = new MessageEvent('message', {
			data,
			origin: PARENT_ORIGIN,
			source: mockParent as unknown as MessageEventSource,
		})
		window.dispatchEvent(event)
	}

	function queueParentMessage(data: Record<string, unknown>, delay = 50) {
		setTimeout(() => dispatchParentMessage(data), delay)
	}

	describe('constructor', () => {
		it('should accept app.startale.com origin', () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})
			expect(communicator).toBeDefined()
		})

		it('should accept localhost origin', () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: 'http://localhost:3000',
			})
			expect(communicator).toBeDefined()
		})

		it('should accept 127.0.0.1 origin', () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: 'http://127.0.0.1:8080',
			})
			expect(communicator).toBeDefined()
		})

		it('should throw for disallowed origin', () => {
			expect(() => {
				new IframeCommunicator({
					metadata,
					preference,
					parentOrigin: 'https://evil.com',
				})
			}).toThrow('Iframe communication is not allowed')
		})

		it('should throw for empty origin when document.referrer is not set', () => {
			expect(() => {
				new IframeCommunicator({ metadata, preference })
			}).toThrow('Iframe communication is not allowed')
		})

		it('should derive origin from document.referrer when parentOrigin not provided', () => {
			Object.defineProperty(document, 'referrer', {
				value: 'https://app.startale.com/miniapp?url=test',
				configurable: true,
			})

			const communicator = new IframeCommunicator({ metadata, preference })
			expect(communicator).toBeDefined()

			Object.defineProperty(document, 'referrer', {
				value: '',
				configurable: true,
			})
		})

		it('should throw when document.referrer has disallowed origin', () => {
			Object.defineProperty(document, 'referrer', {
				value: 'https://evil.com/page',
				configurable: true,
			})

			expect(() => {
				new IframeCommunicator({ metadata, preference })
			}).toThrow('Iframe communication is not allowed')

			Object.defineProperty(document, 'referrer', {
				value: '',
				configurable: true,
			})
		})
	})

	describe('onMessage', () => {
		it('should resolve when matching message received from parent', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			const testData = { requestId: 'test-123', data: 'hello' }
			queueParentMessage(testData)

			const result = await communicator.onMessage(() => true)
			expect(result).toEqual(testData)
		})

		it('should add and remove event listener', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			queueParentMessage({ requestId: 'test-123' })

			const promise = communicator.onMessage(() => true)
			expect(addEventListenerSpy).toHaveBeenCalledWith(
				'message',
				expect.any(Function),
			)

			await promise
			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'message',
				expect.any(Function),
			)
		})

		it('should reject messages from wrong origin', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Dispatch from wrong origin — should be ignored
			const wrongOriginEvent = new MessageEvent('message', {
				data: { requestId: 'wrong' },
				origin: 'https://evil.com',
				source: mockParent as unknown as MessageEventSource,
			})
			window.dispatchEvent(wrongOriginEvent)

			// Dispatch correct message
			queueParentMessage({ requestId: 'correct' }, 100)

			const result = await communicator.onMessage(() => true)
			expect(result).toEqual({ requestId: 'correct' })
		})

		it('should filter by predicate', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Dispatch non-matching message first
			setTimeout(
				() => dispatchParentMessage({ requestId: 'no-match' }),
				30,
			)
			// Dispatch matching message
			setTimeout(
				() =>
					dispatchParentMessage({
						requestId: 'match',
						data: 'found',
					}),
				60,
			)

			const result = await communicator.onMessage(
				({ requestId }) => requestId === 'match',
			)
			expect(result).toEqual({ requestId: 'match', data: 'found' })
		})
	})

	describe('waitForPopupLoaded', () => {
		it('should post PopupLoaded to parent and wait for setup response', async () => {
			const mockUUID = 'mock-popup-loaded-uuid'
			const spy = vi
				.spyOn(crypto, 'randomUUID')
				.mockReturnValue(
					mockUUID as `${string}-${string}-${string}-${string}-${string}`,
				)

			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Queue the setup response
			queueParentMessage({
				requestId: mockUUID,
				id: 'setup-response-id',
			})

			await communicator.waitForPopupLoaded()

			// Verify PopupLoaded was posted to parent
			expect(mockParent.postMessage).toHaveBeenCalledWith(
				{ id: mockUUID, event: 'PopupLoaded' },
				PARENT_ORIGIN,
			)

			// Verify version info was sent back to parent
			expect(mockParent.postMessage).toHaveBeenCalledWith(
				{
					requestId: 'setup-response-id',
					data: {
						version: PACKAGE_VERSION,
						sdkName: PACKAGE_NAME,
						metadata,
						preference,
						location: window.location.toString(),
					},
				},
				PARENT_ORIGIN,
			)

			spy.mockRestore()
		})

		it('should resolve immediately on subsequent calls', async () => {
			const spy = vi
				.spyOn(crypto, 'randomUUID')
				.mockReturnValue(
					'test-uuid-2' as `${string}-${string}-${string}-${string}-${string}`,
				)

			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Complete first handshake
			queueParentMessage({ requestId: 'test-uuid-2', id: 'setup-id' })
			await communicator.waitForPopupLoaded()

			const callCount = mockParent.postMessage.mock.calls.length

			// Second call should resolve immediately without posting
			await communicator.waitForPopupLoaded()
			expect(mockParent.postMessage.mock.calls.length).toBe(callCount)

			spy.mockRestore()
		})
	})

	describe('postMessage', () => {
		it('should post message to parent after handshake', async () => {
			const spy = vi
				.spyOn(crypto, 'randomUUID')
				.mockReturnValue(
					'test-uuid-3' as `${string}-${string}-${string}-${string}-${string}`,
				)

			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Complete handshake
			queueParentMessage({ requestId: 'test-uuid-3', id: 'setup-id' })
			await communicator.waitForPopupLoaded()

			mockParent.postMessage.mockClear()

			// Post a message
			const testMessage = { requestId: 'req-1', data: 'test' }
			await communicator.postMessage(testMessage)

			expect(mockParent.postMessage).toHaveBeenCalledWith(
				testMessage,
				PARENT_ORIGIN,
			)

			spy.mockRestore()
		})
	})

	describe('postRequestAndWaitForResponse', () => {
		it('should post request and resolve with response', async () => {
			const spy = vi
				.spyOn(crypto, 'randomUUID')
				.mockReturnValue(
					'test-uuid-4' as `${string}-${string}-${string}-${string}-${string}`,
				)

			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Complete handshake
			queueParentMessage({ requestId: 'test-uuid-4', id: 'setup-id' })
			await communicator.waitForPopupLoaded()

			mockParent.postMessage.mockClear()

			const request = {
				id: 'request-1' as string,
				data: { method: 'test' },
			}

			// Queue response for the request
			queueParentMessage({
				requestId: 'request-1',
				data: { result: 'ok' },
			})

			const response =
				await communicator.postRequestAndWaitForResponse(request)

			expect(mockParent.postMessage).toHaveBeenCalledWith(
				request,
				PARENT_ORIGIN,
			)
			expect(response).toEqual({
				requestId: 'request-1',
				data: { result: 'ok' },
			})

			spy.mockRestore()
		})
	})

	describe('disconnect', () => {
		it('should reject pending listeners and clear them', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Start listening for a message that never matches
			const messagePromise = communicator.onMessage(() => false)

			// Disconnect should reject all pending listeners
			communicator.disconnect()

			await expect(messagePromise).rejects.toThrow('Request rejected')
		})

		it('should remove event listeners on disconnect', async () => {
			const communicator = new IframeCommunicator({
				metadata,
				preference,
				parentOrigin: PARENT_ORIGIN,
			})

			// Start a pending listener
			communicator.onMessage(() => false).catch(() => {})

			removeEventListenerSpy.mockClear()

			communicator.disconnect()

			expect(removeEventListenerSpy).toHaveBeenCalledWith(
				'message',
				expect.any(Function),
			)
		})
	})
})
