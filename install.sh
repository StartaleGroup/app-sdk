#!/usr/bin/env bash
set -euo pipefail

SHARED_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"
TARGET_DIR="$ROOT_DIR/.claude"
IGNORED_DIR="$LIB_DIR/shared-overridden"
PROJECT_DIR="$LIB_DIR/project"

# Ensure .claude and .claude-lib/ignored are in .gitignore
GITIGNORE="$ROOT_DIR/.gitignore"
for entry in .claude .claude-lib/shared-overridden; do
  if ! grep -qx "$entry" "$GITIGNORE" 2>/dev/null; then
    echo "$entry" >> "$GITIGNORE"
  fi
done

rm -rf "$TARGET_DIR"
rm -rf "$IGNORED_DIR"
mkdir -p "$TARGET_DIR"
mkdir -p "$IGNORED_DIR"

# --- Step 1: Copy shared with .shared suffix ---

# Copy top-level directories: agents, commands, hooks, rules
for dir in agents commands hooks rules; do
  src="$SHARED_DIR/$dir"
  [ -d "$src" ] || continue
  mkdir -p "$TARGET_DIR/$dir"
  find "$src" -name '*.md' -type f | while read -r file; do
    rel="${file#"$src"/}"
    base="${rel%.md}"
    dest="$TARGET_DIR/$dir/${base}.shared.md"
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
  done
done

# Copy skills — add .shared suffix to the skill folder name, not the files inside
src="$SHARED_DIR/skills"
if [ -d "$src" ]; then
  find "$src" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
    skill_name="$(basename "$skill_dir")"
    dest_dir="$TARGET_DIR/skills/${skill_name}.shared"
    mkdir -p "$dest_dir"
    (cd "$skill_dir" && find . -type f | while read -r file; do
      mkdir -p "$dest_dir/$(dirname "$file")"
      cp "$file" "$dest_dir/$file"
    done)
  done
fi

echo "Installed shared → .claude (with .shared suffix)"

# --- Step 2: Copy project with .project suffix, moving conflicts to ignored ---

if [ ! -d "$PROJECT_DIR" ]; then
  echo "No project config found, skipping"
  exit 0
fi

# Copy top-level directories: agents, commands, hooks, rules
for dir in agents commands hooks rules; do
  src="$PROJECT_DIR/$dir"
  [ -d "$src" ] || continue
  mkdir -p "$TARGET_DIR/$dir"
  find "$src" -name '*.md' -type f | while read -r file; do
    rel="${file#"$src"/}"
    base="${rel%.md}"
    dest="$TARGET_DIR/$dir/${base}.project.md"
    # If a .shared.md with the same base name exists, move it to ignored
    shared_file="$TARGET_DIR/$dir/${base}.shared.md"
    if [ -f "$shared_file" ]; then
      mkdir -p "$IGNORED_DIR/$dir"
      mv "$shared_file" "$IGNORED_DIR/$dir/${base}.shared.md"
    fi
    mkdir -p "$(dirname "$dest")"
    cp "$file" "$dest"
  done
done

# Copy skills — add .project suffix to the skill folder name
src="$PROJECT_DIR/skills"
if [ -d "$src" ]; then
  find "$src" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
    skill_name="$(basename "$skill_dir")"
    dest_dir="$TARGET_DIR/skills/${skill_name}.project"
    # If a .shared skill folder with the same name exists, move it to ignored
    shared_dir="$TARGET_DIR/skills/${skill_name}.shared"
    if [ -d "$shared_dir" ]; then
      mkdir -p "$IGNORED_DIR/skills"
      mv "$shared_dir" "$IGNORED_DIR/skills/${skill_name}.shared"
    fi
    mkdir -p "$dest_dir"
    (cd "$skill_dir" && find . -type f | while read -r file; do
      mkdir -p "$dest_dir/$(dirname "$file")"
      cp "$file" "$dest_dir/$file"
    done)
  done
fi

echo "Installed project → .claude (with .project suffix)"
