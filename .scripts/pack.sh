#!/usr/bin/env bash
set -euo pipefail

# Reverse of install.sh: sorts .claude/ files back into shared/ and project/ based on suffix

SHARED_DIR="$(cd "$(dirname "$0")/.." && pwd)"
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

# --- Sort .claude files back to shared/project based on suffix ---

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

# --- Sort skills back based on folder suffix ---

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

# --- Restore shared-overridden files back to shared ---

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

# --- Copy standalone files (settings.json) back to project ---

for file in "$TARGET_DIR"/*.json; do
  [ -f "$file" ] || continue
  mkdir -p "$PROJECT_DIR"
  cp "$file" "$PROJECT_DIR/$(basename "$file")"
done

echo "Packed .claude → shared + project"
