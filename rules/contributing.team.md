# Contributing to Shared Config

## Team vs group content

Config in this repo is split across two tiers. It is critical to keep them separate:

**Team tier** (`*.team.*` files, on `master` branch):
- Rules, skills, commands, and hooks that apply to **all** front-end projects
- Examples: accessibility standards, animation guidelines, shared UX patterns, Impeccable skills
- Must be generic enough to work across all groups (strium, startale, sdk)

**Group tier** (`*.group.*` files, on `group/*` branches):
- Rules, skills, commands, and hooks specific to a **single app category**
- Examples: DEX-specific trading UI rules, super app navigation patterns, SDK API conventions
- Must only live on the relevant group branch, never on `master`

### How to decide

When creating or editing a config file, ask:
- Does this apply to all front-end projects regardless of app? → **team** (`*.team.*`, PR to `master`)
- Does this only apply to one group of apps? → **group** (`*.group.*`, PR to `group/*` branch)

Never write group-specific content into a `*.team.*` file. Never write team-wide content into a `*.group.*` file. If a rule starts as group-specific but later proves useful across all projects, promote it by creating a new `*.team.*` file on `master` — don't modify the group file to be more generic.

**Project tier** (`*.project.*` files, in the consumer project repo):
- Rules specific to a single project that don't belong in the shared config
- These are committed directly in the consumer project's repo, not pushed back to this subtree
- Examples: project-specific linting overrides, app-specific component patterns

## Submitting changes from consumer projects

When pushing config changes back to this repo from a consumer project, always push to a **feature branch** and open a PR. Never push directly to `master` or a `group/*` branch.

### PR target branch

- Changes to `*.team.*` files → PR targets **`master`**
- Changes to `*.group.*` files → PR targets the relevant **`group/*`** branch (e.g., `group/strium`)
- Never mix team and group changes in the same PR

### Branch naming convention

```
from/<consumer-project>/<short-description>
```

- `from/` prefix indicates the change originates from a consumer project
- `<consumer-project>` is the name of the app or project (e.g., `dex-app`, `super-app`, `sdk-docs`)
- `<short-description>` briefly describes the change (e.g., `add-trading-rules`, `fix-a11y-rule`)

### Merge direction

- `master → group branches` — merge master INTO group branches to pick up team-level changes
- `group branches → master` — NEVER merge group branches into master (group-specific config must not leak into team tier)
