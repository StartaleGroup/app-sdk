---
name: code-review
description: Security and quality review of code changes. Supports branch comparison (default) and uncommitted changes modes.
---

# Code Review

## Usage

```
skill(name="code-review")                                  # Branch comparison (default)
skill(name="code-review", user_message="mode=uncommitted") # Uncommitted changes only
```

---

## 1. Get Timestamp

Run `date` to get the accurate local time for the report filename:

```bash
date +"%Y%m%d-%H%M"
```

Store the result as `$TIMESTAMP` for use in step 4.

---

## 2. Detect Changes

### Branch Comparison (default)

Detect parent branch dynamically:
1. `git config branch.<current>.merge` — check tracking config
2. `git log --oneline --decorate --first-parent` — find branch point
3. `git merge-base` with common bases (master, main, develop) — pick closest ancestor

Always prefer `origin/<parent>` over local parent (may be stale).

Get changed files and diff (triple-dot = branch-unique changes only):
```bash
git diff --name-only origin/<parent>...HEAD
git diff origin/<parent>...HEAD
```

### Uncommitted Mode

```bash
git diff --name-only HEAD
git status --short
```

### Large Diffs

If the diff exceeds ~2000 lines, review file-by-file using subagents instead of reading the entire diff at once.

---

## 3. Review Checklist

Skip auto-generated files, lock files, and vendored code. For each changed file:

**Security (CRITICAL):**
- Hardcoded credentials, API keys, tokens
- XSS vulnerabilities (`dangerouslySetInnerHTML`, `innerHTML`, `eval`)
- Missing input validation on external data
- Path traversal risks
- Insecure dependencies

**Code Quality (HIGH):**
- Functions > 50 lines, files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- `console.log` statements left in
- Mutation patterns (use immutable instead)

**Utility Duplication (HIGH):**
- New helpers that duplicate existing ones in `packages/app-sdk/src/util/`
- Check `.claude/rules/typescript.md` "Helper Functions" section for existing utilities

**Best Practices (MEDIUM):**
- Missing tests for new code
- Accessibility issues (a11y)

---

## 4. Generate Report

**Output**: `./report/$TIMESTAMP-code-review.md` (create `report/` if needed).

```markdown
# Code Review Report - YYYY-MM-DD HH:MM

## Review Context
- **Mode**: [Branch Comparison / Uncommitted Changes]
- **Parent Branch**: [branch-name] (if branch comparison)
- **Files reviewed**: N

## Summary
- Issues found: N (Critical: N, High: N, Medium: N, Low: N)
- Status: [APPROVED / CHANGES REQUESTED]

## Detailed Findings

### [SEVERITY] File: path/to/file.ts
- **Line**: N
- **Issue**: Description
- **Suggestion**: Fix recommendation

## Recommendations
- List of general improvements
```

---

## 5. Action Required

CRITICAL or HIGH issues found → **CHANGES REQUESTED**. Never approve code with security vulnerabilities.
