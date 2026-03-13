---
name: achievements
description: Show concise summary of all changes on current branch vs parent branch. Outputs grouped bullet-point list.
disable-model-invocation: true
---

# Claude Command: Achievements

Show a concise summary of all changes made on the current branch compared to its parent branch.

## Instructions

### Step 1: Detect current branch
```bash
git branch --show-current
```

### Step 2: Find the fork point (where THIS branch's own work begins)

The goal is to find the commit where this branch diverged — not master, but the actual parent branch. Try these methods in order and use the first that succeeds:

#### Method A: Check tracking config
```bash
git config branch.<current>.merge
```
If set, extract the branch name (strip `refs/heads/`). This is the parent.

#### Method B: Find the fork point via commit decoration
Look at the commit graph to find where another branch points:
```bash
git log --oneline --decorate --first-parent HEAD
```
Scan from oldest to newest. The first commit that has another branch ref (local or `origin/`) other than the current branch is likely the fork point. The branch name on that commit (or its parent) is the parent branch.

#### Method C: Compare merge-base distances to common bases
```bash
# For each candidate: master, main, develop
git merge-base HEAD origin/<candidate>
git rev-list --count <merge-base>..HEAD
```
Pick the candidate with the **fewest** commits between merge-base and HEAD — that's the closest ancestor and most likely parent.

### Step 3: Determine the diff base commit

Once the parent branch is identified, compute the **fork point** — the exact commit where this branch diverged:

```bash
# Preferred: git's fork-point detection (handles rebased parents)
FORK=$(git merge-base --fork-point origin/<parent> HEAD)

# Fallback: standard merge-base
FORK=$(git merge-base origin/<parent> HEAD)
```

### Step 4: Diff from the fork point

Use the fork point commit (NOT the parent branch tip) to see only this branch's changes:

```bash
git diff $FORK --stat          # Summary of changed files
git diff $FORK                 # Full diff for detailed analysis
```

### Step 5: Get branch-only commits
```bash
git log $FORK..HEAD --no-merges --oneline
```

### Step 6: Check uncommitted changes
```bash
git status --short
```

## Why fork point, not parent branch tip?

- **`git diff origin/<parent>`** (old approach): If the parent branch has new commits after this branch forked, those appear as "removed" in the diff. If the parent was merged into master, changes from other branches bleed in. This over-reports.
- **`git diff $FORK`** (correct approach): Shows exactly the commits added on THIS branch since it diverged. No more, no less. Works regardless of what happened to the parent branch after forking.

## Output Format

Display results as a bullet-point list. Each change should be **one line** summarizing what was done.

Format:
```
## Achievements on `<branch-name>`

- <change 1>
- <change 2>
- ...

**Files changed**: N files | **Commits**: M | **Uncommitted**: X files
```

## Rules

- Group related changes into a single bullet point (e.g., multiple commits for one feature = one bullet)
- Use clear, specific descriptions (not vague like "updated files")
- Include the component/area affected (e.g., "Swap: ...", "Wallet: ...")
- Order by importance/impact, most significant first
- Keep each line under 80 characters