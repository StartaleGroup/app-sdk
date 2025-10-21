import { Address, Chain, Hex, concat, createPublicClient, domainSeparator, hashTypedData, http, keccak256 } from 'viem';

import { parseMessage } from '../shortcut/ShortcutType'
import { RpcRequestInput } from './RpcRequestInput'

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
