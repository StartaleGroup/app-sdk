#!/usr/bin/env bash
set -euo pipefail

# Sets up the shared Claude Code config for a project.
#
# First-time setup (via curl):
#   bash <(curl -s https://raw.githubusercontent.com/StartaleGroup/claude-config-shared/master/.scripts/install.sh) [branch]
#
# Subsequent runs (locally):
#   bash .claude-lib/shared/.scripts/install.sh

REMOTE_URL="https://github.com/StartaleGroup/claude-config-shared.git"
REMOTE_NAME="claude-config"
PREFIX=".claude-lib/shared"

# Detect whether we're running from inside the subtree or externally (e.g. via curl)
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)" || true
if [ -d "$SCRIPT_DIR" ] && [[ "$SCRIPT_DIR" == *"$PREFIX/.scripts" ]]; then
  ROOT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
  cd "$ROOT_DIR"
else
  # Running externally — expect to be in the project root
  BRANCH="${1:-master}"

  if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
    echo "Error: not inside a git repository."
    exit 1
  fi
  cd "$(git rev-parse --show-toplevel)"

  # Add remote if needed
  if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
    echo "Adding remote '$REMOTE_NAME'..."
    git remote add "$REMOTE_NAME" "$REMOTE_URL"
  fi

  # Pull as subtree if needed
  if [ ! -d "$PREFIX" ]; then
    echo "Adding subtree at $PREFIX from branch '$BRANCH'..."
    git subtree add --prefix="$PREFIX" "$REMOTE_NAME" "$BRANCH"
  fi

  # Migrate existing .claude/ if present
  if [ -d ".claude" ]; then
    echo "Existing .claude/ found, running migration..."
    bash "$PREFIX/.scripts/migrate.sh"
  fi

  # Ensure .claude-lib/project/ exists
  [ -d ".claude-lib/project" ] || mkdir -p ".claude-lib/project"
fi

# Ensure .gitignore entries
GITIGNORE=".gitignore"
for entry in .claude .claude-lib/shared-overridden .claude-lib/local; do
  if ! grep -qE "^${entry}/?$" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
  fi
done

# Unpack shared + project into .claude/
bash "$PREFIX/.scripts/unpack.sh"

# Untrack .claude/ if it was previously tracked
if git ls-files --error-unmatch .claude >/dev/null 2>&1; then
  echo "Untracking .claude/ from git..."
  git rm -r --cached .claude >/dev/null 2>&1 || true
fi

# If first-time setup, stage and commit
if [ -n "${BRANCH:-}" ]; then
  echo ""
  git add .claude-lib/project/ .gitignore
  if git diff --cached --quiet; then
    echo "Nothing new to commit."
  else
    git commit -m "Set up shared claude-config subtree"
  fi
fi

echo ""
echo "Done!"
