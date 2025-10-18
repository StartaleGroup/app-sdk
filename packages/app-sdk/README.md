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
   const sdk = createBaseAccountSDK({
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

### Developing locally and running the test dapp

- The Startale App SDK test dapp can be viewed here https://base.github.io/account-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the repo root install dependencies with `pnpm install`
  1. Start the workspace development servers with `pnpm dev` (the playground runs on http://localhost:3001 by default)

## Script Tag Usage

Startale App SDK can be used directly in HTML pages via a script tag, without any build tools:

```html
<!-- Via unpkg -->
<script src="https://unpkg.com/@startale/app-sdk/dist/app-sdk.min.js"></script>

<!-- Via jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@startale/app-sdk/dist/app-sdk.min.js"></script>
```

Once loaded, the SDK is available as `window.base` and `window.createBaseAccountSDK`:

```javascript
// Make a payment
const result = await window.base.pay({
  amount: "10.50",
  to: "0xYourAddress...",
  testnet: true
});

// Check payment status
const status = await window.base.getPaymentStatus({
  id: result.id,
  testnet: true
});

// Create Base Account Provider
const provider = window.createBaseAccountSDK().getProvider()
```
