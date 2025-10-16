import { Box, Button, Container, Heading, Link, Text, VStack } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { encodeFunctionData } from 'viem';

import { WIDTH_2XL } from '../components/Layout';
import { MethodsSection } from '../components/MethodsSection/MethodsSection';
import { connectionMethods } from '../components/RpcMethods/method/connectionMethods';
import { walletTxMethods } from '../components/RpcMethods/method/walletTxMethods';
import { connectionMethodShortcutsMap } from '../components/RpcMethods/shortcut/connectionMethodShortcuts';
import { walletTxShortcutsMap } from '../components/RpcMethods/shortcut/walletTxShortcuts';
import { useEIP1193Provider } from '../context/EIP1193ProviderContextProvider';

export default function UserOps() {
  const { provider } = useEIP1193Provider();
  // @ts-expect-error refactor soon
  const [connected, setConnected] = React.useState(Boolean(provider?.connected));
  const [superappLoading, setSuperappLoading] = React.useState(false);
  const [superappError, setSuperappError] = React.useState<string | null>(null);
  const [userOpHash, setUserOpHash] = React.useState<string | null>(null);
  const [addSubAccountLoading, setAddSubAccountLoading] = React.useState(false);
  const [getSubAccountsLoading, setGetSubAccountsLoading] = React.useState(false);
  const [addedSubAccount, setAddedSubAccount] = React.useState<string | null>(null);
  const [fetchedSubAccounts, setFetchedSubAccounts] = React.useState<string[]>([]);
  const [accountError, setAccountError] = React.useState<string | null>(null);

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

  const handleAddSubAccount = async () => {
    if (!provider) {
      setAccountError('Provider not available');
      return;
    }

    setAddSubAccountLoading(true);
    setAccountError(null);
    setAddedSubAccount(null);

    try {
      const response = (await provider.request({
        method: 'wallet_addSubAccount',
        params: [
          {
            version: '1',
            account: {
              type: 'undeployed',
            },
          },
        ],
      })) as { address?: string } | { result?: { value?: { address?: string } } } | string | null;

      let address: string | null = null;
      if (typeof response === 'string') {
        address = response;
      } else if (response && typeof response === 'object') {
        if ('address' in response && typeof response.address === 'string') {
          address = response.address;
        } else if ('result' in response && response.result && typeof response.result === 'object') {
          const value = (response.result as Record<string, unknown>).value;
          if (value && typeof value === 'object' && 'address' in value) {
            const extracted = (value as Record<string, unknown>).address;
            if (typeof extracted === 'string') {
              address = extracted;
            }
          }
        }
      }

      if (!address) {
        throw new Error('Superapp did not return a subaccount address');
      }

      setAddedSubAccount(address);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : String(error));
    } finally {
      setAddSubAccountLoading(false);
    }
  };

  const handleGetSubAccounts = async () => {
    if (!provider) {
      setAccountError('Provider not available');
      return;
    }

    setGetSubAccountsLoading(true);
    setAccountError(null);
    setFetchedSubAccounts([]);

    try {
      const response = (await provider.request({
        method: 'wallet_getSubAccounts',
        params: [],
      })) as
        | { subAccounts?: { address?: string }[] }
        | { result?: { value?: { subAccounts?: { address?: string }[] } } }
        | null;

      let addresses: string[] = [];
      if (response && typeof response === 'object') {
        if ('subAccounts' in response && Array.isArray(response.subAccounts)) {
          addresses = response.subAccounts
            .map((entry) => (entry && typeof entry.address === 'string' ? entry.address : null))
            .filter((entry): entry is string => Boolean(entry));
        } else if ('result' in response && response.result && typeof response.result === 'object') {
          const value = (response.result as Record<string, unknown>).value;
          if (value && typeof value === 'object' && 'subAccounts' in value) {
            const subAccounts = (value as Record<string, unknown>).subAccounts;
            if (Array.isArray(subAccounts)) {
              addresses = subAccounts
                .map((entry) =>
                  entry && typeof entry === 'object' && entry !== null && 'address' in entry
                    ? ((entry as Record<string, unknown>).address as string)
                    : null
                )
                .filter((entry): entry is string => typeof entry === 'string');
            }
          }
        }
      }

      if (addresses.length === 0) {
        throw new Error('No subaccounts returned by superapp');
      }

      setFetchedSubAccounts(addresses);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : String(error));
    } finally {
      setGetSubAccountsLoading(false);
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
      <Box mt={4}>
        <VStack align="flex-start" spacing={3}>
          <Button
            colorScheme="brand"
            onClick={handleAddSubAccount}
            isLoading={addSubAccountLoading}
            isDisabled={!connected}
          >
            Add Subaccount
          </Button>
          {addedSubAccount && (
            <Link
              href={`https://soneium-minato.blockscout.com/address/${addedSubAccount}`}
              isExternal
              color="green.200"
              fontWeight="semibold"
            >
              {addedSubAccount}
            </Link>
          )}
          <Button
            colorScheme="brand"
            variant="outline"
            onClick={handleGetSubAccounts}
            isLoading={getSubAccountsLoading}
            isDisabled={!connected}
          >
            Get Subaccounts
          </Button>
          {fetchedSubAccounts.length > 0 && (
            <VStack align="flex-start" spacing={1}>
              {fetchedSubAccounts.map((address) => (
                <Link
                  key={address}
                  href={`https://soneium-minato.blockscout.com/address/${address}`}
                  isExternal
                  color="green.200"
                  fontWeight="semibold"
                >
                  {address}
                </Link>
              ))}
            </VStack>
          )}
          {accountError && <Text color="red.400">{accountError}</Text>}
        </VStack>
      </Box>
    </Container>
  );
}
