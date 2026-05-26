# Review Renovate PRs

Review all open Renovate PRs, add appropriate changeset labels, and approve safe updates.

## Instructions

1. List all open PRs from Renovate using `gh pr list --author "renovate[bot]"`

2. For each PR, check the diff to understand:
   - What package is being updated
   - Whether it's a major, minor, or patch version change
   - Whether it's a dev dependency or runtime dependency
   - Whether it affects app, usdsc, scripts, or all packages
   - Whether it's CI-only (workflows, ubuntu, github actions)

3. Apply the appropriate changeset label (only one):
   - `no-changeset` - For CI-only changes (GitHub Actions, ubuntu, workflows)
   - `patch:superapp` - For deps that only affect the app package
   - `patch:usdsc` - For deps that only affect usdsc
   - `patch:scripts` - For deps that only affect the scripts package
   - `patch:all` - For deps that affect multiple packages
   - `minor:superapp` - For major version bumps or significant new features in superapp deps
   - `minor:all` - For major version bumps affecting multiple packages

4. For safe updates, also add `automerge` label and approve with no comment (never add approval messages)

5. **NEVER comment on Renovate PRs**. No `/rebase`, no `@renovate rebase`, no approval messages — Renovate doesn't respond to comments and they're just noise.

6. **If CI is failing**: Do not approve. Ask the user how to proceed before taking action

7. **Biome updates**: If the PR is named "fix(deps): update patch updates (summary pr)" check if @biomejs/biome is updated. If it is:
   - Checkout the branch
   - Run `pnpm biome:migrate`
   - Review new nursery rules - only keep rules relevant to our stack (skip vue, graphql, etc.)
   - Add new rules that are relevant for our stack
   - run `pnpm biome:fix` and resolve any failures
   - Commit and push the changes

8. If there are merge conflicts in the lockfile:
   - Trigger Renovate to rebase by editing the PR body: find the unchecked rebase checkbox line and check it
   - Use `gh pr view <number> --json body` to get the current body
   - Use `sed` or similar to replace `- [ ]` with `- [x]` on the rebase-check line
   - Use `gh pr edit <number> --body-file` to update — do NOT use inline `--body` as it may escape HTML comments and break Renovate's detection

9. If the PR is marked as abandoned, close it and delete the branch

10. Provide a summary table at the end showing what was processed

## Label Decision Guide

| Change Type | Label |
|-------------|-------|
| GitHub Actions/workflows | `no-changeset` |
| CI runner (ubuntu) | `no-changeset` |
| Dev deps (types, eslint, test utils) | `patch:*` for the affected package |
| Runtime deps patch/minor | `patch:*` for the affected package |
| Runtime deps major version | `minor:*` for the affected package |
| pnpm overrides changes | `patch:superapp` |
