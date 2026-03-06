---
name: achievements
description: Show concise summary of all changes on current branch vs parent branch. Outputs grouped bullet-point list in Japanese.
disable-model-invocation: true
---

# Claude Command: Achievements

Show a concise summary of all changes made on the current branch compared to its parent branch.

## Instructions

1. Detect the current branch name with `git branch --show-current`
2. Detect the parent (base) branch. Try in order:
   - `git config branch.<current>.merge` to check tracking config
   - `git log --oneline --decorate --first-parent` to find the branch point
   - Use `git merge-base` with common base branches (master, main, develop) and pick the closest ancestor
3. **Use `origin/<parent>` over local `<parent>`**: The local branch may be stale. Always prefer `origin/master` over `master`, etc. Check with `git rev-parse --verify origin/<parent>`.
4. Diff against the parent branch **tip** (NOT merge-base) to exclude changes merged in from the parent:
   - `git diff origin/<parent> --stat` — includes uncommitted changes, excludes parent's own changes
   - `git diff origin/<parent>` — full diff for detailed analysis
5. Get branch-only commits (excluding merge commits): `git log origin/<parent>..HEAD --no-merges --oneline`
5. Check for uncommitted changes: `git status --short`

## Important: Why `git diff <parent>` not `git diff $(git merge-base ...)`

If the parent branch was merged into this branch (e.g., `git merge master`), using merge-base will include all changes from the parent. Diffing directly against the parent's current tip shows ONLY the changes unique to this branch.

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
- Include the module/area affected (e.g., "Provider: ...", "Signer: ...")
- Order by importance/impact, most significant first
- Keep each line under 80 characters
- Use Japanese for descriptions
