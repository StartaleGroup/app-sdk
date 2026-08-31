import { type Address, type Hex } from 'viem'

import { ProviderInterface } from ':core/provider/interface.js'

export type RequestSignRawDigestType = {
	provider: ProviderInterface
	/** 32-byte signing digest (0x + 64 hex chars) */
	digest: Hex
	address: Address
}

const DIGEST_PATTERN = /^0x[0-9a-fA-F]{64}$/

/**
 * Asks the popup to raw-sign a 32-byte digest with the user's embedded
 * wallet (EOA) — plain secp256k1 ECDSA over the exact digest bytes, with no
 * EIP-191 prefix and no re-hashing.
 *
 * The signature bytes vary across calls (MPC signing is non-deterministic),
 * but `ecrecover(digest, signature)` always yields the same signer address.
 * Callers should rely on the recovered key, never on signature stability.
 *
 * Typical use cases: recovering a stable user address via ecrecover, and
 * signing externally-computed digests such as Substrate extrinsic payloads
 * for ethereum-type (AccountId20) chains.
 */
const requestSignRawDigestFn = async ({
	provider,
	digest,
	address,
}: RequestSignRawDigestType): Promise<Hex> => {
	if (!DIGEST_PATTERN.test(digest)) {
		throw new Error(
			'digest must be a 32-byte hex string (0x followed by 64 hex chars)',
		)
	}

	const signature = (await provider.request({
		method: 'wallet_signRawDigest',
		params: [digest, address],
	})) as Hex

	return signature
}

export const requestSignRawDigest = requestSignRawDigestFn
