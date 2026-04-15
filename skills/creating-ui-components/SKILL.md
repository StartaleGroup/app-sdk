---
name: creating-ui-components
description: Create React UI components. Use when building new components, forms, dialogs, data tables, or implementing UI features. Guides through component creation workflow from planning to verification.
---

# Creating UI Components

Workflow for creating UI components.

> **Coding Standards**: See `.claude/rules/` for TypeScript, React, and Tailwind rules.

## Workflow Overview

```
1. Analyze → 2. Plan → 3. Implement → 4. Verify → 5. Test in Chrome
```

---

## Step 1: Analyze Requirements

### Check Existing Components

```bash
# Search for similar components
ls src/components/ui/
ls src/components/[feature]/
```

### Decision: Create or Reuse?

- **Reuse**: Similar component exists → Extend or compose
- **Create**: No suitable component → Proceed to Step 2

---

## Step 2: Plan Component

### Determine Location

| Type | Location | Examples |
|------|----------|----------|
| Base primitive | `ui/` | DataTable, Dialog, Dropdown |
| Feature-specific | `[feature]/` | Feature-specific forms, selectors |
| Layout | `layout/` | Header, Sidebar |

### Determine Component Type

See [PATTERNS.md](./PATTERNS.md) for decision flow:
- Simple component
- Generic component (`<T,>`)
- Variant component (discriminated union)

### Define Props

```typescript
// Required props first, optional props with defaults
{
  // Required
  value: string
  onChange: (value: string) => void
  // Optional with defaults
  disabled?: boolean        // default: false
  className?: string        // for customization
}
```

---

## Step 3: Implement

### Basic Structure

```typescript
import { cn } from '~/lib/utils'

export const MyComponent = ({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) => {
  return (
    <div className={cn('base-classes', className)}>
      {/* Implementation */}
    </div>
  )
}
```

### Checklist During Implementation

- [ ] Named export (no default)
- [ ] Props inline with `type`
- [ ] `cn()` for class merging
- [ ] `cursor-pointer` on clickables
- [ ] `type="button"` on non-submit buttons
- [ ] Keyboard navigation if interactive
- [ ] ARIA attributes if needed

---

## Step 4: Verify & Fix Errors

> **Note**: `pnpm biome:fix` runs automatically via PostToolUse hook after Write/Edit.

### If Hook Fails

1. **Read the error output** - Don't ignore hook failures
2. **Fix errors that cannot be auto-fixed**:
   - `useAwait` - Add `await` or remove `async`
   - `noUnusedImports` - Remove unused imports
   - Type errors - Fix type mismatches
3. **Re-run manually if needed**: `pnpm biome:fix`

### Review Changes

```bash
git diff src/components  # Check component changes
```

- [ ] Only intended files modified
- [ ] No unintended side effects

---

## Step 5: Test in Chrome

> **Requires**: `--chrome` flag when launching Claude Code

### Start Dev Server (if not running)

```bash
lsof -i :<dev-server-port>    # Check if already running
pnpm dev                       # Start if needed
```

### Visual Verification

Use Chrome MCP tools to verify:

1. **Navigate to component**
   - Open the page where component is used
   - Take screenshot to confirm rendering

2. **Check functionality**
   - Test interactive elements (clicks, inputs)
   - Verify state changes work correctly

3. **Test edge cases**
   - Empty state
   - Loading state
   - Error state (if applicable)

4. **Responsive check** (if applicable)
   - Resize window to mobile dimensions
   - Verify layout adapts correctly

### Example Chrome Verification Flow

```
1. tabs_context_mcp        # Get browser context
2. navigate to localhost:<dev-server-port>/[page]
3. computer(screenshot)    # Capture initial state
4. find/read_page          # Locate component
5. computer(left_click)    # Test interaction
6. computer(screenshot)    # Capture result
```

### Checklist

- [ ] Component renders correctly
- [ ] Props work as expected
- [ ] Keyboard navigation works (if interactive)
- [ ] Responsive on mobile (if applicable)
- [ ] No console errors

---

## Quick Reference

### Common Imports

```typescript
import { cn } from '~/lib/utils'
import { z } from 'zod'
```

### Tech Stack

- React 19 + TanStack Start
- Zustand (state), TanStack Form (forms)
- Zod (validation), Tailwind CSS v4

### More Resources

- [PATTERNS.md](./PATTERNS.md) - Component type decision flow, detailed patterns
- [EXAMPLES.md](./EXAMPLES.md) - Real implementation scenarios
