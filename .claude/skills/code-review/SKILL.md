---
name: code-review
description: Security and quality review of uncommitted changes. Checks for vulnerabilities, code quality, utility duplication, and best practices.
---

# Code Review

Comprehensive security and quality review of uncommitted changes:

1. Get changed files: git diff --name-only HEAD

2. For each changed file, check for:

**Security Issues (CRITICAL):**
- Hardcoded credentials, API keys, tokens
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Insecure dependencies
- Path traversal risks

**Code Quality (HIGH):**
- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- console.log statements
- TODO/FIXME comments
- Missing JSDoc for public APIs

**Utility Duplication (HIGH):**
- New helper functions that duplicate existing ones in `packages/app-sdk/src/util/`
- For each new function added, read the relevant utility file by domain (see `.claude/rules/typescript.md` "Helper Functions" section) and check if an existing function already covers the same use case — even under a different name
- Local utility functions that should be imported from shared lib instead

**Best Practices (MEDIUM):**
- Mutation patterns (use immutable instead)
- Emoji usage in code/comments
- Missing tests for new code
- Accessibility issues (a11y)

3. Generate report with:
   - Severity: CRITICAL, HIGH, MEDIUM, LOW
   - File location and line numbers
   - Issue description
   - Suggested fix

4. Block commit if CRITICAL or HIGH issues found

Never approve code with security vulnerabilities!
