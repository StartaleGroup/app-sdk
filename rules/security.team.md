# Frontend Security

## Environment Variables

```typescript
// ❌ Bad - Hardcoded secret
const apiEndpoint = 'https://api.example.invalid/v1'

// ✅ Good - Environment variable
const apiEndpoint = import.meta.env.VITE_API_ENDPOINT
```

- All secrets and endpoints in `.env` / `.env.local`
- `.env.local` must be in `.gitignore`
- Use `VITE_` prefix for client-exposed variables (Vite convention)
- Non-`VITE_` env vars are server-only (TanStack Start server functions)

## Dangerous APIs (NEVER use)

```typescript
// ❌ XSS vectors - banned in this codebase
dangerouslySetInnerHTML={{ __html: userInput }}
element.innerHTML = data
eval(code)
new Function(code)
document.write(content)
```

React auto-escapes JSX interpolation. If `dangerouslySetInnerHTML` is absolutely needed, sanitize with DOMPurify and get review approval.

## Sensitive Data Exposure

Never log or expose in client code:
- Wallet private keys or mnemonics
- Full wallet addresses in error messages (truncate: `0x1234...abcd`)
- User balances or transaction details in error logs
- API tokens or session tokens
- Internal gateway URLs in user-facing errors

```typescript
// ❌ Bad - Leaks address and balance
console.error(`Withdrawal failed for ${address}: balance=${balance}`)

// ✅ Good - Minimal, safe logging
_log.error('Withdrawal failed:', error.message)
```

## Logging

Use `_log` from `~/lib/loggers` instead of raw `console.*`:

```typescript
import { _log } from '~/lib/loggers'

// ✅ Good - Namespaced logger
_log.error('Operation failed:', error.message)
_log.info('Transaction submitted')

// ❌ Bad - Raw console
console.error('Operation failed:', error.message)
console.log('Transaction submitted')
```

## External Data Validation

Validate ALL data from external sources before use:

| Source | Validate with |
|--------|--------------|
| REST API responses | Zod schema (via Orval) |
| WebSocket messages | Zod schema before store update |
| URL parameters | TanStack Router `validateSearch` |
| User form input | TanStack Form + Zod |

Never trust API/WSS data shape — parse, don't assume.

## Server Functions (TanStack Start)

```typescript
// ✅ Good - Re-validate on server
export const serverHandler = createServerFn({ method: 'POST' })
  .validator(schema)
  .handler(async ({ data }) => {
    // Server must independently verify constraints
    // Client-side checks can be bypassed
  })
```

## Dependency Security

```bash
pnpm audit              # Check for vulnerabilities
pnpm audit --fix        # Auto-fix where possible
```

Review `pnpm audit` output before releases. No known critical vulnerabilities in direct dependencies.

## Security Response Protocol

If a security issue is found:
1. STOP current work
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. If secrets exposed: recommend rotation
