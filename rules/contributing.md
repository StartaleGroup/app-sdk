# Contributing to Shared Config

## Shared vs project content

Config in this repo is split across two tiers. It is critical to keep them separate:

**Shared tier** (files in `.claude-lib/shared/`, on `master` branch):
- Rules, skills, commands, and hooks that apply to **all** projects using this config
- Must be generic enough to work across all consumer projects

**Project tier** (files in `.claude-lib/project/`, on project branches):
- Rules, skills, commands, and hooks specific to a **single project**
- Lives on the project branch and is pulled into the consumer project via subtree

### How to decide

When creating or editing a config file, ask:
- Does this apply to all projects regardless of context? → **shared** (lands on `master`)
- Does this only apply to one project? → **project** (lands on the project branch)

## Submitting changes from consumer projects

When pushing config changes back to this repo from a consumer project, always push to a **feature branch** and open a PR. Never push directly to `master` or to a project branch.

### PR target branch

Every PR from a consumer project targets the project branch (e.g., `superapp`):

- Consumer runs `push.sh <branch>` or pushes manually
- The feature branch is pushed to `claude-config-shared`
- Open a PR from the feature branch → the project branch
- Reviewers merge the PR into the project branch

**Shared file promotion (automatic):** If the merged PR contains shared config changes, a GitHub Action automatically opens a follow-up PR to `master`. Reviewers approve the promotion, merge, and the sync workflow distributes the change back to every project branch.

### Branch naming convention

```
from/<consumer-project>/<short-description>
```

- `from/` prefix indicates the change originates from a consumer project
- `<consumer-project>` is the name of the app or project
- `<short-description>` briefly describes the change

### Merge direction

Shared files flow bidirectionally between `master` and project branches via CI automation:

- `project branches → master` — automatic promotion of shared changes
- `master → project branches` — automatic sync to all project branches

Engineers don't manage these syncs manually. The only manual step is reviewing and merging the promotion PRs when they appear.
