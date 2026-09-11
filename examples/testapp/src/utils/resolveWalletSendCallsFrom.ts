import { isAddress } from 'viem'

const normalizeAddress = (value: unknown): string | null =>
	typeof value === 'string' && isAddress(value) ? value : null

export const resolveWalletSendCallsFrom = async (
	// biome-ignore lint/suspicious/noExplicitAny: Provider type varies between environments
	provider: { request: (args: { method: string; params?: unknown[] }) => Promise<any> },
) => {
	const ethAccountsRaw = (await provider
		.request({ method: 'eth_accounts', params: [] })
		.catch(() => [])) as unknown

	const accounts = Array.isArray(ethAccountsRaw)
		? ethAccountsRaw
				.map(normalizeAddress)
				.filter((account): account is string => account !== null)
		: []

	const primaryAccount = accounts[0] ?? null
	const from = primaryAccount

	return {
		primaryAccount,
		from,
	}
}
