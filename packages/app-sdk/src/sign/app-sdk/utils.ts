import { isAddress } from 'viem'

import { standardErrors } from ':core/error/errors.js'
import { RequestArguments } from ':core/provider/interface.js'
import {
	EmptyFetchPermissionsRequest,
	FetchPermissionsRequest,
} from ':core/rpc/coinbase_fetchSpendPermissions.js'
import { WalletConnectResponse } from ':core/rpc/wallet_connect.js'
import { config, store } from ':store/store.js'
import { get } from ':util/get.js'

// ***************************************************************
// Utility
// ***************************************************************
export function assertParamsChainId(params: unknown): asserts params is [
	{
		chainId: `0x${string}`
	},
] {
	if (!params || !Array.isArray(params) || !params[0]?.chainId) {
		throw standardErrors.rpc.invalidParams()
	}
	if (
		typeof params[0].chainId !== 'string' &&
		typeof params[0].chainId !== 'number'
	) {
		throw standardErrors.rpc.invalidParams()
	}
}

export function assertGetCapabilitiesParams(
	params: unknown,
): asserts params is [`0x${string}`, `0x${string}`[]?] {
	if (
		!params ||
		!Array.isArray(params) ||
		(params.length !== 1 && params.length !== 2)
	) {
		throw standardErrors.rpc.invalidParams()
	}

	if (typeof params[0] !== 'string' || !isAddress(params[0])) {
		throw standardErrors.rpc.invalidParams()
	}

	if (params.length === 2) {
		if (!Array.isArray(params[1])) {
			throw standardErrors.rpc.invalidParams()
		}

		for (const param of params[1]) {
			if (typeof param !== 'string' || !param.startsWith('0x')) {
				throw standardErrors.rpc.invalidParams()
			}
		}
	}
}

export function injectRequestCapabilities<T extends RequestArguments>(
	request: T,
	capabilities: Record<string, unknown>,
) {
	const modifiedRequest = { ...request }

	if (capabilities && request.method.startsWith('wallet_')) {
		let requestCapabilities = get(modifiedRequest, 'params.0.capabilities')

		if (typeof requestCapabilities === 'undefined') {
			requestCapabilities = {}
		}

		if (typeof requestCapabilities !== 'object') {
			throw standardErrors.rpc.invalidParams()
		}

		requestCapabilities = {
			...capabilities,
			...requestCapabilities,
		}

		if (modifiedRequest.params && Array.isArray(modifiedRequest.params)) {
			modifiedRequest.params[0] = {
				...modifiedRequest.params[0],
				capabilities: requestCapabilities,
			}
		}
	}

	return modifiedRequest as T
}

export function assertFetchPermissionsRequest(
	request: RequestArguments,
): asserts request is FetchPermissionsRequest | EmptyFetchPermissionsRequest {
	if (
		request.method === 'coinbase_fetchPermissions' &&
		request.params === undefined
	) {
		return
	}

	if (
		request.method === 'coinbase_fetchPermissions' &&
		Array.isArray(request.params) &&
		request.params.length === 1 &&
		typeof request.params[0] === 'object'
	) {
		if (
			typeof request.params[0].account !== 'string' ||
			!request.params[0].chainId.startsWith('0x')
		) {
			throw standardErrors.rpc.invalidParams(
				'FetchPermissions - Invalid params: params[0].account must be a hex string',
			)
		}

		if (
			typeof request.params[0].chainId !== 'string' ||
			!request.params[0].chainId.startsWith('0x')
		) {
			throw standardErrors.rpc.invalidParams(
				'FetchPermissions - Invalid params: params[0].chainId must be a hex string',
			)
		}

		if (
			typeof request.params[0].spender !== 'string' ||
			!request.params[0].spender.startsWith('0x')
		) {
			throw standardErrors.rpc.invalidParams(
				'FetchPermissions - Invalid params: params[0].spender must be a hex string',
			)
		}

		return
	}

	throw standardErrors.rpc.invalidParams()
}

export function fillMissingParamsForFetchPermissions(
	request: FetchPermissionsRequest | EmptyFetchPermissionsRequest,
): FetchPermissionsRequest {
	if (request.params !== undefined) {
		return request as FetchPermissionsRequest
	}

	throw standardErrors.rpc.invalidParams(
		'FetchPermissions - params are required: account, chainId, and spender must be provided',
	)
}

/**
 * Checks if a specific capability is present in a request's params
 * @param request The request object to check
 * @param capabilityName The name of the capability to check for
 * @returns boolean indicating if the capability is present
 */
export function requestHasCapability(
	request: RequestArguments,
	capabilityName: string,
): boolean {
	if (!Array.isArray(request?.params)) return false
	const capabilities = request.params[0]?.capabilities
	if (!capabilities || typeof capabilities !== 'object') return false
	return capabilityName in capabilities
}

export async function getCachedWalletConnectResponse(): Promise<WalletConnectResponse | null> {
	const spendPermissions = store.spendPermissions.get()
	const accounts = store.account.get().accounts
	const userInfo = store.userInfo.get()
	const context = store.context.get()

	if (!accounts) {
		return null
	}

	const walletConnectAccounts = accounts?.map<
		WalletConnectResponse['accounts'][number]
	>((account) => ({
		address: account,
		capabilities: {
			spendPermissions:
				spendPermissions.length > 0
					? { permissions: spendPermissions }
					: undefined,
		},
	}))

	const hasUserInfo = userInfo && Object.keys(userInfo).length > 0
	const hasContext = context && Object.keys(context).length > 0

	return {
		accounts: walletConnectAccounts,
		...(hasUserInfo
			? { userInfo: userInfo as WalletConnectResponse['userInfo'] }
			: {}),
		...(hasContext
			? { context: context as WalletConnectResponse['context'] }
			: {}),
	}
}

/** Adds paymaster service information to a wallet_sendCalls request if configured for the given chainId
 * @param request The original request object
 * @param chainId The chain ID to check for paymaster configuration
 * @returns The modified request object with paymaster information if applicable
 */
export function addPaymasterToRequest<T extends RequestArguments>(
	request: T,
	chainId: number,
): T {
	if (request.method !== 'wallet_sendCalls') {
		return request
	}

	const paymasterOptions = config.get().paymasterOptions
	const optionsForChain = paymasterOptions?.[chainId]
	if (!optionsForChain) {
		return request
	}

	return injectRequestCapabilities(request, {
		paymasterService: {
			url: optionsForChain.url,
			id: optionsForChain.id,
		},
	})
}
