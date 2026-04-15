#!/usr/bin/env bash
set -euo pipefail

SHARED_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"
TARGET_DIR="$ROOT_DIR/.claude"
OVERRIDDEN_DIR="$LIB_DIR/shared-overridden"
PROJECT_DIR="$LIB_DIR/project"

# --- Clear shared and project (preserve non-content files in shared like install.sh, .github, etc.) ---

for dir in agents commands hooks rules skills; do
  rm -rf "$SHARED_DIR/$dir"
  rm -rf "$PROJECT_DIR/$dir"
done

# --- Push .claude files back to shared/project based on suffix ---

for dir in agents commands hooks rules; do
  src="$TARGET_DIR/$dir"
  [ -d "$src" ] || continue

  find "$src" -name '*.shared.md' -type f | while read -r file; do
    rel="${file#"$src"/}"
    base="${rel%.shared.md}"
    dest="$SHARED_DIR/$dir/${base}.md"
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
  done

  find "$src" -name '*.project.md' -type f | while read -r file; do
    rel="${file#"$src"/}"
    base="${rel%.project.md}"
    dest="$PROJECT_DIR/$dir/${base}.md"
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
  done
done

# --- Push skills back based on folder suffix ---

src="$TARGET_DIR/skills"
if [ -d "$src" ]; then
  find "$src" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
    skill_folder="$(basename "$skill_dir")"
    case "$skill_folder" in
      *.shared)
        skill_name="${skill_folder%.shared}"
        dest_dir="$SHARED_DIR/skills/$skill_name"
        ;;
      *.project)
        skill_name="${skill_folder%.project}"
        dest_dir="$PROJECT_DIR/skills/$skill_name"
        ;;
      *)
        continue
        ;;
    esac
    mkdir -p "$dest_dir"
    (cd "$skill_dir" && find . -type f | while read -r file; do
      mkdir -p "$dest_dir/$(dirname "$file")"
      cp "$file" "$dest_dir/$file"
    done)
  done
fi

# --- Push shared-overridden files back to shared ---

if [ -d "$OVERRIDDEN_DIR" ]; then
  for dir in agents commands hooks rules; do
    src="$OVERRIDDEN_DIR/$dir"
    [ -d "$src" ] || continue
    find "$src" -name '*.shared.md' -type f | while read -r file; do
      rel="${file#"$src"/}"
      base="${rel%.shared.md}"
      dest="$SHARED_DIR/$dir/${base}.md"
      # Only copy if shared doesn't already have this file (avoid overwriting edits)
      if [ ! -f "$dest" ]; then
        mkdir -p "$(dirname "$dest")"
        cp "$file" "$dest"
      fi
    done
  done

  # Overridden skills
  src="$OVERRIDDEN_DIR/skills"
  if [ -d "$src" ]; then
    find "$src" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
      skill_folder="$(basename "$skill_dir")"
      skill_name="${skill_folder%.shared}"
      dest_dir="$SHARED_DIR/skills/$skill_name"
      if [ ! -d "$dest_dir" ]; then
        mkdir -p "$dest_dir"
        (cd "$skill_dir" && find . -type f | while read -r file; do
          mkdir -p "$dest_dir/$(dirname "$file")"
          cp "$file" "$dest_dir/$file"
        done)
      fi
    done
  fi
fi

echo "Pushed .claude → shared + project"

# --- Push shared changes to source repo if any ---

CONFIG_REMOTE="claude-config"
CONFIG_REMOTE_URL="https://github.com/StartaleGroup/claude-config-frontend.git"
CONFIG_BRANCH="superapp"

# Add the remote if it doesn't exist
if ! git -C "$ROOT_DIR" remote get-url "$CONFIG_REMOTE" &>/dev/null; then
  echo "Adding '$CONFIG_REMOTE' remote..."
  git -C "$ROOT_DIR" remote add "$CONFIG_REMOTE" "$CONFIG_REMOTE_URL"
fi

# Stage and commit shared changes so the worktree has them
git -C "$ROOT_DIR" add "$SHARED_DIR"
if ! git -C "$ROOT_DIR" diff --cached --quiet -- "$SHARED_DIR"; then
  git -C "$ROOT_DIR" commit -m "chore: sync shared config" -- "$SHARED_DIR"
  echo "Committed shared changes"
fi

git -C "$ROOT_DIR" fetch "$CONFIG_REMOTE" "$CONFIG_BRANCH" --quiet

# Create a temp worktree to compare against the source repo
WORKTREE_DIR="$(mktemp -d)"
git -C "$ROOT_DIR" worktree add "$WORKTREE_DIR" "$CONFIG_REMOTE/$CONFIG_BRANCH" --detach --quiet

# Sync shared contents into the worktree
(
  cd "$WORKTREE_DIR"
  rm -rf agents commands hooks rules skills
  rsync -a "$SHARED_DIR/" "$WORKTREE_DIR/"
  git add -A

  if git diff --cached --quiet; then
    echo "No shared changes to push to source repo"
  else
    BRANCH_NAME="from/superapp/sync-$(date +%Y%m%d-%H%M%S)"
    git checkout -b "$BRANCH_NAME"
    git commit -m "Sync shared config from superapp"
    git push "$CONFIG_REMOTE" "$BRANCH_NAME"
    echo "Pushed to $CONFIG_REMOTE/$BRANCH_NAME"
    echo "Open a PR: https://github.com/StartaleGroup/claude-config-frontend/pull/new/$BRANCH_NAME"
  fi
)

git -C "$ROOT_DIR" worktree remove "$WORKTREE_DIR"
