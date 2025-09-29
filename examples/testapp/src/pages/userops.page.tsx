import { ArrowForwardIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Code,
  Container,
  HStack,
  Heading,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { encodeFunctionData } from 'viem';

import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { connectionMethodShortcutsMap } from '../components/RpcMethods/shortcut/connectionMethodShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { useEIP1193Provider } from '../context/EIP1193ProviderContextProvider';

const ENCODE_FUNCTION_DATA_SNIPPET = `const data = encodeFunctionData({
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
});`;

export default function UserOps() {
  const { provider } = useEIP1193Provider();
  // @ts-expect-error refactor soon
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));
  const [superappLoading, setSuperappLoading] = React.useState(false);
  const [superappError, setSuperappError] = React.useState<string | null>(null);
  const [userOpHash, setUserOpHash] = React.useState<string | null>(null);

  useEffect(() => {
    // @ts-expect-error refactor soon
    if (window.coinbaseWalletExtension) {
      setConnected(true);
    }
  }, []);

  useEffect(() => {
    provider?.on('connect', () => {
      setConnected(true);
    });
  }, [provider]);

  useEffect(() => {
    // Injected provider does not emit a 'connect' event
    // @ts-expect-error refactor soon
    if (provider?.isCoinbaseBrowser) {
      setConnected(true);
    }
  }, [provider]);

  const handleSuperappAction = async () => {
    if (!provider) {
      setSuperappError('Provider not available');
      return;
    }

    setSuperappLoading(true);
    setSuperappError(null);
    setUserOpHash(null);

    try {
      const subAccountResponse = (await provider.request({
        method: 'wallet_getSubAccounts',
        params: [],
      })) as { subAccounts?: { address?: string }[] } | null;

      const subAccountAddress = subAccountResponse?.subAccounts?.[0]?.address;

      if (!subAccountAddress) {
        throw new Error('No subaccount available. Connect and ensure a subaccount is provisioned.');
      }

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
      });

      const calls = [
        {
          to: '0x6bcf154A6B80fDE9bd1556d39C9bCbB19B539Bd8',
          data,
          value: '0x0',
        },
      ];

      const chainId = (await provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;

      const response = (await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId,
            from: subAccountAddress,
            calls,
            capabilities: {},
          },
        ],
      })) as
        | { id?: string; result?: { value?: { transactionHash?: string; userOpHash?: string } } }
        | string
        | null;

      let extractedHash: string | null = null;
      if (typeof response === 'string') {
        extractedHash = response;
      } else if (response && typeof response === 'object') {
        if ('id' in response && typeof response.id === 'string') {
          extractedHash = response.id;
        } else if ('result' in response && response.result && typeof response.result === 'object') {
          const value = (response.result as Record<string, unknown>).value;
          if (value && typeof value === 'object') {
            const txHash = (value as Record<string, unknown>).transactionHash;
            if (typeof txHash === 'string') {
              extractedHash = txHash;
            }
            const userOpHashValue = (value as Record<string, unknown>).userOpHash;
            if (!extractedHash && typeof userOpHashValue === 'string') {
              extractedHash = userOpHashValue;
            }
          }
        }
      }

      if (!extractedHash) {
        throw new Error('Superapp did not return a transaction hash');
      }

      setUserOpHash(extractedHash);
    } catch (error) {
      setSuperappError(error instanceof Error ? error.message : String(error));
    } finally {
      setSuperappLoading(false);
    }
  };

  return (
    <Container maxW={WIDTH_2XL} mb={8}>
      <Heading size="md">Superapp Demo</Heading>
      <Box mt={8}>
        <MethodsSection
          title="Wallet Connection"
          methods={[connectionMethods[0]]}
          shortcutsMap={connectionMethodShortcutsMap}
        />
      </Box>
      <MethodsSection
        title="Sign Message"
        methods={[walletTxMethods[3], walletTxMethods[4]]}
        shortcutsMap={walletTxShortcutsMap}
      />
      <Box mt={2}>
        <VStack align="flex-start" spacing={4} width="100%">
          <Box
            width="100%"
            borderWidth="1px"
            borderColor="cyan.500"
            bg="cyan.900"
            color="cyan.50"
            p={4}
            borderRadius="md"
          >
            <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
              Send User Operation
            </Text>
            <Button
              leftIcon={<ArrowForwardIcon />}
              mt={3}
              size="lg"
              fontWeight="bold"
              px={6}
              bgGradient="linear(to-r, cyan.400, cyan.600)"
              color="white"
              _hover={{
                bgGradient: 'linear(to-r, cyan.500, cyan.700)',
                transform: 'translateY(-1px)',
              }}
              _active={{ transform: 'translateY(0)' }}
              shadow="md"
              borderRadius="full"
              onClick={handleSuperappAction}
              isLoading={superappLoading}
              isDisabled={!connected}
            >
              Send user op
            </Button>
          </Box>
          <Box
            width="100%"
            borderWidth="1px"
            borderColor="purple.500"
            bg="purple.900"
            color="purple.50"
            p={4}
            borderRadius="md"
          >
            <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
              encodeFunctionData Call
            </Text>
            <Box
              as="pre"
              bg="blackAlpha.700"
              color="purple.50"
              p={4}
              borderRadius="md"
              fontSize="sm"
              whiteSpace="pre-wrap"
              width="100%"
              mt={2}
            >
              {ENCODE_FUNCTION_DATA_SNIPPET}
            </Box>
          </Box>
          {userOpHash && (
            <Box
              width="100%"
              borderWidth="1px"
              borderColor="green.500"
              bg="green.900"
              color="green.100"
              p={4}
              borderRadius="md"
            >
              <Text fontSize="sm" fontWeight="semibold" textTransform="uppercase">
                User Operation Hash
              </Text>
              <HStack mt={2} spacing={3} align="flex-start">
                <Code
                  colorScheme="green"
                  borderRadius="md"
                  fontSize="sm"
                  wordBreak="break-all"
                  whiteSpace="pre-wrap"
                  px={2}
                  py={1}
                >
                  {userOpHash}
                </Code>
                <Link
                  href={`https://soneium-minato.blockscout.com/tx/${userOpHash}`}
                  isExternal
                  color="green.200"
                  fontWeight="semibold"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                >
                  View on Blockscout
                  <ExternalLinkIcon />
                </Link>
              </HStack>
            </Box>
          )}
          {superappError && <Text color="red.400">{superappError}</Text>}
        </VStack>
      </Box>
    </Container>
  );
}
