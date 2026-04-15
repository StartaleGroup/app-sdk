#!/usr/bin/env bash
set -euo pipefail

# Generates .claude/ from shared/ and project/ sources, adding tier suffixes

SHARED_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LIB_DIR="$(dirname "$SHARED_DIR")"
ROOT_DIR="$(dirname "$LIB_DIR")"
TARGET_DIR="$ROOT_DIR/.claude"
OVERRIDDEN_DIR="$LIB_DIR/shared-overridden"
PROJECT_DIR="$LIB_DIR/project"

rm -rf "$TARGET_DIR"
rm -rf "$OVERRIDDEN_DIR"
mkdir -p "$TARGET_DIR"
mkdir -p "$OVERRIDDEN_DIR"

# --- Copy shared with .shared suffix ---

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

# Copy standalone files (settings.json, etc.)
for file in "$SHARED_DIR"/*.json; do
  [ -f "$file" ] || continue
  cp "$file" "$TARGET_DIR/$(basename "$file")"
done

echo "Unpacked shared → .claude (with .shared suffix)"

# --- Copy project with .project suffix, moving conflicts to shared-overridden ---

if [ ! -d "$PROJECT_DIR" ]; then
  echo "No project config found, skipping"
  exit 0
fi

for dir in agents commands hooks rules; do
  src="$PROJECT_DIR/$dir"
  [ -d "$src" ] || continue
  mkdir -p "$TARGET_DIR/$dir"
  find "$src" -name '*.md' -type f | while read -r file; do
    rel="${file#"$src"/}"
    base="${rel%.md}"
    dest="$TARGET_DIR/$dir/${base}.project.md"
    # If a .shared.md with the same base name exists, move it to shared-overridden
    shared_file="$TARGET_DIR/$dir/${base}.shared.md"
    if [ -f "$shared_file" ]; then
      mkdir -p "$OVERRIDDEN_DIR/$dir"
      mv "$shared_file" "$OVERRIDDEN_DIR/$dir/${base}.shared.md"
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
    # If a .shared skill folder with the same name exists, move it to shared-overridden
    shared_dir="$TARGET_DIR/skills/${skill_name}.shared"
    if [ -d "$shared_dir" ]; then
      mkdir -p "$OVERRIDDEN_DIR/skills"
      mv "$shared_dir" "$OVERRIDDEN_DIR/skills/${skill_name}.shared"
    fi
    mkdir -p "$dest_dir"
    (cd "$skill_dir" && find . -type f | while read -r file; do
      mkdir -p "$dest_dir/$(dirname "$file")"
      cp "$file" "$dest_dir/$file"
    done)
  done
fi

# Copy standalone files from project (settings.json overrides shared)
for file in "$PROJECT_DIR"/*.json; do
  [ -f "$file" ] || continue
  cp "$file" "$TARGET_DIR/$(basename "$file")"
done

echo "Unpacked project → .claude (with .project suffix)"
