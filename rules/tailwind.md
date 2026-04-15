---
paths: "**/*.{tsx,css}"
---

# Tailwind CSS Rules

## cn() Function

- Use `cn()` utility for conditional class merging
- Ensure proper class merging where multiple conditional classes are applied

## Size/Spacing Conversions

- Prefer standard Tailwind classes over arbitrary values
- Use Context7 to verify class exists before converting
- Tailwind supports fractional values (e.g., `max-w-89.5`, `h-4.5`)
- Divide px by 4 to get standard value: `h-[120px]` -> `h-30`
- Keep arbitrary values when no standard class exists (e.g., `h-[370px]`)
- **DO NOT** convert standard classes to arbitrary values
- Check all breakpoint variants: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

## Text Size Conversions

- Text sizes use predefined scale, NOT mathematical conversion
- Standard sizes: `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px), `text-5xl` (48px)
- If size doesn't match exactly, keep arbitrary value (e.g., `text-[32px]`)
- **DO NOT** use invalid classes like `text-8` or `text-10`

## Color Conversions

- Only convert when EXACT match exists in palette or custom theme
- **DO NOT** approximate colors (e.g., `#B6912D` is NOT `yellow-700`)
- Check `@theme` in `src/styles.css` for custom colors
- When in doubt, keep the arbitrary color value

## Class Optimization

- Remove redundant or ineffective classes
- Remove classes with no visual effect due to conflicts
- Remove duplicate or unused classes
- Add `cursor-pointer` to clickable elements

## Cross-Browser Pseudo-Elements

When styling range inputs or other elements with vendor-prefixed pseudo-elements, always include both WebKit and Firefox variants. Apply state changes (disabled, hover, focus) to both:

```typescript
// ✅ Good - Both browsers styled, including disabled state
'[&::-webkit-slider-thumb]:border-[#23b899] [&::-moz-range-thumb]:border-[#23b899]',
disabled && 'cursor-not-allowed [&::-webkit-slider-thumb]:border-gray-600 [&::-moz-range-thumb]:border-gray-600',

// ❌ Bad - Firefox disabled state missing
disabled && 'cursor-not-allowed [&::-webkit-slider-thumb]:border-gray-600',
```

## Viewport Units

Use `dvh` instead of `vh` to avoid mobile browser address bar issues.
