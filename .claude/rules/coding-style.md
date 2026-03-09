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
const buildRpcMessage = (method: string) =>
  createMessage({
    method,
    params: [],
  })

// ❌ Bad - Unnecessary braces and return
const getTotal = (a: number, b: number) => {
  return a + b
}
```

Use explicit `{ return }` only when the body has multiple statements:

```typescript
// ✅ Good - Multiple statements require explicit block
const processRequest = (input: RpcRequest) => {
  const validated = validateInput(input)
  return submitRequest(validated)
}
```

## Error Handling

Prefer `.catch()` over try-catch for cleaner async error handling:

```typescript
// ✅ Good — .catch() pattern
const result = await riskyOperation().catch((error) => {
  console.error('Operation failed:', error)
  throw new Error('Detailed user-friendly message')
})

// ✅ Also acceptable — try-catch for multi-step operations
try {
  const data = await fetchData()
  const result = await processData(data)
  return result
} catch (error) {
  console.error('Pipeline failed:', error)
  throw new Error('Detailed user-friendly message')
}
```

## Code Quality Checklist

Before marking work complete:
- [ ] Code is readable and well-named
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] Proper error handling
- [ ] No `console.log` statements (SDK code must not pollute consumer's console. `console.error`/`console.warn` are allowed for error reporting)
- [ ] No hardcoded values
- [ ] No hardcoded user-facing strings in UI components
- [ ] No mutation (immutable patterns used)
