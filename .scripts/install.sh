#!/usr/bin/env bash
set -euo pipefail

# First-time setup: ensures .gitignore entries, then unpacks shared + project into .claude/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_DIR="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"

# Ensure .claude/ and .claude-lib/shared-overridden are in .gitignore
GITIGNORE="$ROOT_DIR/.gitignore"
for entry in .claude .claude-lib/shared-overridden; do
  # Match with or without trailing slash to avoid duplicates
  if ! grep -qE "^${entry}/?$" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
  fi
done

# Unpack shared + project into .claude/
bash "$SCRIPT_DIR/unpack.sh"
