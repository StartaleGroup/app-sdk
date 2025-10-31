import { isAddress } from 'viem'

type WalletGetSubAccountsResponse = {
	subAccounts?: { address?: string | null }[] | null
} | null

const normalizeAddress = (value: unknown): string | null =>
	typeof value === 'string' && isAddress(value) ? value : null

export const resolveWalletSendCallsFrom = async (
	// biome-ignore lint/suspicious/noExplicitAny: Provider type varies between environments
	provider: { request: (args: { method: string; params?: unknown[] }) => Promise<any> },
	options?: {
		/**
		 * Prefer subaccount address over primary account for the 'from' field.
		 * If true, uses subAccountAddress when available, falling back to primaryAccount.
		 * If false or undefined (default), uses primaryAccount, falling back to subAccountAddress.
		 */
		preferSubAccount?: boolean
	},
) => {
	const [ethAccountsRaw, subAccountsRaw] = await Promise.all([
		provider
			.request({ method: 'eth_accounts', params: [] })
			.catch(() => []) as Promise<unknown>,
		provider
			.request({
				method: 'wallet_getSubAccounts',
				params: [],
			})
			.catch(() => null) as Promise<WalletGetSubAccountsResponse>,
	])

	const accounts = Array.isArray(ethAccountsRaw)
		? ethAccountsRaw
				.map(normalizeAddress)
				.filter((account): account is string => account !== null)
		: []

	const subAccount = subAccountsRaw?.subAccounts?.find(
		(entry) => normalizeAddress(entry?.address) !== null,
	)

	const primaryAccount = accounts[0] ?? null
	const subAccountAddress = normalizeAddress(subAccount?.address)

	const from = options?.preferSubAccount
		? subAccountAddress ?? primaryAccount
		: primaryAccount ?? subAccountAddress

	return {
		primaryAccount,
		subAccountAddress,
		from,
	}
}
