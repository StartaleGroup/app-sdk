# Implementation Scenarios

Real scenarios showing the workflow in action.

---

## Scenario 1: Create a Price Display Component

**Request:** "Create a component to display prices with change percentage"

### Step 1: Analyze

```bash
ls src/components/ui/
# Found: StatDisplay.tsx - similar but doesn't handle price change styling
```

**Decision:** Create new component (need price change color logic)

### Step 2: Plan

- **Location:** `src/components/ui/PriceDisplay.tsx`
- **Type:** Simple component
- **Props:**
  - `price: string` (required)
  - `change: number` (required)
  - `className?: string`

### Step 3: Implement

```typescript
import { cn } from '~/lib/utils'

export const PriceDisplay = ({
  price,
  change,
  className,
}: {
  price: string
  change: number
  className?: string
}) => {
  const isPositive = change >= 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="font-mono text-white">{price}</span>
      <span
        className={cn(
          'text-sm',
          isPositive ? 'text-green-500' : 'text-red-500',
        )}
      >
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    </div>
  )
}
```

### Step 4: Verify

```bash
pnpm type-check  # No errors
pnpm biome:fix   # Formatted
```

---

## Scenario 2: Create a Selectable List Component

**Request:** "Create a reusable list component for selecting items"

### Step 1: Analyze

```bash
ls src/components/ui/
# Found: DataTable.tsx - handles generic data, but this needs selection state
```

**Decision:** Create new generic component

### Step 2: Plan

- **Location:** `src/components/ui/SelectableList.tsx`
- **Type:** Generic component (handles any item type)
- **Props:**
  - `items: T[]`
  - `selectedId: string`
  - `onSelect: (item: T) => void`
  - `getItemId: (item: T) => string`
  - `renderItem: (item: T) => ReactNode`

### Step 3: Implement

```typescript
import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export const SelectableList = <T,>({
  items,
  selectedId,
  onSelect,
  getItemId,
  renderItem,
  className,
}: {
  items: T[]
  selectedId: string
  onSelect: (item: T) => void
  getItemId: (item: T) => string
  renderItem: (item: T) => ReactNode
  className?: string
}) => {
  return (
    <div className={cn('flex flex-col', className)}>
      {items.map((item) => {
        const id = getItemId(item)
        const isSelected = id === selectedId

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'cursor-pointer px-3 py-2 text-left transition-colors',
              isSelected
                ? 'bg-border text-white'
                : 'text-gray-400 hover:bg-card hover:text-white',
            )}
          >
            {renderItem(item)}
          </button>
        )
      })}
    </div>
  )
}
```

### Step 4: Verify & Usage

```typescript
// Usage example
<SelectableList<Item>
  items={items}
  selectedId={selectedItemId}
  onSelect={(item) => setSelectedItem(item.id)}
  getItemId={(item) => item.id}
  renderItem={(item) => (
    <span>{item.label}</span>
  )}
/>
```

---

## Scenario 3: Reuse an Existing Toggle Component

**Request:** "Create a mode selector toggle"

### Step 1: Analyze

```bash
ls src/components/ui/
# Found: ToggleGroup.tsx - perfect fit!
```

**Decision:** Reuse existing component

### Step 2: Implementation (just usage)

```typescript
import { ToggleGroup } from '~/components/ui/ToggleGroup'

const MODE_OPTIONS = [
  { value: 'option-a', label: 'Option A' },
  { value: 'option-b', label: 'Option B' },
] as const

// In component
<ToggleGroup
  options={MODE_OPTIONS}
  value={selectedMode}
  onChange={setSelectedMode}
/>
```

No new component needed!

---

## Scenario 4: Create a Form with Validation

**Request:** "Create a withdrawal form with amount validation"

### Step 1: Plan

- **Location:** `src/components/wallet/WithdrawForm.tsx`
- **Type:** Form with TanStack Form + Zod
- **Validation:**
  - Amount > 0
  - Amount <= balance

### Step 2: Create Schema

```typescript
// src/lib/types/withdraw.ts
import { z } from 'zod'

export const withdrawFormSchema = z.object({
  amount: z.string().refine(
    (val) => val !== '' && Number(val) > 0,
    { message: 'Amount must be greater than 0' }
  ),
  address: z.string().min(1, 'Address is required'),
})

export type WithdrawFormData = z.infer<typeof withdrawFormSchema>
```

### Step 3: Create Form Hook

```typescript
// src/hooks/useWithdrawForm.ts
import { useForm } from '@tanstack/react-form'
import { withdrawFormSchema, type WithdrawFormData } from '~/lib/types/withdraw'

export const useWithdrawForm = (
  onSubmit: (data: WithdrawFormData) => void,
) => {
  return useForm({
    defaultValues: { amount: '', address: '' },
    validators: { onChange: withdrawFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  })
}
```

### Step 4: Create Form Component

```typescript
// src/components/wallet/WithdrawForm.tsx
import { useWithdrawForm } from '~/hooks/useWithdrawForm'

export const WithdrawForm = ({
  onSubmit,
  maxAmount,
}: {
  onSubmit: (data: WithdrawFormData) => void
  maxAmount: string
}) => {
  const form = useWithdrawForm(onSubmit)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <form.Field name="amount">
        {(field) => (
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs">Amount</label>
            <input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-2"
              placeholder="0.00"
            />
            <span className="text-gray-500 text-xs">
              Max: {maxAmount}
            </span>
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="cursor-pointer rounded-md bg-border px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
      </form.Subscribe>
    </form>
  )
}
```

### Step 5: Verify

```bash
pnpm type-check  # No errors
pnpm biome:fix   # Formatted
```

---

## Common Troubleshooting

### Error: "cursor-pointer" missing on clickable

```typescript
// Bad - Missing cursor
<div onClick={handleClick}>

// Fixed
<div onClick={handleClick} className="cursor-pointer">
```

### Error: Non-button missing keyboard handler

```typescript
// Bad - Not keyboard accessible
<div onClick={handleClick}>

// Fixed
<div
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabIndex={0}
  className="cursor-pointer"
>
```

### Error: Using `vh` instead of `dvh`

```typescript
// Bad - Mobile browser issues
className="h-screen" // or h-[100vh]

// Fixed
className="h-dvh" // or h-[100dvh]
```
