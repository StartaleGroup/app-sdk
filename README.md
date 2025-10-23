# Startale App SDK

[![npm](https://img.shields.io/npm/v/@startale/app-sdk.svg)](https://www.npmjs.com/package/@startale/app-sdk)

## Developing locally and running the test app

1. From the root dir run `ni` or `pnpm install`
2. From the root dir run `nr dev` or `pnpm dev`
3. Open the test app on `http://localhost:3001`
4. Run the Startale app on port 3000 to send RPC calls over.

## Sync `base-master` locally from upstream (Base Account SDK)

```bash
git remote add base https://github.com/base/account-sdk.git
git fetch base
git checkout base-master
git pull base master
git push origin base-master
```

Note: A GH action pulls the upstream once a day, so the last `push` command is not necessary.

## Publishing @startale/app-sdk

1. Run `pnpm login` (once per machine) so your npm token is available.
2. Bump the version in `packages/app-sdk/package.json` and commit the change.
3. (Recommended) Validate the build with `pnpm test` and `pnpm typecheck`.
4. Publish with `pnpm run publish:app-sdk`. This runs the package’s `prepublishOnly` build before calling `pnpm publish`.
   > Note: Use `pnpm run publish:app-sdk -- --tag beta` (or another tag) if you need a non-`latest` release.
