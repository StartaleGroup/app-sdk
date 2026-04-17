Pull the latest shared Claude Code config from master.

1. Run: `git subtree pull --prefix=.claude-lib/shared claude-config master`
	 - If the `claude-config` remote doesn't exist, add it first:
		 `git remote add claude-config https://github.com/StartaleGroup/claude-config-shared.git`
2. Run: `bash .claude-lib/shared/.scripts/unpack.sh`
3. Show a summary of what changed.
