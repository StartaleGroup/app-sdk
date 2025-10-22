# Startale App SDK


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

Note: A GH action pulls the upstream once a day, so the last `push` command is not necessarry.

