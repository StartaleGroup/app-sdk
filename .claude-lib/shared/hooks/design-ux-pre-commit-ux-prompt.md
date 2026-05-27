---
description: Pre-commit hook that prompts the engineer to run /review-ux when UI files are staged
trigger: pre-commit
---

# Pre-commit UX Review Prompt

## Condition
Only fire if staged files include any of the following patterns:
- **/*.tsx
- **/*.css
- **/*.module.css

## Behaviour
Do NOT run /review-ux automatically.
Instead, output the following prompt to the engineer and wait for their response:

---
UI files detected in your staged changes.

Run /review-ux before committing? (y/n)

This checks your changes against accessibility, animation, interaction,
and UX pattern rules.
---

If the engineer responds y: run /review-ux against the staged files only,
show the full report, then ask "Proceed with commit? (y/n)"
If the engineer responds n: allow the commit to proceed immediately with no review.
If the engineer does not respond within 30 seconds: allow the commit to proceed.

## Files this hook should be git-ignored in consuming projects
Add to .gitignore:
.claude/*.team.*
.claude/rules/*.team.*
.claude/commands/*.team.*
.claude/hooks/*.team.*
