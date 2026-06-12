---
description: Analyze E2E test suite quality, detect flaky tests, and provide refactoring recommendations.
---

# E2E Maintenance

Analyze E2E test suite quality and provide refactoring recommendations.

## Checklist

Review the following 10 items in order and report analysis results with improvement recommendations for each.

### 1. Duplicate Test Detection

- Check for identical or similar test cases
- Propose consolidation or removal of duplicates
- Target: `e2e/specs/**/*.spec.ts`

### 2. Test Coverage

- Verify critical features are tested
- Evaluate edge case coverage
- Identify missing test cases
- Reference: `e2e/README.md` test inventory

### 3. Test Execution Time

Check execution time for each test file:
```bash
pnpm test:e2e --reporter=list 2>&1 | grep -E "^\s*(✓|✗)"
```

- Identify slow tests (>30 seconds)
- Propose test splitting or optimization

### 4. Code Readability

- Verify test code is understandable
- Check for comments on complex logic
- Confirm magic numbers are extracted to constants
- Verify helper functions are properly extracted

### 5. Test Stability

- Detect `waitForTimeout` usage (banned — replace with proper assertions per `e2e.md`)
- Identify flaky test patterns
- Verify deadline pattern application
- Reference: `.claude/rules/e2e.md`

### 6. Naming Conventions

- Verify `describe()` and `test()` names accurately reflect content
- Check naming convention consistency

### 7. Test Structure

- Verify tests are organized into logical groups
- Check setup and cleanup are appropriate
- Verify Page Object Model pattern is correctly used
- Reference: `e2e/page-objects/`

### 8. Test Documentation

- Verify `e2e/README.md` is up to date
- Check test purposes are clearly documented
- Propose comment additions where needed

### 9. Dependency Management

- Check inter-test dependencies
- Verify no excessive external resource dependencies
- Check test data management is appropriate
- Reference: `e2e/lib/constants.ts`

### 10. Failure Feedback

- Verify assertion messages are useful
- Check screenshot/trace configuration on errors
- Verify debugging information is output

## Output Format

```markdown
# E2E Test Maintenance Report

## Summary
- Files analyzed: X
- Issues found: X
- Recommended improvements: X

## 1. Duplicate Test Detection
### Status: ✅ No issues / ⚠️ Needs improvement / 🔴 Critical issue
[Detailed analysis results]

## 2. Test Coverage
### Status: ✅ / ⚠️ / 🔴
[Detailed analysis results]

...(same for each item)

## Improvement Action Items

### Priority: High
1. [Specific improvement item]
2. ...

### Priority: Medium
1. ...

### Priority: Low
1. ...
```

## Usage

```
/e2e-maintenance           # Full analysis
/e2e-maintenance auth      # Auth-related tests only
/e2e-maintenance <feature> # Feature-specific tests only
```

## Related

- `/e2e` - Generate and run E2E tests
- `code-review` skill - Code quality review
