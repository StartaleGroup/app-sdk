import { standardErrorCodes } from './constants.js'
import { standardErrors } from './errors.js'
import { serializeError } from './serialize.js'

// serializeError intentionally returns an empty docUrl: there is no Startale
// error reference page to link to yet (see serialize.ts).
describe('serializeError', () => {
	test('with ErrorResponse object', () => {
		const errorResponse = {
			method: 'generic',
			errorMessage: 'test ErrorResponse object',
			errorCode: standardErrorCodes.provider.unsupportedMethod,
		}

		const serialized = serializeError(errorResponse)
		expect(serialized.code).toEqual(
			standardErrorCodes.provider.unsupportedMethod,
		)
		expect(serialized.message).toEqual('test ErrorResponse object')
		expect(serialized.docUrl).toBe('')
	})

	test('with standardError', () => {
		const error = standardErrors.provider.userRejectedRequest({})

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(
			standardErrorCodes.provider.userRejectedRequest,
		)
		expect(serialized.message).toEqual(error.message)
		expect(serialized.stack).toEqual(expect.stringContaining('User rejected'))
		expect(serialized.docUrl).toBe('')
	})

	test('with unsupportedChain', () => {
		const error = standardErrors.provider.unsupportedChain()

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(
			standardErrorCodes.provider.unsupportedChain,
		)
		expect(serialized.message).toEqual(error.message)
		expect(serialized.stack).toEqual(
			expect.stringContaining('Unrecognized chain ID'),
		)
		expect(serialized.docUrl).toBe('')
	})

	test('with Error object', () => {
		const error = new Error('test Error object')

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('test Error object')
		expect(serialized.stack).toEqual(
			expect.stringContaining('test Error object'),
		)
		expect(serialized.docUrl).toBe('')
	})

	test('with string', () => {
		const error = 'test error with just string'

		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('test error with just string')
		expect(serialized.docUrl).toBe('')
	})

	test('with unknown type', () => {
		const error = { unknown: 'error' }
		const serialized = serializeError(error)
		expect(serialized.code).toEqual(standardErrorCodes.rpc.internal)
		expect(serialized.message).toEqual('Unspecified error message.')
		expect(serialized.docUrl).toBe('')
	})
})
