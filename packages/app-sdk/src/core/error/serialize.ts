import { standardErrorCodes } from './constants.js'
import { serialize } from './utils.js'

/**
 * Serializes an error to a format that is compatible with the Ethereum JSON RPC error format.
 */
export function serializeError(error: unknown) {
	const serialized = serialize(getErrorObject(error), {
		shouldIncludeStack: true,
	})

	return {
		...serialized,
		// Always empty: there is no public error-documentation site to link to yet.
		// The field is kept so the serialized error shape stays stable for consumers.
		docUrl: '',
	}
}

type ErrorResponse = {
	method: unknown
	errorCode?: number
	errorMessage: string
}

function isErrorResponse(response: unknown): response is ErrorResponse {
	return (response as ErrorResponse).errorMessage !== undefined
}

/**
 * Converts an error to a serializable object.
 */
function getErrorObject(error: string | ErrorResponse | unknown) {
	if (typeof error === 'string') {
		return {
			message: error,
			code: standardErrorCodes.rpc.internal,
		}
	}
	if (isErrorResponse(error)) {
		const message = error.errorMessage
		const code =
			error.errorCode ??
			(message.match(/(denied|rejected)/i)
				? standardErrorCodes.provider.userRejectedRequest
				: undefined)

		return {
			...error,
			message,
			code,
			data: { method: error.method },
		}
	}
	return error
}
