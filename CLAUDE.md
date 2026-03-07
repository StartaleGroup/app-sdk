# Hard Limits

- Never expose credentials, tokens, private keys, mnemonics, or customer data in output.
- Never add backdoors, debug bypasses, hardcoded passwords, or unsafe defaults.
- Never commit secrets. Use placeholders: `REDACTED`, `EXAMPLE_TOKEN`, `example.invalid`.
- Never run `git add`/`git commit`/`git push`, or open PRs unless explicitly requested.
- Never send repo content to the internet unless explicitly requested.
- If you discover a secret: recommend rotation. Never print it.
- **Stop and ask** before touching secrets, uploading content, or running network/production commands.
- Small, reviewable changes. Read-only/dry-run first. Confirm before destructive ops.

---

# Project Overview

Startale App SDK (`@startale/app-sdk`) — Web3 SDK forked from Coinbase's Account SDK. EIP-1193 compliant wallet providers with SCW support, sub-accounts, spend permissions, and payment interfaces.

## Working Principles

- **Be Proactive**: Propose better approaches, naming, patterns. Challenge tech debt.
- **Clarify Ambiguities**: Use AskUserQuestion. Never assume.
- **Use Subagents**: Task tool for research, exploration, code reviews.
- **Side Effect Analysis**: Identify all consumers before changing shared state (Zustand stores, IndexedDB keys, Communicator channels).
- **Code Review**: Use `code-reviewer` agent after writing code.
- **Finalize**: Run `pnpm lint` and `pnpm format`. Resolve errors.

## Structure & Commands

```
app-sdk/                    # pnpm workspace root (Node >=24, pnpm >=10)
├── packages/app-sdk/       # Main SDK library
└── examples/testapp/       # Next.js test app (port 3001)
```

```bash
# Root:      pnpm install / dev / test / lint / format / build:packages
# SDK:       pnpm test / build / typecheck / lint / format
# Testapp:   pnpm dev / test
```

Build: `compile-assets → tsc → tsc-alias → rollup`

## Architecture

**Path aliases** (resolved by tsc-alias): `:core/*`, `:store/*`, `:sign/*`, `:ui/*`, `:util/*`, `:interface/*` → `src/{name}/`

**Module layers:**
- **`core/`** — `Communicator` (iframe/popup messaging), RPC types, errors, provider interface
- **`store/`** — Zustand state with persistence (accounts, sub-accounts, chains)
- **`sign/`** — SCW signing: `Signer`, `SCWKeyManager`, sub-account signers
- **`kms/`** — Browser crypto key management via IndexedDB
- **`interface/`** — `createStartaleAccountSDK()` factory, `BaseAccountProvider` (EIP-1193), payment, spend permissions
- **`ui/`** — Preact-based dialog UI and assets
- **`util/`** — Cipher, encoding, validation, COOP checks

**Key patterns:** EIP-1193 provider via `getProvider()`, wagmi connector via `startaleConnector()`, Preact JSX (not React), Rollup browser bundle (`dist/app-sdk.min.js`)

## Code Standards

- **Biome**: Tabs, indent 3, single quotes, no semicolons. Strict rules.
- **Testing**: Vitest + jsdom, co-located `*.test.ts`
- **TypeScript**: Strict, NodeNext resolution
- **Details**: `.claude/rules/` (typescript, web3, coding-style, security, unit-test)

## Upstream Sync

Forked from Base Account SDK. `base-master` tracks upstream (daily sync via GitHub Actions).

## Agents & Skills

| Name | Type | Purpose |
|------|------|---------|
| code-reviewer | Agent | Code quality review (auto-invoked after changes) |
| security-reviewer | Agent | Security vulnerability detection |
| build-error-resolver | Agent | Build/TypeScript error fixing |
| code-review | Skill | Security and quality review (auto) |
| side-effect | Skill | Side effect analysis (auto) |
| prepr | Skill | Pre-PR quality check (5 agents) |
| inconsistency-scan | Skill | Full codebase consistency scan |
| reflect / learn | Skill | Review mistakes / extract patterns |
| achievements / pr-summary | Skill | Branch summary / PR summary |

### Rules File Maintenance

- Keep `.claude/rules/` files concise (~200 lines). Split if exceeding.
- No duplicates across files. Update all references when renaming.

**Skill auto-repair**: On environment errors, complete with workaround, then ask user to fix SKILL.md.

## Tools

- **Context7**: Library best practices
- **Chrome** (`--chrome`): UI debugging
- **WebSearch**: External solutions
