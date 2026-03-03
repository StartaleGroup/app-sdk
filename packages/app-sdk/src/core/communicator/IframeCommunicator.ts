import { PACKAGE_NAME, PACKAGE_VERSION } from ':core/constants.js'
import { standardErrors } from ':core/error/errors.js'
import { AppMetadata, Preference } from ':core/provider/interface.js'

import { ConfigMessage } from '../message/ConfigMessage.js'
import { Message, MessageID } from '../message/Message.js'
import type { ICommunicator } from './ICommunicator.js'
import { isAllowedOrigin } from './iframeUtils.js'

export type IframeCommunicatorOptions = {
	metadata: AppMetadata
	preference: Preference
	parentOrigin?: string
}

/**
 * Communicates with the parent window (Startale app) when running inside an iframe.
 * Instead of opening a popup, messages are sent to window.parent via postMessage.
 *
 * Parent origin is resolved in one of two ways:
 * 1. Explicitly via the `parentOrigin` constructor option (validated immediately).
 * 2. Discovered from `event.origin` during the PopupLoaded handshake (validated then).
 *
 * This avoids reliance on `document.referrer`, which is unreliable across
 * browsers, referrer policies, and HMR reloads.
 */
export class IframeCommunicator implements ICommunicator {
	private readonly metadata: AppMetadata
	private readonly preference: Preference
	private parentOrigin: string | null
	private setupComplete = false
	private listeners = new Map<
		(_: MessageEvent) => void,
		{ reject: (_: Error) => void }
	>()

	constructor({ metadata, preference, parentOrigin }: IframeCommunicatorOptions) {
		this.metadata = metadata
		this.preference = preference

		if (parentOrigin) {
			if (!isAllowedOrigin(parentOrigin)) {
				throw standardErrors.provider.unauthorized(
					`Iframe communication is not allowed with parent origin: ${parentOrigin}`,
				)
			}
			this.parentOrigin = parentOrigin
		} else {
			// Origin will be discovered and validated during the handshake
			this.parentOrigin = null
		}
	}

	private getTargetOrigin(): string {
		return this.parentOrigin ?? '*'
	}

	/**
	 * Posts a message to the parent window
	 */
	postMessage = async (message: Message) => {
		await this.waitForPopupLoaded()
		window.parent.postMessage(message, this.getTargetOrigin())
	}

	/**
	 * Posts a request to the parent window and waits for a response
	 */
	postRequestAndWaitForResponse = async <M extends Message>(
		request: Message & { id: MessageID },
	): Promise<M> => {
		const responsePromise = this.onMessage<M>(
			({ requestId }) => requestId === request.id,
		)
		await this.postMessage(request)
		return await responsePromise
	}

	/**
	 * Listens for messages from the parent window that match a given predicate.
	 */
	onMessage = async <M extends Message>(
		predicate: (_: Partial<M>) => boolean,
	): Promise<M> => {
		return new Promise((resolve, reject) => {
			const listener = (event: MessageEvent<M>) => {
				if (!this.isFromParent(event)) return

				const message = event.data
				if (predicate(message)) {
					resolve(message)
					window.removeEventListener('message', listener)
					this.listeners.delete(listener)
				}
			}

			window.addEventListener('message', listener)
			this.listeners.set(listener, { reject })
		})
	}

	/**
	 * Signals readiness to the parent window and waits for the setup message.
	 * On first call: posts PopupLoaded to parent, waits for setup response.
	 * If parentOrigin was not provided, discovers and validates it from the
	 * handshake response's event.origin.
	 * On subsequent calls: resolves immediately.
	 */
	waitForPopupLoaded = async (): Promise<void> => {
		if (this.setupComplete) {
			return
		}

		const popupLoadedMessage: ConfigMessage & { id: MessageID } = {
			id: crypto.randomUUID(),
			event: 'PopupLoaded',
		}

		// Post PopupLoaded to parent ('*' if origin not yet known)
		window.parent.postMessage(popupLoadedMessage, this.getTargetOrigin())

		// Wait for setup response. Use a direct listener so we can access
		// event.origin to discover and validate the parent origin.
		const setupMessage = await new Promise<Message & { id: MessageID }>((resolve, reject) => {
			const listener = (event: MessageEvent) => {
				if (event.source !== window.parent) return
				if (event.data?.requestId !== popupLoadedMessage.id) return

				// Discover parent origin from the handshake response
				if (!this.parentOrigin) {
					if (!isAllowedOrigin(event.origin)) {
						window.removeEventListener('message', listener)
						reject(
							standardErrors.provider.unauthorized(
								`Iframe communication is not allowed with parent origin: ${event.origin}`,
							),
						)
						return
					}
					this.parentOrigin = event.origin
				} else if (event.origin !== this.parentOrigin) {
					return // Wrong origin, ignore
				}

				const msg = event.data as Message
				if (!msg.id) {
					window.removeEventListener('message', listener)
					reject(
						standardErrors.provider.unauthorized(
							'Setup message from parent is missing an id',
						),
					)
					return
				}

				window.removeEventListener('message', listener)
				resolve(msg as Message & { id: MessageID })
			}

			window.addEventListener('message', listener)
		})

		// Send version/metadata info back to parent using validated origin
		window.parent.postMessage(
			{
				requestId: setupMessage.id,
				data: {
					version: PACKAGE_VERSION,
					sdkName: PACKAGE_NAME,
					metadata: this.metadata,
					preference: this.preference,
					location: window.location.toString(),
				},
			},
			this.getTargetOrigin(),
		)

		this.setupComplete = true
	}

	/**
	 * Clears listeners but does NOT close anything (the iframe persists).
	 */
	disconnect = () => {
		this.listeners.forEach(({ reject }, listener) => {
			reject(standardErrors.provider.userRejectedRequest('Request rejected'))
			window.removeEventListener('message', listener)
		})
		this.listeners.clear()
	}

	private isFromParent(event: MessageEvent): boolean {
		if (this.parentOrigin !== '*' && event.origin !== this.parentOrigin) {
			return false
		}
		return event.source === window.parent
	}
}
