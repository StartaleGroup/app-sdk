# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate:

```typescript
// WRONG: Mutation
const updateUser = (user: User, name: string) => {
  user.name = name  // MUTATION!
  return user
}

// CORRECT: Immutability
const updateUser = (user: User, name: string) => ({
  ...user,
  name
})
```

## File Organization

MANY SMALL FILES > FEW LARGE FILES:
- High cohesion, low coupling
- 200-400 lines typical, 800 max
- Extract utilities from large components
- Organize by feature/domain, not by type

## Implicit Return

Prefer implicit return (concise body) over `{ return ... }` when the function body is a single expression:

```typescript
// ✅ Good - Implicit return
const getTotal = (a: number, b: number) => a + b
const getUserName = (user: User) => user.profile.name
const createItem = (input: ItemInput) =>
  useMutation({
    mutationFn: async () => { /* ... */ },
  })

// ❌ Bad - Unnecessary braces and return
const getTotal = (a: number, b: number) => {
  return a + b
}
```

Use explicit `{ return }` only when the body has multiple statements:

```typescript
// ✅ Good - Multiple statements require explicit block
const processItem = (input: ItemInput) => {
  const validated = validateInput(input)
  return submitItem(validated)
}
```

## Error Handling

Prefer `.catch()` over try-catch for cleaner async error handling:

```typescript
// ✅ Good — .catch() pattern
const result = await riskyOperation().catch((error) => {
  _log.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
})

// ✅ Also acceptable — try-catch for multi-step operations
try {
  const data = await fetchData()
  const result = await processData(data)
  return result
} catch (error) {
  _log.error('Pipeline failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

## Comments

Only add comments when the code cannot speak for itself. Good names eliminate most comment needs.

**Keep comments for:**
- Non-obvious *why* (rule references, workarounds, constraints): `// Prefix match — permitted locator() exception per e2e.md`
- Surprising behaviour or known gotchas: `// Poll after navigation — data refetch is async and may lag`
- Prerequisites or invariants a reader must know before using the code

**Remove comments that:**
- Restate what the code already says (`// Click the button` above `await button.click()`)
- Number sequential steps (`// 1. Navigate`, `// 2. Click`)
- Describe a function that is named clearly enough (`// Returns the balance` above `getBalance()`)
- Add JSDoc to trivial getters or single-line helpers

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No raw console.log statements (use `_log.*` from `~/lib/loggers`)
- [ ] No hardcoded values
- [ ] No hardcoded user-facing strings (use Lingui i18n: `t` macro or `<Trans>` component)
- [ ] No mutation (immutable patterns used)
