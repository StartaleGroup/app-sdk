import type { NextApiRequest, NextApiResponse } from 'next'

// Startale Cloud Services (SCS) paymaster proxy.
//
// Why this exists:
//   The Startale App SDK takes a `paymasterOptions[chainId].url`. The SCS
//   paymaster URL embeds the API key as a query param
//   (`?apikey=...`); if the dApp passed that URL directly the key would be
//   visible in DevTools to every user. Instead, the dApp exposes a
//   same-origin proxy URL and keeps the SCS API key server-side.
//
// The proxy:
//   1. Receives the JSON-RPC body the wallet sends to the paymaster
//      (ERC-7677 `pm_getPaymasterStubData` / `pm_getPaymasterData`).
//   2. Injects `context: { paymasterId }` so the dApp's provisioned SCS
//      paymaster policy is applied.
//   3. Forwards to SCS with the API key in the query string.
//
// Production apps should also authenticate the caller here (session cookie,
// signed message, etc.) before forwarding — anyone hitting this route can
// spend sponsorship budget within the policy limits.

// SCS paymaster supports Soneium networks. The chain is conveyed by the
// `chainId` argument inside the JSON-RPC call, not the endpoint — this set
// only guards against forwarding requests for unsupported chains.
const SUPPORTED_CHAIN_IDS = new Set([
	1868, // Soneium mainnet
	1946, // Soneium Minato testnet
])

const PAYMASTER_METHODS = new Set(['pm_getPaymasterData', 'pm_getPaymasterStubData'])

type JsonRpcRequest = {
	jsonrpc?: string
	id?: number | string | null
	method?: string
	params?: unknown[]
}

// Allowed CORS origin. Defaults to `*` for local dev; set
// `PAYMASTER_ALLOWED_ORIGIN` in deployments to lock the proxy down so arbitrary
// third-party sites can't invoke it from a browser and consume sponsorship.
const setCors = (res: NextApiResponse): void => {
	res.setHeader(
		'Access-Control-Allow-Origin',
		process.env.PAYMASTER_ALLOWED_ORIGIN ?? '*',
	)
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
	res.setHeader('Access-Control-Allow-Headers', 'content-type')
}

// SCS API keys and paymaster IDs are provisioned per network in the SCS
// portal. Prefer a chain-specific value, falling back to a shared one.
const envForChain = (prefix: string, chainId: number): string | undefined =>
	process.env[`${prefix}_${chainId}`] ?? process.env[prefix]

const injectPaymasterId = (
	body: JsonRpcRequest,
	paymasterId: string,
): JsonRpcRequest => {
	if (!body.method || !PAYMASTER_METHODS.has(body.method)) return body
	if (!Array.isArray(body.params) || body.params.length === 0) return body

	const last = body.params[body.params.length - 1]
	const isContext = typeof last === 'object' && last !== null && !Array.isArray(last)
	const existingContext = (isContext ? (last as Record<string, unknown>) : {}) as {
		paymasterId?: string
	}

	const mergedContext = {
		...existingContext,
		paymasterId: existingContext.paymasterId ?? paymasterId,
	}
	const params = isContext
		? [...body.params.slice(0, -1), mergedContext]
		: [...body.params, mergedContext]

	return { ...body, params }
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
): Promise<void> {
	setCors(res)

	if (req.method === 'OPTIONS') {
		res.status(204).end()
		return
	}

	if (req.method !== 'POST') {
		res.status(405).json({ error: 'method not allowed' })
		return
	}

	const chainIdParam = Array.isArray(req.query.chainId)
		? req.query.chainId[0]
		: req.query.chainId
	const chainId = Number(chainIdParam)

	if (!SUPPORTED_CHAIN_IDS.has(chainId)) {
		res.status(400).json({ error: `unsupported chainId: ${chainIdParam}` })
		return
	}

	const paymasterUrl = envForChain('PAYMASTER_URL', chainId)
	const paymasterId = envForChain('PAYMASTER_ID', chainId)

	if (!paymasterUrl || !paymasterId) {
		res.status(500).json({
			error: 'paymaster not configured: set PAYMASTER_URL and PAYMASTER_ID',
		})
		return
	}

	const body = (req.body ?? {}) as JsonRpcRequest

	// This route exists only to proxy ERC-7677 paymaster calls. Reject anything
	// else so it can't be used to relay arbitrary JSON-RPC to the SCS endpoint.
	if (!body.method || !PAYMASTER_METHODS.has(body.method)) {
		res.status(400).json({
			error: `unsupported paymaster method: ${body.method ?? '(none)'}`,
		})
		return
	}

	const upstreamBody = injectPaymasterId(body, paymasterId)

	let upstream: Response
	try {
		upstream = await fetch(paymasterUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(upstreamBody),
		})
	} catch (err) {
		// Network-level failure reaching SCS (DNS, timeout, refused). Surface a
		// 502 with detail instead of a generic Next 500 so it's debuggable.
		res.status(502).json({
			error: 'paymaster upstream unreachable',
			detail: err instanceof Error ? err.message : String(err),
		})
		return
	}

	const text = await upstream.text()
	res.status(upstream.status)
	res.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json')
	res.send(text)
}
