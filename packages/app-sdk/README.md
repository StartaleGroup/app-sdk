# Startale App SDK

## Startale App SDK allows dapps to connect to the Startale App

> This repository uses `pnpm`. The examples below show the `pnpm` command first, followed by an `npm` alternative when helpful.

### Installing Startale App SDK

1. Check available versions:

   ```shell
   # pnpm
   pnpm view @startale/app-sdk versions

   # npm
   npm view @startale/app-sdk versions
   ```

2. Install latest version:

   ```shell
   # pnpm
   pnpm add @startale/app-sdk

   # npm
   npm install @startale/app-sdk
   ```

3. Check installed version:

   ```shell
   # pnpm
   pnpm list @startale/app-sdk

   # npm
   npm list @startale/app-sdk
   ```

### Upgrading Startale App SDK

1. Compare the installed version with the latest:

   ```shell
   # pnpm
   pnpm outdated @startale/app-sdk

   # npm
   npm outdated @startale/app-sdk
   ```

2. Update to latest:

   ```shell
   # pnpm
   pnpm update @startale/app-sdk

   # npm
   npm update @startale/app-sdk
   ```

### Basic Usage

1. Initialize Startale App SDK

   ```js
   const sdk = createStartaleAccountSDK({
     appName: 'SDK Playground',
   });
   ```

2. Make Base Account Provider

   ```js
   const provider = sdk.getProvider();
   ```

3. Request accounts to initialize a connection to wallet

   ```js
   const addresses = provider.request({
     method: 'eth_requestAccounts',
   });
   ```

4. Make more requests

   ```js
   provider.request('personal_sign', [
     `0x${Buffer.from('test message', 'utf8').toString('hex')}`,
     addresses[0],
   ]);
   ```

5. Handle provider events

   ```js
   provider.on('connect', (info) => {
     setConnect(info);
   });

   provider.on('disconnect', (error) => {
     setDisconnect({ code: error.code, message: error.message });
   });

   provider.on('accountsChanged', (accounts) => {
     setAccountsChanged(accounts);
   });

   provider.on('chainChanged', (chainId) => {
     setChainChanged(chainId);
   });

   provider.on('message', (message) => {
     setMessage(message);
   });
   ```
