---
description: Review staged or specified files against all UX, a11y, motion, and interaction rules
---

# /review-ux

Run a full UX review against all four rule groups on the target files.
If no files are specified, default to files changed in the last commit.

## Steps

### 0. Pre-check: existing components
Before any other checks, scan imports and component usage.
Flag any cases where a custom implementation exists for something already
in the design system or component library.
Output: list of potential duplications with suggested replacements.

### 1. Accessibility (a11y)
Check each file against .claude/rules/design-and-ux/a11y.team.md.
Automated checks:
- Icon-only buttons missing aria-label
- Interactive divs or spans missing ARIA roles
- Images missing alt attributes
- Form inputs missing associated labels
- Heading hierarchy violations

Prompted checks (ask, do not assume):
- "Does this modal trap focus and restore it on close?"
- "Is there a skip-to-main link on this page?"
- "Do dynamic content updates use aria-live?"

### 2. Animation & Motion
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

### 3. Interaction Design
Check each file against .claude/rules/design-and-ux/interaction.team.md.
Automated checks:
- Interactive elements missing hover, focus-visible, or active state classes
- Async actions with no loading state
- Touch targets likely below 44px

Prompted checks:
- "Does this dialog have a close affordance?"
- "Are disabled elements explained — not just visually greyed out?"
- "Do async actions revert on failure with an error message?"

### 4. UX Patterns
Check each file against .claude/rules/design-and-ux/ux.team.md.
Automated checks:
- Hardcoded hex colors or raw px font-size values
- Components that appear to duplicate existing design system primitives

Prompted checks:
- "Does every data-dependent section have an empty state and a loading state?"
- "Are form errors placed directly below their field and shown on blur/submit?"
- "Does this component work in both dark and light mode?"

## Output format
Produce a structured report grouped by rule category.
Each finding should include:
- File and line number (where detectable)
- Rule violated
- Suggested fix
- Severity: error (must fix) | warning (should fix) | prompt (human judgment needed)

End the report with a summary count per severity.
