---
name: pr-summary
description: Generate PR summary by comparing code differences with parent branch. Uses PR template and outputs to ./report/PR_SUMMARY.MD.
disable-model-invocation: true
---

# Claude Command: PR Summary

* Compare code differences (committed AND uncommitted) with the parent branch, then suggest PR summary content.
* Use simple English with short, clear sentences.
* Always refer to the current `.github/PULL_REQUEST_TEMPLATE.md` file for the template.
* Only use sections that exist in the template, don't add custom sections.
* **Output**: Write the final PR summary to `./report/PR_SUMMARY.MD` (create the `report/` directory if it doesn't exist).

## Parent Branch Detection

The parent branch is NOT always master. Detect it in order:
1. `git config branch.<current>.merge` to check tracking config
2. `git log --oneline --decorate --first-parent` to find the branch point
3. Use `git merge-base` with common base branches (master, main, develop) and pick the closest ancestor

## Use `origin/<parent>` Over Local

The local parent branch may be stale. Always prefer `origin/master` over `master`, etc.
Check with `git rev-parse --verify origin/<parent>`.

## Diff Against Parent Tip (NOT merge-base)

Always diff against the parent branch's **current remote tip**, not the merge-base:
- Use `git diff origin/<parent>` — shows only changes unique to this branch, even if the parent was merged in
- Do NOT use `git diff $(git merge-base <parent> HEAD)` — this includes parent's own changes when the parent was merged into the branch
- Run `git status --short` to identify uncommitted files
- Include uncommitted changes in the summary if present
