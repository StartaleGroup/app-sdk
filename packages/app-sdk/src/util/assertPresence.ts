import { standardErrors } from ':core/error/errors.js'

export function assertPresence<T>(
	value: T,
	error?: Error,
	message?: string,
): asserts value is NonNullable<T> {
	if (value === null || value === undefined) {
		throw (
			error ??
			standardErrors.rpc.invalidParams({
				message: message ?? 'value must be present',
				data: value,
			})
		)
	}
}
