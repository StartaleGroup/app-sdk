#!/usr/bin/env bash
set -euo pipefail

# Pushes .claude-lib/shared changes to the source repo on a feature branch

SHARED_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"

CONFIG_REMOTE="claude-config"
CONFIG_REMOTE_URL="https://github.com/StartaleGroup/claude-config-shared.git"
CONFIG_BRANCH="${1:-$(cat "$SHARED_DIR/.branch" 2>/dev/null)}"

if [ -z "$CONFIG_BRANCH" ]; then
	echo "Error: branch not specified and .claude-lib/shared/.branch not found."
	echo "Usage: push.sh <branch>"
	exit 1
fi

# Add the remote if it doesn't exist
if ! git -C "$ROOT_DIR" remote get-url "$CONFIG_REMOTE" &>/dev/null; then
	echo "Adding '$CONFIG_REMOTE' remote..."
	git -C "$ROOT_DIR" remote add "$CONFIG_REMOTE" "$CONFIG_REMOTE_URL"
fi

# Stage and commit shared changes
SHARED_REL="${SHARED_DIR#"$ROOT_DIR"/}"
git -C "$ROOT_DIR" add -- "$SHARED_REL"
if ! git -C "$ROOT_DIR" diff --cached --quiet -- "$SHARED_REL"; then
	git -C "$ROOT_DIR" commit -m "sync shared Claude Code config" -- "$SHARED_REL"
	echo "Committed shared changes"
fi

BRANCH_NAME="from/$CONFIG_BRANCH/sync-$(date +%Y%m%d-%H%M%S)"
git -C "$ROOT_DIR" subtree push --prefix="$SHARED_REL" "$CONFIG_REMOTE" "$BRANCH_NAME"

echo "Pushed to $CONFIG_REMOTE/$BRANCH_NAME"
echo "Open a PR: https://github.com/StartaleGroup/claude-config-shared/pull/new/$BRANCH_NAME"
