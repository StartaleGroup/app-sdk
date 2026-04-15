Push shared Claude Code config changes back to the source repo.

1. Check `git status` for any uncommitted changes in `.claude-lib/shared/` or `.claude-lib/project/`.
   If there are changes, stage and commit them first — `.claude/` is gitignored so we need the source dirs committed to detect diffs.
2. Run `bash .claude-lib/shared/.scripts/pack.sh` to sort any `.claude/` edits back into shared/ and project/.
3. Run: `bash .claude-lib/shared/.scripts/push.sh`
   This stages, commits, and pushes shared changes to a timestamped feature branch.
4. Show the branch name and suggest creating a PR:
   `gh pr create --repo StartaleGroup/claude-config-frontend --base master --head <branch-name> --title "<short description>" --body "<summary of changes>"`
   Ask the user for a title/description, or suggest one based on the changes.
