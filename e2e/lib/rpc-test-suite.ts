import type {
	Page,
	PlaywrightTestArgs,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType,
} from '@playwright/test'
import { expect } from '@playwright/test'
import { rpcMethodCard } from '../page-objects/rpcMethodCard.js'
import { CHAIN_IDS } from './constants.js'
import { triggerAndApproveSDKPopup } from './helpers.js'



export const registerRpcMethodTests = (
	test: TestType<
	PlaywrightTestArgs & PlaywrightTestOptions,
	PlaywrightWorkerArgs & PlaywrightWorkerOptions
>,
	getPage: () => Page,
) => {
	// --- Signing ---

	test('personal_sign — sign a message via shortcut', async () => {
		const personalSign = rpcMethodCard(getPage(), 'personal_sign')
		await triggerAndApproveSDKPopup(getPage(), () =>
			personalSign.clickShortcut('Example Message'),
		)
		await personalSign.waitForResponse()
		const response = await personalSign.getResponse()
		expect(response).toContain('0x')
	})

	test('eth_signTypedData_v4 — sign typed data via shortcut', async () => {
		const signTypedData = rpcMethodCard(getPage(), 'eth_signTypedData_v4')
		await triggerAndApproveSDKPopup(getPage(), () =>
			signTypedData.clickShortcut('Example Message'),
		)
		await signTypedData.waitForResponse()
	})

	// --- Transactions ---

	test('eth_sendTransaction — send example transaction', async () => {
		const sendTx = rpcMethodCard(getPage(), 'eth_sendTransaction')
		await triggerAndApproveSDKPopup(getPage(), () =>
			sendTx.clickShortcut('Example Tx'),
		)
		await sendTx.waitForResponse()
		const response = await sendTx.getResponse()
		expect(response).toContain('0x')
	})

	test('wallet_sendCalls — send calls via shortcut', async () => {
		const walletSendCalls = rpcMethodCard(
			getPage(),
			'wallet_sendCalls',
			'section-wallet-tx',
		)
		await triggerAndApproveSDKPopup(getPage(), () =>
			walletSendCalls.clickShortcut('wallet_sendCalls'),
		)
		await walletSendCalls.waitForResponse()
		const response = await walletSendCalls.getResponse()
		expect(response).toBeTruthy()
	})

	// --- Chain ---

	test('wallet_switchEthereumChain — switch chain via shortcut', async () => {
		const switchChain = rpcMethodCard(getPage(), 'wallet_switchEthereumChain')
		await switchChain.clickShortcut('Minato')
		const eventSection = getPage().getByTestId('section-event-listeners')
		await expect(eventSection.getByText(CHAIN_IDS.MINATO)).toBeVisible()
		await expect(getPage().locator('#toast-chain-changed')).toBeVisible()
	})

	// --- Read-only ---

	test('eth_getBalance — get balance via shortcut', async () => {
		const getBalance = rpcMethodCard(getPage(), 'eth_getBalance')
		await getBalance.clickShortcut('Get your address balance')
		await getBalance.waitForResponse()
		const response = await getBalance.getResponse()
		expect(response).toContain('0x')
	})
}
