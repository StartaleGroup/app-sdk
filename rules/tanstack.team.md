---
paths: "**/*.{ts,tsx}"
---

# TanStack Patterns

## TanStack Query

Use `isPending` (not deprecated `isLoading`).

### No Side Effects in `select`

Inline `select` re-runs on every render in v5. Never call `setQueryData()` inside — use `useEffect` instead:

```typescript
// ❌ Bad - overwrites cache
useQuery({
  select: (data) => {
    queryClient.setQueryData(['items'], (old) => ({ ...old, ...data }))
    return data
  },
})

// ✅ Good
const query = useQuery({ queryKey: ['items', itemId], queryFn: fetchItems })
useEffect(() => {
  if (query.data) queryClient.setQueryData(['items'], (old) => ({ ...old, ...query.data }))
}, [query.data, queryClient])
```

### Disable Queries Without Auth

Add `enabled` option when queries depend on authentication:

```typescript
const agentAddress = useWalletStore((s) => s.agentAddress)
const { data } = useQuery({ ...queries.balances({ wallet: agentAddress }), enabled: !!agentAddress })
```

When syncing to stores, clear stale data when query is disabled:

```typescript
useEffect(() => {
  responseData?.data ? setItems(responseData.data.map(mapItem)) : setItems([])
}, [responseData, setItems])
```

## TanStack Router

**Route files must NOT have wrapper components.** Page components use `getRouteApi()` to access params and search directly — this avoids circular dependencies between route files and component files. This applies to both list pages and detail pages.

`routeApi.useParams()` and `routeApi.useSearch()` return `any`, so always add a type annotation to avoid ESLint `no-unsafe-assignment` errors:

```typescript
const routeApi = getRouteApi('/detail/$id')
const { id }: { id: string } = routeApi.useParams()
```

Route definition with Zod validation:

```typescript
const paramsSchema = z.object({ id: z.string() })
export const Route = createFileRoute('/detail/$id')({
  params: { parse: (params) => paramsSchema.parse(params) },
  component: DetailPage, // Direct reference, no wrapper
})
```

## TanStack Start (SSR) — See also `security.team.md` Server Functions for re-validation requirements

Use `ClientOnly` for browser-only components:

```typescript
<ClientOnly fallback={<LoadingSkeleton />}>
  <BrowserOnlyComponent />
</ClientOnly>

// ❌ Bad - Manual isMounted pattern
const [isMounted, setIsMounted] = useState(false)
useEffect(() => { setIsMounted(true) }, [])
```

## TanStack Form

Form methods (`form.setFieldValue`, `form.reset`) have stable references. Include specific methods in deps, not the entire `form` object:

```typescript
// ✅ Good
useEffect(() => {
  if (selectedValue) { form.setFieldValue('amount', selectedValue); clearSelectedValue() }
}, [selectedValue, clearSelectedValue, form.setFieldValue])

// ❌ Bad - entire form object
}, [selectedValue, form, clearSelectedValue])
```
