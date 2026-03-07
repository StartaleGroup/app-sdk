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
		const response = await signTypedData.getResponse()
		expect(response).toContain('0x')
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
		// Chakra UI toasts use HTML id (from toast({ id })) — not data-testid
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

	// --- Error cases ---
	// Read-only methods return errors without opening SDK popups

	test('eth_getBalance — error on invalid address', async () => {
		const getBalance = rpcMethodCard(getPage(), 'eth_getBalance')
		await getBalance.openParams()
		await getBalance.fillParam('address', 'invalid_address')
		await getBalance.fillParam('blockNumber', 'latest')
		await getBalance.submit()
		await getBalance.waitForResponse()
		const error = await getBalance.getError()
		expect(error).toBeTruthy()
	})

	test('eth_getTransactionCount — error on invalid address', async () => {
		const getTxCount = rpcMethodCard(getPage(), 'eth_getTransactionCount')
		await getTxCount.openParams()
		await getTxCount.fillParam('address', 'invalid_address')
		await getTxCount.fillParam('blockNumber', 'latest')
		await getTxCount.submit()
		await getTxCount.waitForResponse()
		const error = await getTxCount.getError()
		expect(error).toBeTruthy()
	})
}
