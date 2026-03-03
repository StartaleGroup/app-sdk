import { Message, MessageID } from '../message/Message.js'

export interface ICommunicator {
	postMessage(message: Message): Promise<void>
	postRequestAndWaitForResponse<M extends Message>(
		request: Message & { id: MessageID },
	): Promise<M>
	onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M>
	waitForPopupLoaded?(): Promise<Window | void>
}
