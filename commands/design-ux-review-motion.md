---
description: Quick motion-only review — use when working exclusively on animations or transitions
---

# /review-motion

Run only the motion and animation checks from /review-ux.
Useful when you are working exclusively on transitions, animations, or motion design.
Executes steps 0 and 2 from /review-ux only.

## Steps

### 0. Pre-check: existing components
Before any other checks, scan imports and component usage.
Flag any cases where a custom implementation exists for something already
in the design system or component library.
Output: list of potential duplications with suggested replacements.

### 1. Animation & Motion
Check each file against .claude/rules/design-and-ux/motion.team.md.
Automated checks:
- Dialog/modal/sheet/drawer components missing enter or exit transition
- Animations on properties other than transform or opacity
- Missing motion-safe: / motion-reduce: or useReducedMotion() on animated elements

Prompted checks:
- "Does this page have an entrance transition?"
- "This component displays a numeric value — does it animate on change?"
- "Does this dialog slide up (bottom sheet) or scale+fade (modal)? Is that correct
  for its type?"

## Output format
Produce a structured report grouped by check type.
Each finding should include:
- File and line number (where detectable)
- Rule violated
- Suggested fix
- Severity: error (must fix) | warning (should fix) | prompt (human judgment needed)

End the report with a summary count per severity.
