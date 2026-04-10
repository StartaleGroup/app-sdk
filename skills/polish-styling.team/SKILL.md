---
name: polish-styling
description: Clean Tailwind CSS classnames in modified files. Converts arbitrary values to standard classes, ensures cn() usage, and removes redundant styles.
---

# Clean Tailwind CSS Classnames

**Objective**: Review and clean up Tailwind CSS classnames in modified files (compare with parent branch to identify which files to review)

> **Full rules**: See `.claude/rules/tailwind.md` for comprehensive Tailwind standards.

## Workflow

1. **Identify modified files**: Detect the parent branch dynamically (check upstream tracking or merge base), then use `git diff --name-only <parent>...HEAD` to find files changed in the current branch
2. **Review ENTIRE files**: For each modified file, review ALL Tailwind classes in the entire file, not just the changed lines
3. **Apply cleanup rules**: Follow the instructions below for all classes found

## Instructions

1. **Check for missing `cn` function usage**
   - Identify locations where multiple conditional classes are applied without using the `cn` utility
   - Ensure proper class merging where needed

2. **Use standard Tailwind CSS classes**
   - Prefer standard Tailwind classes over arbitrary values when available
   - Search for ALL arbitrary value patterns in the entire file
   - **IMPORTANT**: Use Context7 to verify Tailwind CSS classnames exist before converting. If Context7 is unavailable, check the official Tailwind documentation at https://tailwindcss.com/docs

   **Size/Spacing conversions**:
   - **IMPORTANT**: Before converting, verify that the standard Tailwind class actually exists using Context7 or Tailwind documentation
   - Tailwind supports fractional values (e.g., `max-w-89.5`, `h-4.5`) - use them instead of arbitrary values
   - Examples: `h-[120px]` → `h-30`, `max-w-[358px]` → `max-w-89.5`, `size-[18px]` → `size-4.5` (divide px by 4)
   - Only use arbitrary values when no standard class exists (e.g., `h-[370px]` stays as-is since `h-92.5` doesn't map cleanly)
   - **DO NOT** convert standard Tailwind classes to arbitrary values (e.g., `max-w-89.5` should NOT become `max-w-[358px]`)
   - Check all breakpoint variants: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

   **Text size conversions**:
   - **CRITICAL**: Text sizes use a predefined scale, NOT simple mathematical conversion
   - Use Context7 or documentation to verify the correct text size class
   - Standard text sizes: `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px), `text-5xl` (48px), etc.
   - **If the size doesn't match exactly** (e.g., 32px, 40px), **keep the arbitrary value** (e.g., `text-[32px]`, `text-[40px]`)
   - **DO NOT** use invalid classes like `text-8` or `text-10`

   **Color conversions**:
   - **IMPORTANT**: Only convert colors when there is an EXACT match in Tailwind's palette or custom theme
   - **DO NOT** approximate or substitute colors (e.g., `#B6912D` is NOT the same as `yellow-700`)
   - Check `@theme` section in `src/styles.css` for available custom colors
   - Examples of valid conversions: `text-[#09090b]` → `text-foreground`, `bg-[#FCFBF8]` → `bg-usdsc-background`
   - For standard colors, use Tailwind's palette only if they match exactly (e.g., `text-zinc-300`, `bg-white`)
   - **When in doubt, keep the arbitrary color value** to preserve the design

3. **Remove unnecessary classnames**
   - Identify and remove redundant or ineffective classes
   - Check for classes that have no visual effect due to conflicting or overriding styles
   - Remove duplicate or unused classes
