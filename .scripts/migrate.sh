#!/usr/bin/env bash
set -euo pipefail

# Migrates an existing .claude/ directory into .claude-lib/project/.
# Compares each file against .claude-lib/shared/, deletes identical files,
# and moves project-specific files to .claude-lib/project/.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_DIR="$(dirname "$SCRIPT_DIR")"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"
CLAUDE_DIR="$ROOT_DIR/.claude"
PROJECT_DIR="$LIB_DIR/project"

if [ ! -d "$CLAUDE_DIR" ]; then
  echo "No .claude/ directory found, nothing to migrate."
  exit 0
fi

if [ -d "$PROJECT_DIR" ] && [ "$(find "$PROJECT_DIR" -type f 2>/dev/null | head -1)" ]; then
  echo "Error: .claude-lib/project/ already exists and has files."
  echo "Delete it first if you want to re-migrate."
  exit 1
fi

identical=0
moved=0

migrate_files() {
  local claude_base="$1" shared_base="$2" project_base="$3" type="$4"

  [ -d "$claude_base" ] || return 0

  find "$claude_base" -type f | while read -r file; do
    rel="${file#"$claude_base"/}"
    shared_file="$shared_base/$rel"

    if [ -f "$shared_file" ] && diff -q "$file" "$shared_file" >/dev/null 2>&1; then
      rm "$file"
      echo "  identical (deleted): $rel"
    else
      dest="$project_base/$rel"
      mkdir -p "$(dirname "$dest")"
      mv "$file" "$dest"
      echo "  moved: $rel"
    fi
  done
}

echo "Migrating agents, commands, hooks, rules..."
for dir in agents commands hooks rules; do
  migrate_files "$CLAUDE_DIR/$dir" "$SHARED_DIR/$dir" "$PROJECT_DIR/$dir" "$dir"
done

echo "Migrating skills..."
if [ -d "$CLAUDE_DIR/skills" ]; then
  find "$CLAUDE_DIR/skills" -mindepth 1 -maxdepth 1 -type d | while read -r skill_dir; do
    skill_name="$(basename "$skill_dir")"
    shared_skill="$SHARED_DIR/skills/$skill_name"

    if [ -d "$shared_skill" ]; then
      all_identical=true
      find "$skill_dir" -type f | while read -r file; do
        rel="${file#"$skill_dir"/}"
        shared_file="$shared_skill/$rel"
        if [ ! -f "$shared_file" ] || ! diff -q "$file" "$shared_file" >/dev/null 2>&1; then
          echo "differ" > /tmp/migrate_check
          break
        fi
      done

      if [ -f /tmp/migrate_check ]; then
        rm /tmp/migrate_check
        all_identical=false
      fi

      if $all_identical; then
        rm -rf "$skill_dir"
        echo "  identical (deleted): skills/$skill_name/"
      else
        dest_dir="$PROJECT_DIR/skills/$skill_name"
        mkdir -p "$(dirname "$dest_dir")"
        mv "$skill_dir" "$dest_dir"
        echo "  moved: skills/$skill_name/"
      fi
    else
      dest_dir="$PROJECT_DIR/skills/$skill_name"
      mkdir -p "$(dirname "$dest_dir")"
      mv "$skill_dir" "$dest_dir"
      echo "  moved: skills/$skill_name/"
    fi
  done
fi

echo "Migrating standalone files..."
for file in "$CLAUDE_DIR"/*.json; do
  [ -f "$file" ] || continue
  mkdir -p "$PROJECT_DIR"
  mv "$file" "$PROJECT_DIR/$(basename "$file")"
  echo "  moved: $(basename "$file")"
done

# Untrack .claude/ from git if it was tracked
if git -C "$ROOT_DIR" ls-files --error-unmatch "$CLAUDE_DIR" >/dev/null 2>&1; then
  echo "Untracking .claude/ from git..."
  git -C "$ROOT_DIR" rm -r --cached "$CLAUDE_DIR" >/dev/null 2>&1 || true
fi

# Clean up empty directories
find "$CLAUDE_DIR" -type d -empty -delete 2>/dev/null || true

echo ""
echo "Migration complete."
echo "  Project config: .claude-lib/project/"
echo ""
echo "Next steps:"
echo "  1. Review and commit .claude-lib/project/"
echo "  2. Run: bash .claude-lib/shared/.scripts/install.sh"
