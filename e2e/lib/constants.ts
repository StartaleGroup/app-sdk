export const ROUTES = {
	dashboard: '/dashboard',
} as const

export const TIMEOUTS = {
	popupLoad: 30_000,
	popupClose: 60_000,
	authRedirect: 15_000,
	rpcResponse: 30_000,
	walletAction: 15_000,
} as const

export const SONEIUM_CHAIN = {
	networkName: 'Soneium',
	rpc: 'https://rpc.soneium.org/',
	chainId: 1868,
	symbol: 'ETH',
} as const
