# Component Patterns & Decision Flows

How to choose the right pattern for your component.

---

## Component Type Decision Flow

```
Start
  │
  ├─ Does component handle different data types?
  │   └─ YES → Generic Component
  │
  ├─ Does component have distinct visual/behavioral variants?
  │   └─ YES → Discriminated Union
  │
  └─ NO to both → Simple Component
```

---

## Pattern 1: Simple Component

**When to use:**
- Single purpose, no variants
- Fixed prop types
- Most common case

**Structure:**
```typescript
export const StatDisplay = ({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) => {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}
```

---

## Pattern 2: Generic Component

**When to use:**
- Same UI for different data types (e.g., DataTable, List)
- Type safety needed across data variations

**Structure:**
```typescript
export type Column<T> = {
  key: string
  header: string
  render: (item: T, index: number) => ReactNode
}

export const DataTable = <T,>({
  columns,
  data,
  getRowKey,
}: {
  columns: Column<T>[]
  data: T[]
  getRowKey: (item: T) => string
}) => {
  // Implementation
}
```

**Usage:**
```typescript
<DataTable<Item>
  columns={itemColumns}
  data={items}
  getRowKey={(item) => item.id}
/>
```

---

## Pattern 3: Discriminated Union (Variants)

**When to use:**
- Distinct behaviors per variant (not just styling)
- Type-safe variant-specific props
- e.g., buy/sell toggle, send/receive toggle, form modes

**Structure:**
```typescript
type ToggleGroupProps<T extends string> =
  | {
      options: { value: T; label: string }[]
      value: T
      onChange: (value: T) => void
      variant?: 'default'
    }
  | {
      options: { value: 'a' | 'b'; label: string }[]
      value: 'a' | 'b'
      onChange: (value: 'a' | 'b') => void
      variant: 'custom'
    }

export const ToggleGroup = <T extends string>(props: ToggleGroupProps<T>) => {
  const { variant = 'default' } = props
  // Variant-specific logic
}
```

---

## State Management Decision Flow

```
Start
  │
  ├─ Is data from server/API?
  │   └─ YES → TanStack Query
  │
  ├─ Is data shared across components?
  │   └─ YES → Zustand store
  │
  ├─ Is it form input?
  │   └─ YES → TanStack Form
  │
  └─ Local to component → useState
```

---

## Form Complexity Decision Flow

```
Start
  │
  ├─ Simple input (1-2 fields)?
  │   └─ YES → useState + onChange
  │
  ├─ Complex validation needed?
  │   └─ YES → TanStack Form + Zod
  │
  └─ Multiple related fields?
      └─ YES → Custom form hook + TanStack Form
```

**Custom Form Hook Pattern:**
```typescript
export const useFeatureForm = (
  onSubmit: (data: FeatureFormData) => void,
) => {
  return useForm({
    defaultValues: { field1: '', field2: '' },
    validators: { onChange: featureFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  })
}
```

---

## Accessibility Decision Flow

```
Start
  │
  ├─ Is element clickable?
  │   ├─ YES → Add cursor-pointer
  │   └─ Is it not a <button>?
  │       └─ YES → Add role="button", tabIndex={0}, onKeyDown
  │
  ├─ Is it a modal/dialog?
  │   └─ YES → Add role="dialog", aria-modal, focus trap
  │
  └─ Is it a custom control?
      └─ YES → Add appropriate ARIA attributes
```

**Keyboard Handler Pattern:**
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  onClick()
}

<div
  onClick={onClick}
  onKeyDown={handleKeyDown}
  role="button"
  tabIndex={0}
>
```

---

## Dropdown/Overlay Pattern

**When to use:** Menus, selects, popovers

```typescript
{isOpen && (
  <>
    {/* Backdrop to catch outside clicks */}
    <div
      className="fixed inset-0 z-10"
      onClick={onClose}
      role="presentation"
    />
    {/* Content */}
    <div className="absolute top-full left-0 z-20 mt-1">
      {children}
    </div>
  </>
)}
```

---

## Empty State Pattern

**When to use:** Lists, tables with no data

```typescript
{data.length === 0 ? (
  <div className="flex h-20 items-center justify-center text-gray-500 text-sm">
    {emptyMessage}
  </div>
) : (
  // Render data
)}
```
