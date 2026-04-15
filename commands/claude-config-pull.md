Pull the latest shared Claude Code config from from/superapp/restructure-to-claude-lib.

1. Run: `git subtree pull --prefix=.claude-lib/shared claude-config from/superapp/restructure-to-claude-lib`
	 - If the `claude-config` remote doesn't exist, add it first:
		 `git remote add claude-config https://github.com/StartaleGroup/claude-config-frontend.git`
2. Run: `bash .claude-lib/shared/.scripts/unpack.sh`
3. Show a summary of what changed.
