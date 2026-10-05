import { assertPresence } from './assertPresence.js'

describe('assertPresence', () => {
	it('should throw an error if the value is null', () => {
		expect(() => assertPresence(null)).toThrow()
	})

	it('should throw an error if the value is undefined', () => {
		expect(() => assertPresence(undefined)).toThrow()
	})

	it('should throw an error if the value is null and an error is provided', () => {
		expect(() => assertPresence(null, new Error('test'))).toThrow()
	})

	it('should throw an error if the value is undefined and an error is provided', () => {
		expect(() => assertPresence(undefined, new Error('test'))).toThrow()
	})
})
