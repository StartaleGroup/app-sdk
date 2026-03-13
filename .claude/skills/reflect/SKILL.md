---
name: reflect
description: Review mistakes and update rules. Use after debugging sessions, user corrections, or when anti-patterns are found. Updates .claude/rules/*.md to prevent recurrence.
disable-model-invocation: true
---

# /reflect - Review Mistakes and Update Rules

Review the current conversation for bugs, mistakes, and debugging sessions. Update `.claude/rules/*.md` files to prevent recurrence.

## Process

### Step 1: Identify Mistakes

Scan the conversation for:
- **Bugs introduced** — Code that caused incorrect behavior
- **Debugging sessions** — Issues that required investigation time
- **User corrections** — Cases where the user pointed out errors
- **Anti-patterns used** — Code that violated best practices
- **Repeated iterations** — Multiple rounds of fixes for the same issue

For each mistake, document:
1. What went wrong
2. Why it happened (root cause)
3. How it was fixed

### Step 2: Check Existing Rules

For each identified mistake, read the relevant `.claude/rules/*.md` file and check:

- **Rule already exists?** → The mistake was made DESPITE the rule. This is a **critical failure**. Reflect on:
  - Was the rule unclear or too abstract?
  - Was the rule buried among too many other rules?
  - Did you skip reading the rule file before acting?
  - Would a concrete code example have prevented the mistake?
  - **Action**: Strengthen the existing rule (add examples, make it more prominent, add a "Common Mistake" callout)

- **Rule does NOT exist?** → This is a new learning. Add a new section to the appropriate rule file.

### Step 3: Update Rules

For each actionable learning:

1. Read the full target rule file with the Read tool
2. Determine the best location for the new/updated rule
3. Add or update the rule with:
   - Clear description of what to do / not do
   - A concrete `✅ Good` / `❌ Bad` code example
   - Brief explanation of WHY (the consequence of violating this rule)
4. Do NOT duplicate existing rules — merge or strengthen instead

### Step 4: Summary

Present a summary to the user:

```
## Reflection Summary

### Mistakes Found
1. [Description] — [Root cause]

### Rules Updated
| Rule File | Section | Action |
|-----------|---------|--------|
| typescript.md | assertPresence | Added: "Use assertPresence for type narrowing" |
| security.md | Message Validation | Strengthened: "Validate postMessage origin" |

### Self-Reflection
- [Why was each mistake made despite existing knowledge/rules?]
- [What process improvement would prevent this class of mistake?]
```

## Rule File Reference

| Domain | File |
|--------|------|
| TypeScript, Zod, types | `.claude/rules/typescript.md` |
| Web3, blockchain, viem | `.claude/rules/web3.md` |
| Security, key management | `.claude/rules/security.md` |
| Coding style, immutability | `.claude/rules/coding-style.md` |
| Unit testing (Vitest) | `.claude/rules/unit-test.md` |

## Important

- **No duplicates**: If a rule already covers the issue, strengthen it rather than adding a duplicate
- **Self-accountability**: When a rule existed but was violated, explicitly state WHY and propose a process fix
- **Concrete examples**: Always include code examples from the actual session (adapted for clarity)
- **Minimal changes**: Only update rules that are directly relevant to mistakes found
- **Diff from /learn**: `/learn` extracts reusable patterns to skills files. `/reflect` updates rules to prevent mistakes.
