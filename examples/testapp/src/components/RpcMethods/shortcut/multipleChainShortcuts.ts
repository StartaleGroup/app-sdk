import { mainnet, soneium, soneiumMinato } from 'viem/chains'

import type { ShortcutType } from './ShortcutType'

const walletSwitchEthereumChainShortcuts: ShortcutType[] = [
	{
		key: 'Soneium',
		data: {
			chainId: soneium.id.toString(),
			chain: soneium,
		},
	},
	{
		key: 'Minato',
		data: {
			chainId: soneiumMinato.id.toString(),
			chain: soneiumMinato,
		},
	},
	{
		key: 'Ethereum',
		data: {
			chainId: mainnet.id.toString(),
			chain: mainnet,
		},
	},
]

const walletAddEthereumChainShortcuts: ShortcutType[] = [
	{
		key: 'Harmony',
		data: {
			chainId: '1666600000',
			chainName: 'Harmony Mainnet',
			currencyName: 'ONE',
			currencySymbol: 'ONE',
			decimals: '18',
			rpcUrl: 'https://api.harmony.one',
			blockExplorerUrl: 'https://explorer.harmony.one',
			iconUrl: '',
		},
	},
]

const walletWatchAsset: ShortcutType[] = [
	{
		key: 'WONE on Harmony',
		data: {
			type: 'ERC20',
			contractAddress: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a',
			symbol: 'WONE',
			decimals: '18',
		},
	},
]

export const multiChainShortcutsMap = {
	wallet_switchEthereumChain: walletSwitchEthereumChainShortcuts,
	wallet_addEthereumChain: walletAddEthereumChainShortcuts,
	wallet_watchAsset: walletWatchAsset,
}
