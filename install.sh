#!/usr/bin/env bash
set -euo pipefail

# First-time setup: ensures .gitignore entries, then unpacks shared + project into .claude/

SHARED_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"

# Ensure .claude and .claude-lib/shared-overridden are in .gitignore
GITIGNORE="$ROOT_DIR/.gitignore"
for entry in .claude .claude-lib/shared-overridden; do
  if ! grep -qx "$entry" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
  fi
done

# Unpack shared + project into .claude/
bash "$SHARED_DIR/unpack.sh"
