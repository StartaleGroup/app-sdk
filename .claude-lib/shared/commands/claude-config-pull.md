Pull the latest shared Claude Code config.

1. Read the branch name from `.claude-lib/shared/.branch`.
2. Run: `git subtree pull --prefix=.claude-lib/shared claude-config <branch>`
	 - If the `claude-config` remote doesn't exist, add it first:
		 `git remote add claude-config https://github.com/StartaleGroup/claude-config-shared.git`
3. Run: `bash .claude-lib/shared/.scripts/unpack.sh`
4. Show a summary of what changed.
