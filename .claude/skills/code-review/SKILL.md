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

## 3. Run code-reviewer Agent

Delegate the review to the `code-reviewer` agent. Pass the list of changed files from step 2.

The agent handles:
- Reading `.claude/rules/` for project standards
- Rules-driven analysis (security, code quality, best practices)
- Applying fixes and running verification (`pnpm typecheck`, `pnpm lint`)

**Do NOT duplicate the agent's review logic in this skill.** The agent is the single source of truth for review criteria and fix workflow.

---

## 4. Generate Report

After the agent completes, compile its output into a report.

**Output**: `./report/$TIMESTAMP-code-review.md` (create `report/` if needed).

```markdown
# Code Review Report - YYYY-MM-DD HH:MM

## Review Context
- **Mode**: [Branch Comparison / Uncommitted Changes]
- **Parent Branch**: [branch-name] (if branch comparison)
- **Files reviewed**: N

## Summary
- Issues found: N (Critical: N, Warning: N, Suggestion: N)
- Status: [APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED]

## Detailed Findings

### [SEVERITY] File: path/to/file.ts
- **Line**: N
- **Issue**: Description
- **Fix Applied**: diff snippet (if fixed by agent)

## Improvement Proposals

### [SEVERITY] Proposal title
**Current** (`path/to/file.ts:L42`):
\`\`\`typescript
// current code snippet
\`\`\`

**Proposed**:
\`\`\`typescript
// improved code snippet
\`\`\`
```

---

## 5. Action Required

CRITICAL issues found → **CHANGES REQUESTED**. Never approve code with security vulnerabilities.
