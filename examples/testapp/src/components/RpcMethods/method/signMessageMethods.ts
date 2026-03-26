import {
  Address,
  Chain,
  Hex,
  concat,
  createPublicClient,
  domainSeparator,
  encodeAbiParameters,
  erc6492SignatureValidatorByteCode,
  hashTypedData,
  http,
  isErc6492Signature,
  keccak256,
  parseAbiParameters
} from 'viem';

import { parseMessage } from '../shortcut/ShortcutType';
import { RpcRequestInput } from './RpcRequestInput';

const ethSign: RpcRequestInput = {
	method: 'eth_sign',
	params: [
		{ key: 'message', required: true },
		{ key: 'address', required: true },
	],
	format: (data: Record<string, string>) => [
		data.address,
		`0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
	],
}

const personalSign: RpcRequestInput = {
	method: 'personal_sign',
	params: [
		{ key: 'message', required: true },
		{ key: 'address', required: true },
	],
	format: (data: Record<string, string>) => [
		`0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
		data.address,
	],
}

const ethSignTypedDataV1: RpcRequestInput = {
	method: 'eth_signTypedData_v1',
	params: [
		{ key: 'message', required: true },
		{ key: 'address', required: true },
	],
	format: (data: Record<string, string>) => [
		parseMessage(data.message),
		data.address,
	],
}

const ethSignTypedDataV3: RpcRequestInput = {
	method: 'eth_signTypedData_v3',
	params: [
		{ key: 'message', required: true },
		{ key: 'address', required: true },
	],
	format: (data: Record<string, string>) => [
		data.address,
		parseMessage(data.message),
	],
}

const ethSignTypedDataV4: RpcRequestInput = {
	method: 'eth_signTypedData_v4',
	params: [
		{ key: 'message', required: true },
		{ key: 'address', required: true },
	],
	format: (data: Record<string, string>) => [
		data.address,
		parseMessage(data.message),
	],
}

export const signMessageMethods = [
	ethSign,
	personalSign,
	ethSignTypedDataV1,
	ethSignTypedDataV3,
	ethSignTypedDataV4,
]

export const verifySignMsg = async ({
	method,
	from,
	sign,
	message,
	chain,
}: {
	method: string
	from: string
	sign: string
	message: unknown
	chain: Chain
}) => {
	switch (method) {
		case 'personal_sign': {
			const client = createPublicClient({
				chain,
				transport: http(),
			})

      const valid = await client.verifyMessage({
        address: from as `0x${string}`,
        message: message as string,
        signature: sign as `0x${string}`,
      });
      if (valid) {
        return `SigUtil Successfully verified signer as ${from}`;
      }
      return 'SigUtil Failed to verify signer';
    }
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4': {
      const eip1271MagicValue: Hex = '0x1626ba7e'
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const typedData = typeof message === 'string' ? JSON.parse(message) : message;
      const appDomainSeparator = domainSeparator({ domain: typedData.domain });
      const messageHash = hashTypedData(typedData);
      const finalHash = keccak256(concat(['0x1901', appDomainSeparator, messageHash]));

      // For ERC-6492 signatures (undeployed accounts), use the Universal
      // Signature Validator which deploys the account in a single eth_call
      // simulation, then calls isValidSignature on the deployed contract.
      const sig = sign as Hex;
      if (isErc6492Signature(sig)) {
        try {
          // abi.encode(address signer, bytes32 hash, bytes wrappedSignature)
          const callData = encodeAbiParameters(
            parseAbiParameters(['address', 'bytes32', 'bytes']),
            [from as Address, finalHash, sig],
          );
          // Simulate the universal validator via eth_call (read-only,
          // nothing deployed on-chain). The validator bytecode runs
          // account deployment + isValidSignature in a single call.
          const { data } = await publicClient.call({
            data: concat([erc6492SignatureValidatorByteCode as Hex, callData]),
          });

          // The validator returns abi.encode(bool) — 32 bytes, last byte is 0/1
          const valid = data?.slice(-1) === '1';
          if (valid) {
            return `SigUtil Successfully verified signer as ${from} (ERC-6492)`;
          }
          return 'SigUtil Failed to verify signer (ERC-6492)';
        } catch (error) {
          return `Error verifying ERC-6492 signature: ${error}`;
        }
      }

      try {
        const response = await publicClient.readContract({
          address: from as Address,
          abi: [
            {
              inputs: [
                { name: 'hash', type: 'bytes32' },
                { name: 'signature', type: 'bytes' },
              ],
              name: 'isValidSignature',
              outputs: [{ name: '', type: 'bytes4' }],
              type: 'function',
            },
          ],
          functionName: 'isValidSignature',
          args: [finalHash, sign as Hex],
          authorizationList: undefined,
        });

        const valid = response === eip1271MagicValue;
        if (valid) {
          return `SigUtil Successfully verified signer as ${from}`;
        }
        return 'SigUtil Failed to verify signer';
      } catch (error) {
        return `Error verifying signature: ${error}`;
      }
    }
    default: 
      return null;
  }
};
