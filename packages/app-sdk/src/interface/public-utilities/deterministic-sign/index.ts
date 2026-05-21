import { type Address, type Hex, toHex } from 'viem'

import { ProviderInterface } from ':core/provider/interface.js'

export type RequestDeterministicSignType = {
	provider: ProviderInterface
	message: string | Hex
	address: Address
}

/**
 * Requests a deterministic signature from the Startale wallet.
 *
 * Unlike `personal_sign`, which returns a Smart Account / ERC-1271 wrapped
 * signature whose bytes vary across calls (the underlying WebAuthn/Passkey
 * signer is non-deterministic by spec), this method asks the popup to return
 * a raw secp256k1 signature produced with RFC 6979 deterministic ECDSA against
 * a stable per-user secret.
 *
 * Same user + same message → byte-identical signature on every call and every
 * device (so long as the popup-side stable secret is reproducible — see the
 * Startale popup implementation for the seed-resolution strategy).
 *
 * Typical use case: deriving a long-lived "agent wallet" seed from the user's
 * Startale identity without depending on a backend key store.
 */
const requestDeterministicSignFn = async ({
	provider,
	message,
	address,
}: RequestDeterministicSignType): Promise<Hex> => {
	const hexMessage = typeof message === 'string' && message.startsWith('0x')
		? (message as Hex)
		: toHex(message)

	const signature = (await provider.request({
		method: 'wallet_deterministicSign',
		params: [hexMessage, address],
	})) as Hex

	return signature
}

export const requestDeterministicSign = requestDeterministicSignFn
