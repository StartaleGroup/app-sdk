import { Box, Button, Container, Grid, Heading, Text, VStack } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { encodeFunctionData } from 'viem';

import { EventListenersCard } from '../components/EventListeners/EventListenersCard';
import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { ephemeralMethods } from '../components/RpcMethods/method/ephemeralMethods';
import { multiChainMethods } from '../components/RpcMethods/method/multiChainMethods';
import { readonlyJsonRpcMethods } from '../components/RpcMethods/method/readonlyJsonRpcMethods';
import { sendMethods } from '../components/RpcMethods/method/sendMethods';
import { signMessageMethods } from '../components/RpcMethods/method/signMessageMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { connectionMethodShortcutsMap } from '../components/RpcMethods/shortcut/connectionMethodShortcuts';
import { ephemeralMethodShortcutsMap } from '../components/RpcMethods/shortcut/ephemeralMethodShortcuts';
import { multiChainShortcutsMap } from '../components/RpcMethods/shortcut/multipleChainShortcuts';
import { readonlyJsonRpcShortcutsMap } from '../components/RpcMethods/shortcut/readonlyJsonRpcShortcuts';
import { sendShortcutsMap } from '../components/RpcMethods/shortcut/sendShortcuts';
import { signMessageShortcutsMap } from '../components/RpcMethods/shortcut/signMessageShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { SDKConfig } from '../components/SDKConfig/SDKConfig';
import { useEIP1193Provider } from '../context/EIP1193ProviderContextProvider';

export default function Dashboard() {
  const { provider } = useEIP1193Provider();
  // @ts-expect-error refactor soon
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));
  const [chainId, setChainId] = React.useState<number | undefined>(undefined);
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
    provider?.on('chainChanged', (newChainId) => {
      // @ts-expect-error refactor soon
      setChainId(newChainId);
    });
  }, [provider]);

  useEffect(() => {
    if (connected) {
      provider?.request({ method: 'eth_chainId' }).then((currentChainId) => {
        // @ts-expect-error refactor soon
        setChainId(Number.parseInt(currentChainId, 16));
      });
    }

    // Injected provider does not emit a 'connect' event
    // @ts-expect-error refactor soon
    if (provider?.isCoinbaseBrowser) {
      setConnected(true);
    }
  }, [connected, provider]);

  const shouldShowMethodsRequiringConnection = connected;

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

      const chainIdHex = (await provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;

      const response = (await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1.0',
            chainId: chainIdHex,
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
      <Box>
        <Heading size="md">Event Listeners</Heading>
        <Grid mt={2} templateColumns={{ base: '100%' }} gap={2}>
          <EventListenersCard />
        </Grid>
      </Box>
      <Heading size="md" mt={4}>
        SDK Configuration (Optional)
      </Heading>
      <Box mt={4}>
        <SDKConfig />
      </Box>
      <Heading size="md" mt={8}>
        Superapp Demo
      </Heading>
      <Box mt={2}>
        <VStack align="flex-start" spacing={2}>
          <Button
            colorScheme="telegram"
            onClick={handleSuperappAction}
            isLoading={superappLoading}
            isDisabled={!shouldShowMethodsRequiringConnection}
          >
            Send Superapp Custom Action
          </Button>
          {userOpHash && (
            <a
              href={`https://soneium-minato.blockscout.com/tx/${userOpHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {userOpHash}
            </a>
          )}
          {superappError && <Text color="red.400">{superappError}</Text>}
        </VStack>
      </Box>
      <MethodsSection
        title="Wallet Connection"
        methods={connectionMethods}
        shortcutsMap={connectionMethodShortcutsMap}
      />
      <MethodsSection
        title="Ephemeral Methods"
        methods={ephemeralMethods}
        shortcutsMap={ephemeralMethodShortcutsMap}
      />
      {shouldShowMethodsRequiringConnection && (
        <>
          <MethodsSection
            title="Switch/Add Chain"
            methods={multiChainMethods}
            shortcutsMap={multiChainShortcutsMap}
          />
          <MethodsSection
            title="Sign Message"
            methods={signMessageMethods}
            shortcutsMap={signMessageShortcutsMap(chainId)}
          />
          <MethodsSection title="Send" methods={sendMethods} shortcutsMap={sendShortcutsMap} />
          <MethodsSection
            title="Wallet Tx"
            methods={walletTxMethods}
            shortcutsMap={walletTxShortcutsMap}
          />
          <MethodsSection
            title="Read-only JSON-RPC Requests"
            methods={readonlyJsonRpcMethods}
            shortcutsMap={readonlyJsonRpcShortcutsMap}
          />
        </>
      )}
    </Container>
  );
}

