---
description: Interaction design — states, touch targets, dialogs, optimistic UI
globs: **/*.tsx
alwaysApply: false
---

# Interaction Design

## Interactive states
- Every interactive element must define all five states:
  default → hover → focus-visible → active → disabled
- Loading state required for all async actions
- Error state required with a clear recovery path
- Empty state required — never a blank space

## Touch targets
- Minimum 44×44px touch target for all interactive elements (WCAG 2.5.5)
- If the visual element is smaller, expand via padding or pseudo-element
- On mobile, increase spacing between adjacent tap targets to reduce misfire

## Dialogs
- Dismissable by default via visible close affordance (e.g. DialogTopBar showClose)
- Close icon must use the same handler as all other dismissal paths (onOpenChange(false))
- Non-dismissable dialogs must be explicitly named and documented as such
- Escape key closes, clicking outside closes (unless explicitly non-dismissable)

## Optimistic UI
- Apply state change immediately on user action, revert on failure with error message
- Never leave the user waiting without feedback for actions that take more than 300ms

## Disabled states
- Disabled elements must still be understandable — not just greyed out
- Prefer a tooltip or inline message explaining why something is disabled
