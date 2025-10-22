# Base Account SDK

[![npm](https://img.shields.io/npm/v/%40startale%2Fapp-sdk.svg)](https://www.npmjs.com/package/@startale/app-sdk)

## Developing locally and running the test app

1. From the root dir run `ni` or `pnpm install`
2. From the root dir run `nr dev` or `pnpm dev`
3. Open the test app on `http://localhost:3001`
4. Run the Startale app on port 3000 to send RPC calls over.

## Publishing @startale/app-sdk

1. Run `pnpm login` (once per machine) so your npm token is available.
2. Bump the version in `packages/app-sdk/package.json` and commit the change.
3. (Recommended) Validate the build with `pnpm test` and `pnpm typecheck`.
4. Publish with `pnpm run publish:app-sdk`. This runs the package’s `prepublishOnly` build before calling `pnpm publish`.
   > Note: Use `pnpm run publish:app-sdk -- --tag beta` (or another tag) if you need a non-`latest` release.
