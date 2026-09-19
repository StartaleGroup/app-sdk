import * as acorn from 'acorn'
// Define the whitelist of allowed operations
export const WHITELIST = {
	// Allowed SDK functions
	allowedFunctions: ['pay', 'getPaymentStatus'],

	// Allowed object properties and methods
	allowedObjects: {
		base: ['pay', 'getPaymentStatus'],
		console: ['log', 'error', 'warn', 'info'],
		Promise: ['resolve', 'reject', 'all', 'race'],
		Object: ['keys', 'values', 'entries', 'assign'],
		Array: ['isArray', 'from'],
		JSON: ['stringify', 'parse'],
		Math: ['floor', 'ceil', 'round', 'min', 'max', 'abs'],
	} as Record<string, string[]>,

	// Allowed keywords and statements
	allowedStatements: [
		'VariableDeclaration',
		'VariableDeclarator', // Added: Part of variable declarations
		'FunctionDeclaration',
		'FunctionExpression',
		'ArrowFunctionExpression',
		'BlockStatement',
		'ExpressionStatement',
		'ReturnStatement',
		'IfStatement',
		'TryStatement',
		'CatchClause',
		'ThrowStatement',
		'AwaitExpression',
		'CallExpression',
		'MemberExpression',
		'Identifier',
		'Literal',
		'TemplateLiteral',
		'TemplateElement', // Added: Part of template literals
		'ObjectExpression',
		'ArrayExpression',
		'Property',
		'AssignmentExpression',
		'BinaryExpression',
		'UnaryExpression',
		'ConditionalExpression',
		'LogicalExpression',
		'UpdateExpression',
		'SpreadElement',
		'ForStatement', // Added: For loops
		'ForInStatement', // Added: For-in loops
		'ForOfStatement', // Added: For-of loops
		'WhileStatement', // Added: While loops
		'DoWhileStatement', // Added: Do-while loops
		'BreakStatement', // Added: Break statements
		'ContinueStatement', // Added: Continue statements
		'SwitchStatement', // Added: Switch cases
		'SwitchCase', // Added: Switch cases
		'AssignmentPattern', // Added: Destructuring assignments
		'ObjectPattern', // Added: Object destructuring
		'ArrayPattern', // Added: Array destructuring
		'RestElement', // Added: Rest parameters
		'ChainExpression', // Added: Optional chaining
		'OptionalMemberExpression', // Added: Optional member access
		'OptionalCallExpression', // Added: Optional function calls
		'SequenceExpression', // Added: Comma operator
		// NOTE: 'ThisExpression' is intentionally NOT allowed. Inside the
		// AsyncFunction wrapper used by useCodeExecution, a sloppy-mode `this`
		// resolves to the page's global object, so any `this`-rooted chain is a
		// scope-escape primitive.
	],

	// Disallowed global objects and functions
	disallowedGlobals: [
		'eval',
		'Function',
		'AsyncFunction',
		'GeneratorFunction',
		'AsyncGeneratorFunction',
		'require',
		'import',
		'export',
		'process',
		'global',
		'globalThis',
		'self',
		'window',
		'document',
		'Proxy',
		'Reflect',
		'constructor',
		'__proto__',
		'__defineGetter__',
		'__defineSetter__',
		'__lookupGetter__',
		'__lookupSetter__',
		'XMLHttpRequest',
		'fetch',
		'WebSocket',
		'Worker',
		'SharedWorker',
		'ServiceWorker',
		'importScripts',
		'WebAssembly',
		'localStorage',
		'sessionStorage',
		'indexedDB',
		'crypto',
		'location',
		'history',
		'navigator',
		'__dirname',
		'__filename',
		'module',
		'exports',
		'Buffer',
		'setInterval',
		'setTimeout',
		'setImmediate',
		'clearInterval',
		'clearTimeout',
		'clearImmediate',
	],
}

type ValidationError = {
	message: string
	line?: number
	column?: number
}

type ASTNode = {
	body?: ASTNode[]
	type?: string
	loc?: { start: { line: number; column: number } }
	callee?: ASTNode
	object?: ASTNode
	property?: ASTNode
	key?: ASTNode
	name?: string
	value?: unknown
	computed?: boolean
	expressions?: ASTNode[]
	quasis?: ASTNode[]
	[key: string]: unknown
}

export class CodeSanitizer {
	private errors: ValidationError[] = []

	private static readonly DANGEROUS_PROPERTIES = [
		// Prototype-chain traversal
		'constructor',
		'__proto__',
		'prototype',
		'__defineGetter__',
		'__defineSetter__',
		'__lookupGetter__',
		'__lookupSetter__',
		// Function-escape primitives
		'call',
		'apply',
		'bind',
		'caller',
		'callee',
		'arguments',
		// Code-evaluation surface reachable through member access
		'eval',
		'Function',
		'importScripts',
	]

	/** Sanitize and validate the code based on whitelist */
	sanitize(code: string): {
		isValid: boolean
		sanitizedCode: string
		errors: ValidationError[]
	} {
		this.errors = []

		try {
			// First, apply basic sanitization (remove imports, etc.)
			const preSanitized = this.applySanitization(code)

			// Wrap the code in an async function for parsing
			// This allows return statements and await expressions at the top level
			const wrappedCode = `async function __userCode__() {\n${preSanitized}\n}`

			// Parse the wrapped code into an AST
			const ast = acorn.parse(wrappedCode, {
				ecmaVersion: 2020,
				sourceType: 'module',
				locations: true,
			})

			// Extract the function body for validation
			// The AST structure will be: Program -> FunctionDeclaration -> BlockStatement
			const program = ast as acorn.Program
			const functionNode = program.body[0] as unknown as ASTNode
			if (functionNode?.body) {
				// Validate the function body
				this.validateNode(functionNode.body as unknown as ASTNode)
			}

			// If validation passes, return the sanitized code
			if (this.errors.length === 0) {
				return {
					isValid: true,
					sanitizedCode: preSanitized,
					errors: [],
				}
			}

			return {
				isValid: false,
				sanitizedCode: '',
				errors: this.errors,
			}
		} catch (error) {
			// Parse error - try to extract meaningful line number
			if (error instanceof SyntaxError) {
				const match = error.message.match(/\((\d+):(\d+)\)/)
				let line: number | undefined
				let column: number | undefined

				if (match) {
					// Adjust line number since we wrapped the code
					line = Number.parseInt(match[1], 10) - 1
					column = Number.parseInt(match[2], 10)
				}

				this.errors.push({
					message: error.message.replace(
						/\(\d+:\d+\)/,
						line ? `(${line}:${column})` : '',
					),
					line,
					column,
				})
			} else {
				this.errors.push({
					message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
				})
			}

			return {
				isValid: false,
				sanitizedCode: '',
				errors: this.errors,
			}
		}
	}

	/**
	 * Recursively validate AST nodes
	 */
	private validateNode(node: ASTNode): void {
		if (!node) return

		// Check if the node type is allowed
		if (!WHITELIST.allowedStatements.includes(node.type)) {
			this.errors.push({
				message: `Disallowed statement type: ${node.type}`,
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
			return
		}

		// Special validation for specific node types
		switch (node.type) {
			case 'CallExpression':
				this.validateCallExpression(node)
				break

			case 'MemberExpression':
				this.validateMemberExpression(node)
				break

			case 'Property':
				this.validateProperty(node)
				break

			case 'Identifier':
				this.validateIdentifier(node)
				break

			case 'NewExpression':
				this.errors.push({
					message: 'Constructor calls are not allowed',
					line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
					column: node.loc?.start.column,
				})
				return

			default:
				break
		}

		// Recursively validate child nodes. Only real AST nodes (which always
		// carry a `type` field) are walked. Value bags such as
		// TemplateElement.value ({ raw, cooked }) or Literal.regex are plain
		// objects without a type; walking them produced spurious
		// "Disallowed statement type: undefined" errors that made template
		// literals and regex literals unusable. Semantic content that can hide
		// executable code (e.g. TemplateLiteral.expressions) is still walked.
		for (const key in node) {
			if (key === 'loc' || key === 'range' || key === 'type') continue

			const child = node[key]
			if (Array.isArray(child)) {
				for (const item of child) {
					if (
						item &&
						typeof item === 'object' &&
						typeof (item as ASTNode).type === 'string'
					) {
						this.validateNode(item as ASTNode)
					}
				}
			} else if (
				child &&
				typeof child === 'object' &&
				typeof (child as ASTNode).type === 'string'
			) {
				this.validateNode(child as ASTNode)
			}
		}
	}

	/**
	 * Validate function calls
	 */
	private validateCallExpression(node: ASTNode): void {
		const callee = node.callee
		if (!callee) return

		// Check if it's a direct function call
		if (callee.type === 'Identifier') {
			const funcName = callee.name

			// Check if it's a disallowed global (allowed SDK functions skip)
			if (
				!WHITELIST.allowedFunctions.includes(funcName) &&
				WHITELIST.disallowedGlobals.includes(funcName)
			) {
				this.errors.push({
					message: `Function '${funcName}' is not allowed`,
					line: node.loc?.start.line
						? node.loc.start.line - 1
						: undefined,
					column: node.loc?.start.column,
				})
			}
			return
		}

		// Check if it's a method call
		if (callee.type === 'MemberExpression') {
			this.validateMemberExpression(callee)
			return
		}

		// SECURITY: fail closed on any other callee shape. Computed call
		// targets such as `(0, eval)(...)` sequences, conditional expressions,
		// or call results cannot be statically checked against the denylist.
		this.errors.push({
			message: 'Calls on dynamic targets are not allowed',
			line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
			column: node.loc?.start.column,
		})
	}

	/**
	 * Resolve a property/key AST node to its static string value.
	 *
	 * Returns null when the value cannot be determined at analysis time.
	 * SECURITY: this is intentionally fail-closed. A computed key built from
	 * anything other than a primitive literal (or a template literal with zero
	 * interpolations) has a runtime value the denylist cannot inspect, so the
	 * caller must reject it instead of skipping the check.
	 */
	private resolveStaticKey(key: ASTNode, computed: boolean): string | null {
		// Non-computed access (a.b): the key is always a plain Identifier
		if (!computed) {
			return key.type === 'Identifier' ? (key.name ?? '') : null
		}

		// Static primitive literal: a['b'] / a[0] / a[true]
		if (key.type === 'Literal') {
			const valueType = typeof key.value
			if (
				valueType === 'string' ||
				valueType === 'number' ||
				valueType === 'boolean'
			) {
				return String(key.value)
			}
			return null
		}

		// Fully static template literal: a[`b`] (no ${} interpolations)
		if (key.type === 'TemplateLiteral') {
			const expressions = key.expressions as unknown[] | undefined
			const quasis = key.quasis as
				| Array<{ value?: { cooked?: string } }>
				| undefined
			if (
				Array.isArray(expressions) &&
				expressions.length === 0 &&
				quasis &&
				quasis.length === 1
			) {
				return quasis[0].value?.cooked ?? ''
			}
			return null
		}

		// Everything else (BinaryExpression such as 'constr' + 'uctor',
		// Identifier references, call results, interpolated templates,
		// member expressions, ...) is dynamic and cannot be resolved.
		return null
	}

	/**
	 * Validate member expressions (object.property)
	 */
	private validateMemberExpression(node: ASTNode): void {
		// Get the object root name when statically trackable. Chains are
		// validated recursively by the generic walk, so only the root matters
		// here for allowlist/denylist lookups.
		let objectName = ''
		if (node.object.type === 'Identifier') {
			objectName = node.object.name
		} else if (
			node.object.type === 'MemberExpression' &&
			node.object.object.type === 'Identifier'
		) {
			objectName = node.object.object.name
		}

		// SECURITY: resolve the property name statically. Computed access with
		// a dynamic key (string concatenation, variables, call results,
		// interpolated templates) cannot be checked against the denylist, so it
		// is rejected outright. This closes the bypass class where
		// `obj['constr' + 'uctor']` or `obj[key]` walks the prototype chain to
		// Function regardless of what the receiver is.
		const propertyName = node.property
			? this.resolveStaticKey(node.property, node.computed === true)
			: null

		if (propertyName === null) {
			this.errors.push({
				message:
					'Dynamic computed property access is not allowed. Use a static property key (dot access, string literal, or a template literal without interpolation) instead.',
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
			return
		}

		// Block prototype-chain traversal and function-escape properties on
		// any receiver, including literals like [] and {}.
		if (
			propertyName &&
			CodeSanitizer.DANGEROUS_PROPERTIES.includes(propertyName)
		) {
			this.errors.push({
				message: `Property '${propertyName}' is not allowed`,
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
			return
		}

		// Validate against whitelist
		if (objectName && objectName in WHITELIST.allowedObjects) {
			const allowedProps = WHITELIST.allowedObjects[objectName]
			if (propertyName && !allowedProps.includes(propertyName)) {
				this.errors.push({
					message: `Property '${objectName}.${propertyName}' is not allowed`,
					line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
					column: node.loc?.start.column,
				})
			}
		} else if (
			objectName &&
			WHITELIST.disallowedGlobals.includes(objectName)
		) {
			this.errors.push({
				message: `Object '${objectName}' is not allowed`,
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
		}
	}

	/**
	 * Validate property keys in object literals and destructuring patterns.
	 *
	 * SECURITY: keys must be statically resolvable and must not be denylisted.
	 * Without this check, destructuring re-binds the prototype-chain escape
	 * hatch into a fresh variable that later member/call checks cannot see,
	 * e.g. `const { ['constructor']: f } = []; f('return process')()`.
	 */
	private validateProperty(node: ASTNode): void {
		const key = node.key
		if (!key) return

		const keyName = this.resolveStaticKey(key, node.computed === true)

		if (keyName === null) {
			this.errors.push({
				message:
					'Dynamic computed property keys are not allowed. Use a static key instead.',
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
			return
		}

		if (keyName && CodeSanitizer.DANGEROUS_PROPERTIES.includes(keyName)) {
			this.errors.push({
				message: `Property key '${keyName}' is not allowed`,
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
		}
	}

	/**
	 * Validate identifiers
	 */
	private validateIdentifier(node: ASTNode): void {
		// Skip validation for allowed functions and objects
		if (WHITELIST.allowedFunctions.includes(node.name)) return
		if (node.name in WHITELIST.allowedObjects) return

		// Check for disallowed globals
		if (WHITELIST.disallowedGlobals.includes(node.name)) {
			this.errors.push({
				message: `Identifier '${node.name}' is not allowed`,
				line: node.loc?.start.line ? node.loc.start.line - 1 : undefined,
				column: node.loc?.start.column,
			})
		}
	}

	/** Apply sanitization transformations to the code */
	private applySanitization(code: string): string {
		let sanitized = code

		// Remove import statements
		sanitized = sanitized.replace(
			/^\s*import\s+.*?(?:from\s+['"][^'"]+['"])?[;\s]*$/gm,
			'',
		)

		// Remove multiline imports
		sanitized = sanitized.replace(
			/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm,
			'',
		)

		// Remove export statements
		sanitized = sanitized.replace(/^\s*export\s+.*?[;\s]*$/gm, '')

		// Clean up extra newlines
		sanitized = sanitized.replace(/^\s*\n/gm, '')

		return sanitized
	}
}

/** Convenience function to sanitize code */
export function sanitizeCode(code: string): {
	isValid: boolean
	sanitizedCode: string
	errors: ValidationError[]
} {
	const sanitizer = new CodeSanitizer()
	return sanitizer.sanitize(code)
}
