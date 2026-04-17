---
description: UX patterns, component conventions, and layout rules
globs: **/*.tsx, **/*.css
alwaysApply: false
---

# UX Patterns & Conventions

## Use existing styles and components first
- Before building anything new, check the existing design system and component library
- Compose from existing primitives — do not duplicate
- If a component almost fits, extend or wrap it rather than creating a new one
- New one-off components should be flagged for potential promotion to the design system
- Any intentional deviation from existing patterns must have an inline comment explaining why

## Reusability
- Extract anything used more than once into a shared component
- One responsibility per component, composable with others
- Never hardcode design token values (colors, spacing, radii, shadows) — always reference tokens
- Props must be typed, documented, and have sensible defaults

## Typography
- Use the fixed type scale exclusively — no arbitrary font-size values outside defined tokens
- Font choices must match context: UI labels, display headings, and body copy are distinct styles
- Never set font-size in raw px or rem — always reference the scale token
- Line height and letter spacing come from the scale, not set ad hoc

## Page layout
- Standard content areas: mx-auto max-w-lg
- Use flexible padding (p-4) and gap-based vertical rhythm
- Only exceed max-w-lg when design explicitly calls for it — document the exception inline
- Layout must work on mobile and desktop without overflow

## Visual hierarchy
- Every screen has one clear primary focal point
- Establish hierarchy via size, weight, and spacing — never color alone
- Use spacing scale steps only — no arbitrary values

## Dark/light mode
- All components must support both modes from day one
- Never hardcode hex values — always use design tokens or CSS variables
- Both modes must be tested before a component is considered complete

## Empty and loading states
- Every data-dependent UI must have explicit empty and loading states
- Prefer skeletons over spinners for content areas
- Empty states should be actionable where possible (e.g. "No items yet — add one")

## Forms
- Labels must always be associated with inputs — never placeholder-only
- Show validation feedback on blur or submit, not on every keystroke
- Error messages placed directly below the relevant field
- Required fields marked consistently

## Feedback and notifications
- Use toasts for non-blocking confirmations (auto-dismiss 3–5s)
- Use dialogs for destructive actions requiring confirmation
- Use inline errors for form validation — never toasts
- Success and failure states must be visually distinct and never rely on color alone

## Cursor
- Set globally: button, a, [role="button"] { cursor: pointer; }
- Never override back to cursor: default on actual click targets
- Use cursor-not-allowed on disabled elements paired with reduced opacity
