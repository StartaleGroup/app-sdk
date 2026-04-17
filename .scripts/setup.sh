#!/usr/bin/env bash
set -euo pipefail

# Sets up the shared Claude Code config for a project as a git subtree.
# Usage: bash <(curl -s https://raw.githubusercontent.com/StartaleGroup/claude-config-frontend/master/.scripts/setup.sh) [branch]

BRANCH="${1:-master}"
REMOTE_URL="https://github.com/StartaleGroup/claude-config-frontend.git"
REMOTE_NAME="claude-config"
PREFIX=".claude-lib/shared"
SCRIPT_DIR="$PREFIX/.scripts"

# Ensure we're at the root of a git repo
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Error: not inside a git repository."
  exit 1
fi
cd "$(git rev-parse --show-toplevel)"

# 1. Add remote if it doesn't exist
if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Adding remote '$REMOTE_NAME'..."
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
else
  echo "Remote '$REMOTE_NAME' already exists."
fi

# 2. Pull as subtree (skip if already present)
if [ -d "$PREFIX" ]; then
  echo "$PREFIX already exists, skipping subtree add."
else
  echo "Adding subtree at $PREFIX from branch '$BRANCH'..."
  git subtree add --prefix="$PREFIX" "$REMOTE_NAME" "$BRANCH"
fi

# 3. Migrate existing .claude/ if present
if [ -d ".claude" ]; then
  echo "Existing .claude/ found, running migration..."
  bash "$SCRIPT_DIR/migrate.sh"
fi

# 4. Ensure .claude-lib/project/ exists
if [ ! -d ".claude-lib/project" ]; then
  mkdir -p ".claude-lib/project"
  echo "Created .claude-lib/project/"
fi

# 5. Run install (sets up .gitignore + unpacks into .claude/)
echo "Running install..."
bash "$SCRIPT_DIR/install.sh"

# 6. Untrack .claude/ if it was previously tracked
if git ls-files --error-unmatch .claude >/dev/null 2>&1; then
  echo "Untracking .claude/ from git..."
  git rm -r --cached .claude >/dev/null 2>&1 || true
fi

# 7. Commit
echo ""
echo "Setup complete. Staging and committing..."
git add .claude-lib/project/ .gitignore
# Only commit if there are staged changes
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "Set up shared claude-config subtree"
fi

echo ""
echo "Done! Run 'git status' to verify."
