import { encodeFunctionData } from 'viem'
import { ShortcutType } from './ShortcutType'
import { ADDR_TO_FILL, CHAIN_ID_TO_FILL, SUBACCOUNT_ADDR_TO_FILL } from './const'

const data = encodeFunctionData({
	abi: [
		{
			name: 'count',
			type: 'function',
			stateMutability: 'nonpayable',
			inputs: [],
			outputs: [],
		},
	],
	functionName: 'count',
	args: [],
})

const walletSendCallsShortcuts: ShortcutType[] = [
	{
		key: 'wallet_sendCalls',
		data: {
			chainId: CHAIN_ID_TO_FILL,
			from: ADDR_TO_FILL,
			calls: [
				{
					to: '0x6bcf154A6B80fDE9bd1556d39C9bCbB19B539Bd8',
					data,
					value: '0x0',
				},
			],
			version: '1',
			capabilities: {
				paymaster: {
					url: 'https://paymaster.scs.startale.com/v1',
				},
			},
		},
	},
	{
		key: 'wallet_sendCalls (with subaccount)',
		data: {
			chainId: CHAIN_ID_TO_FILL,
			from: SUBACCOUNT_ADDR_TO_FILL,
			calls: [
				{
					to: '0x6bcf154A6B80fDE9bd1556d39C9bCbB19B539Bd8',
					data,
					value: '0x0',
				},
			],
			version: '1',
			capabilities: {
				paymaster: {
					url: 'https://paymaster.scs.startale.com/v1',
				},
			},
		},
	},
]

export const walletTxShortcutsMap = {
	wallet_sendCalls: walletSendCallsShortcuts,
}
