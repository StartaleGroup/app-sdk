# SDK Security

## Environment Variables

```typescript
// ❌ Bad - Hardcoded secret
const apiKey = 'sk-1234567890'

// ✅ Good - Environment variable or configuration
const apiKey = process.env.API_KEY
```

- All secrets and endpoints in `.env` / `.env.local`
- `.env.local` must be in `.gitignore`
- Never bundle secrets into the SDK distribution

## Dangerous APIs (NEVER use)

```typescript
// ❌ XSS vectors - banned in this codebase
dangerouslySetInnerHTML={{ __html: userInput }}
element.innerHTML = data
eval(code)
new Function(code)
document.write(content)
```

Preact auto-escapes JSX interpolation. If `dangerouslySetInnerHTML` is absolutely needed, sanitize with DOMPurify and get review approval.

## Sensitive Data Exposure

Never log or expose in SDK code:
- Wallet private keys or mnemonics
- Full wallet addresses in error messages (truncate: `0x1234...abcd`)
- Signing keys or session tokens
- Internal URLs in user-facing errors

```typescript
// ❌ Bad - Leaks address and key info
console.error(`Signing failed for ${address}: key=${keyId}`)

// ✅ Good - Minimal, safe logging
console.error('Signing failed:', error.message)
```

## External Data Validation

Validate ALL data from external sources before use:

| Source | Validate with |
|--------|--------------|
| RPC responses | Type guards or schema validation |
| postMessage data | Origin check + type validation |
| User-provided config | Runtime type checking |
| External API responses | Schema validation before processing |

Never trust external data shape — parse, don't assume.

## Message Origin Validation

```typescript
// ✅ Good - Validate postMessage origin
window.addEventListener('message', (event) => {
  if (event.origin !== expectedOrigin) return
  // Process message only from trusted origin
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
