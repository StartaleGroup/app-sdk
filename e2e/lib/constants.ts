export const BASE_URL = 'http://localhost:3001'

/**
 * SCW (Smart Contract Wallet) URL used by the testapp.
 * Defaults to production; override via SCW_URL env var for local testing.
 */
export const SCW_URL = process.env.SCW_URL || 'https://app.startale.com/'

export const ROUTES = {
	dashboard: '/dashboard',
} as const

export const CHAIN_IDS = {
	SONEIUM: '0x74c', // 1868
	MINATO: '0x79a', // 1946
} as const

export const SONEIUM_CHAIN = {
	networkName: 'Soneium',
	rpc: 'https://rpc.soneium.org/',
	chainId: 1868,
	symbol: 'ETH',
} as const
