---
name: side-effect
description: Post-implementation side effect analysis. Checks consumer impact, shared state, UI components, function signatures, and layout cascade for unintended regressions.
argument-hint: "[master|HEAD~N|commit-hash|file-path]"
---

# Side Effect Analysis

Post-implementation check for unintended side effects. Run after feature work, bug fixes, or refactoring to verify no existing functionality is broken.

## Instructions

### Step 1: Identify Changed Files

```bash
git diff --name-only HEAD
```

If no uncommitted changes, use `$ARGUMENTS` as the diff target (e.g., `master`, `HEAD~3`, a commit hash).

### Step 2: For Each Changed File, Analyze Impact

Use an **Explore agent** to run the following checks in parallel across all changed files:

#### 2a. Consumer Analysis

Find all files that import or reference the changed file:
- Direct imports (`import ... from './changed-file'`)
- Re-exports through barrel files (`index.ts`)
- Dynamic references (string-based paths in tests, configs)

For each consumer, verify the change is compatible.

#### 2b. Shared State Impact

Check if the change affects shared state that other components rely on:

| Shared State | What to Check |
|---|---|
| **Zustand stores** | Store actions/selectors used by other modules |
| **IndexedDB (idb-keyval)** | Keys, stored data shape |
| **Communicator channels** | Message types, payload schemas |
| **Context providers** | Values consumed by children |
| **localStorage/sessionStorage** | Keys read by other features |

#### 2c. UI Component Side Effects

For shared UI components (`src/ui/*`), check ALL consumers:
- **CSS selector changes**: Do new selectors match unintended elements? (e.g., `input:not([type="hidden"])` matching `input[type="range"]`)
- **Prop behavior changes**: Does a default value change affect callers that rely on the old default?
- **Event handler changes**: Does timing or focus behavior affect other modals/dialogs?
- **Animation/transition changes**: Do new animations conflict with consumer expectations?

#### 2d. Function Signature & Behavior

For changed utility functions (`src/util/**`, `src/core/**`):
- **Return type changes**: Does `null` vs `undefined` vs `"-"` vs `"0"` differ from the replaced function?
- **Edge case behavior**: How does the new function handle `null`, `NaN`, empty string, `0`?
- **Formatting differences**: Does the new formatter handle locale, trailing zeros, or precision differently?
- **Import path changes**: Are all consumers updated to the new import?

#### 2e. Layout & Styling Cascade

For CSS/styling changes in UI components (`src/ui/`):
- **Layout changes**: Do structural changes affect dialog/overlay positioning?
- **z-index changes**: Do overlay/modal z-index changes conflict with other overlays?
- **Asset changes**: Do compiled CSS/font asset changes affect the SDK's visual output?

### Step 3: Risk Assessment

Classify each finding:

| Risk | Criteria | Action |
|---|---|---|
| **CRITICAL** | Breaks existing functionality, data loss | Must fix before merge |
| **HIGH** | Visible regression in another feature | Should fix before merge |
| **MEDIUM** | Edge case behavior change, minor visual shift | Document and verify manually |
| **LOW** | Theoretical risk, unlikely to trigger | Note for awareness |
| **NONE** | Intentional change per requirements | Confirm alignment with spec |

### Step 4: Generate Report

```
SIDE EFFECT ANALYSIS: [CLEAN / ISSUES FOUND]

Changed files: N
Consumers analyzed: N

CRITICAL: [count]
HIGH:     [count]
MEDIUM:   [count]
LOW:      [count]

[For each finding above LOW:]
- File: path/to/file.tsx:line
  Risk: HIGH
  Impact: [what breaks and for whom]
  Fix: [specific remediation]
```

### Step 5: Apply Fixes

- Fix all CRITICAL and HIGH issues immediately
- Run `pnpm validate` after fixes (`pnpm validate` = lint + format + typecheck + test + build)
- Re-run consumer checks for any files modified during fixes

## Arguments

$ARGUMENTS can be:
- (empty) — Analyze uncommitted changes (`git diff HEAD`)
- `master` — Analyze all changes vs master branch
- `HEAD~N` — Analyze last N commits
- A commit hash — Analyze changes since that commit
- A file path — Analyze only that specific file's consumers
