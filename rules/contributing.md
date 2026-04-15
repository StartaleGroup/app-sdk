# Contributing to Shared Config

## Team vs project content

Config in this repo is split across two tiers. It is critical to keep them separate:

**Team tier** (`*.team.*` files, on `master` branch):
- Rules, skills, commands, and hooks that apply to **all** front-end projects
- Examples: accessibility standards, animation guidelines, shared UX patterns, Impeccable skills
- Must be generic enough to work across all projects (strium-apps, superapp, superapp-sdk)

**Project tier** (`*.project.*` files, on project branches like `strium-apps`, `superapp`, `superapp-sdk`):
- Rules, skills, commands, and hooks specific to a **single project**
- Examples: DEX-specific trading UI rules, super app navigation patterns, project-specific API conventions
- Lives on the project branch and is pulled into the consumer project via subtree

### How to decide

When creating or editing a config file, ask:
- Does this apply to all front-end projects regardless of app? → **team** (`*.team.*`, lands on `master`)
- Does this only apply to one project? → **project** (`*.project.*`, lands on the project branch)

Never write project-specific content into a `*.team.*` file. Never write team-wide content into a `*.project.*` file. If a rule starts as project-specific but later proves useful across all projects, rename it to `*.team.*` and it will be auto-promoted to master on the next push.

## Submitting changes from consumer projects

When pushing config changes back to this repo from a consumer project, always push to a **feature branch** and open a PR. Never push directly to `master` or to a project branch.

### PR target branch

Every PR from a consumer project targets the project branch (e.g., `strium-apps`), regardless of whether it contains team or project files:

- Consumer runs `git cc-push from/<project>/<description>`
- The feature branch is pushed to `claude-config-frontend`
- Open a PR from the feature branch → the project branch (e.g., `strium-apps`)
- Reviewers merge the PR into the project branch

**Team file promotion (automatic):** If the merged PR contains `*.team.*` file changes, the `promote-team-files.yml` GitHub Action automatically opens a follow-up PR from `master` containing only the `.team.*` files. Reviewers approve the promotion, merge, and the `sync-to-projects.yml` workflow distributes the change back to every project branch.

### Branch naming convention

```
from/<consumer-project>/<short-description>
```

- `from/` prefix indicates the change originates from a consumer project
- `<consumer-project>` is the name of the app or project (e.g., `strium-apps`, `superapp`, `superapp-sdk`)
- `<short-description>` briefly describes the change (e.g., `add-trading-rules`, `fix-a11y-rule`)

### Merge direction

Team files flow bidirectionally between `master` and project branches via CI automation:

- `project branches → master` — automatic via `promote-team-files.yml` (only `*.team.*` files)
- `master → project branches` — automatic via `sync-to-projects.yml` (merges master into every project branch)

Engineers don't manage these syncs manually. The only manual step is reviewing and merging the promotion PRs when they appear.
