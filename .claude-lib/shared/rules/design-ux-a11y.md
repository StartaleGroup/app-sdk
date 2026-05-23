---
description: Accessibility rules — WCAG, ARIA, keyboard navigation, focus management
globs: **/*.tsx
alwaysApply: false
---

# Accessibility (a11y)

## Semantic HTML
- Use the correct element for the job — button for actions, a for navigation,
  nav/main/section for landmarks
- Never use div or span as interactive elements without proper ARIA roles
- Heading hierarchy must be logical (h1 → h2 → h3) — never skip levels for visual styling

## ARIA
- Every icon-only button must have aria-label
- Dynamic content updates must use aria-live regions (polite for most, assertive
  only for critical errors)
- Use aria-expanded, aria-controls, aria-haspopup on toggle and disclosure patterns
- Never use aria-hidden="true" on focusable elements

## Keyboard navigation
- All interactive elements must be reachable and operable via keyboard alone
- Focus order must follow visual and logical reading order
- Modals must trap focus while open and restore focus to the trigger on close
- Escape key must dismiss dialogs, dropdowns, and popovers

## Focus management
- Never remove focus outlines without a custom replacement — :focus-visible is the minimum
- On route change or modal open, programmatically move focus to the new context
- A skip-to-main link must be present on all full pages

## Color and contrast
- Minimum WCAG AA: 4.5:1 for normal text, 3:1 for large text and UI components
- Never use color alone to convey meaning — pair with icon, label, or pattern
- Both dark and light mode variants must pass contrast checks independently

## Screen readers
- Images must have meaningful alt text — decorative images get alt=""
- Loading spinners must have aria-label or visually hidden text
- Form errors must be associated with their input via aria-describedby
