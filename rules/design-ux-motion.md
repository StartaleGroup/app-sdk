---
description: Animation, page transitions, motion performance, and reduced-motion rules
globs: **/*.tsx, **/*.css
alwaysApply: false
---

# Animation & Motion

## Page transitions
- All pages must have entrance and exit transitions — default is fade in/out
- Transition spec: opacity 0→1 on enter, opacity 1→0 on exit, duration-300 ease-out
- Use Framer Motion for complex or orchestrated transitions
- Use Tailwind CSS transitions for simple state-based ones
- Transitions must be subtle and consistent — house style, not decorative

## Dialog and sheet transitions
- Full-page dialogs and bottom sheets: slide up from bottom on open
  (translateY(100%)→0), slide down on close — required, not optional
- Standard modals: scale + fade on open (scale-95 opacity-0 → scale-100 opacity-100),
  reverse on close
- Tooltips and popovers: fade only
- Animation type must match component type — a bottom sheet that fades instead
  of slides is a violation
- Every dialog and drawer must have defined enter AND exit transitions —
  missing either is flagged in review

## Number and counter animations
- Any value that updates visually (balances, counts, scores, stats) must animate
  on change — snapping is not acceptable
- The specific pattern is flexible (count-up, flash/highlight, crossfade) but
  must be deliberate and documented in the component

## Easing and duration
- Entrances: ease-out, 200–300ms
- Exits: ease-in, 150–200ms
- Interactive feedback (hover, press): duration-300 ease-out
- Never use linear easing for UI — only for looping or spinner motion
- Primary CTA buttons: hover:brightness-105 active:scale-[0.98] transition duration-300 ease-out

## Performance
- Animate only transform and opacity — never width, height, top, left, or margin
- Use will-change: transform sparingly and only when animation is imminent
- Use Framer Motion layout prop for size and position changes, not raw CSS

## Reduced motion
- Every animation must have a prefers-reduced-motion fallback
- Use Tailwind motion-safe: / motion-reduce: for CSS-based animations
- Use Framer Motion's useReducedMotion() hook for JS-based animations
- Fallback must be an instant transition or static state — never just slower animation

## Purposeful vs decorative
- Animation must serve a purpose: directing attention, confirming an action,
  communicating state, or providing spatial context
- Purely decorative or idle animations must be off by default and opt-in only
