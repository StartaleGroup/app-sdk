---
paths: "**/*.{ts,tsx}"
---

# Web3 & Blockchain Standards

## Decimal Handling

Use viem's utility functions for converting between human-readable amounts and raw blockchain values.

### parseUnits / formatUnits

```typescript
import { parseUnits, formatUnits } from 'viem'

// Human → Raw (for sending to blockchain)
const rawAmount = parseUnits('1000', 6)  // 1000 USDC (6 decimals) → 1000000000n

// Raw → Human (for displaying to user)
const humanAmount = formatUnits(1000000000n, 6)  // → '1000'
```

### parseEther / formatEther

Use for native tokens (18 decimals):

```typescript
import { parseEther, formatEther } from 'viem'

// Human → Raw
const rawEther = parseEther('1.5')  // 1.5 ETH → 1500000000000000000n

// Raw → Human
const humanEther = formatEther(1500000000000000000n)  // → '1.5'
```

## Address Validation

Use viem's `isAddress` for H160 (Ethereum-style) address validation:

```typescript
import { isAddress } from 'viem'

// Direct validation
const isValid = isAddress('0x1234...')  // true/false

// With Zod schema
import { z } from 'zod'
export const AddressSchema = z.string().refine(isAddress)
```

## Transaction Error Handling

Always handle wallet and transaction errors gracefully:

```typescript
// ✅ Good - Comprehensive error handling
try {
  const tx = await signAndSendTransaction(payload)
  await tx.wait()
  toast.success('Transaction confirmed')
} catch (error) {
  if (error.code === 'ACTION_REJECTED') {
    toast.error('Transaction rejected by user')
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    toast.error('Insufficient balance')
  } else {
    console.error('Transaction failed:', error)
    toast.error('Transaction failed. Please try again.')
  }
}

// ❌ Bad - No error handling
await signAndSendTransaction(payload)
```

## Input Validation

Validate all user inputs before transactions:

```typescript
import { z } from 'zod'
import { isAddress } from 'viem'
// Address validation
const AddressSchema = z.string().refine(isAddress, 'Invalid address')

// Amount validation (using viem for bigint comparison)
const AmountSchema = z.string().refine((val) => {
  try {
    const amount = parseUnits(val, 18)
    return amount > 0n
  } catch {
    return false
  }
}, 'Invalid amount')
```

## Security Checklist

When reviewing Web3 code, verify:

- [ ] **Private key handling** - Never log or expose private keys
- [ ] **Transaction signing** - User must confirm all transactions
- [ ] **Re-entrancy patterns** - Avoid state changes after external calls
- [ ] **Spend permissions** - Validate permission bounds and expiry
- [ ] **Allowance checks** - Verify token allowances before transfers
- [ ] **Chain ID verification** - Ensure correct network before transactions

## Best Practices

1. **Always use utility functions** - Never manually calculate with `10 ** decimals`
2. **Validate decimals** - Ensure decimals parameter is within valid range (0-18)
3. **Handle edge cases** - Empty strings, null values, invalid formats
4. **Type safety** - Use `bigint` for raw blockchain values
5. **Graceful error handling** - Always catch and handle wallet/transaction errors
6. **Input validation** - Validate all inputs before transactions
