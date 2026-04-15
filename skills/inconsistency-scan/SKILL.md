---
name: inconsistency-scan
description: Full codebase consistency scan. Checks all hand-written source files against project coding rules for style, pattern, and quality violations. Excludes auto-generated files and node_modules. Use periodically (e.g. before a release or after onboarding new team members) to catch drift from project standards.
disable-model-invocation: true
---

# Codebase Consistency Scan

Scan all hand-written source files for inconsistencies against the project coding
rules defined in `.claude/rules/`. Produce a prioritized, actionable report.

## Scope

**Scan targets**:
- `src/` — application source code
- `e2e/` — end-to-end test specs, page objects, and helpers

**Always exclude** (auto-generated — do not report violations in these paths):
- Any directory containing Orval-generated TanStack Query hooks or Zod schemas (typically `api/`, `api-zod/`, `data-api/`, `data-api-zod/`)
- Route tree auto-generated files (e.g., `routeTree.gen.ts`)
- Any file containing `THIS FILE IS AUTO GENERATED` — skip entirely

**Known rule exceptions** (intentional deviations — do not report):
- `src/router.tsx` — `export function getRouter()` follows TanStack Start's
  official convention; see typescript.md for details
- `e2e/playwright.config.ts` — `export default defineConfig(...)` is required by
  the Playwright framework; see e2e.md for details

---

## Workflow

### Step 1: Launch Parallel Scan Agents

Launch all 4 agents simultaneously in a **single message** with multiple Agent
tool calls. Each agent reads its assigned rules files first, then derives what
violations to search for, then scans the codebase.

**Do not hardcode specific patterns** — derive them from the rules files. This
ensures the scan stays current as rules evolve.

---

**Agent 1 — TypeScript & Function Style** (`general-purpose`, model: `sonnet`)

1. **Read** `.claude/rules/typescript.md` in full
2. **Identify** all rules that can produce observable violations in source code
   (function declaration style, type definitions, return types, number conversion,
   nullish coalescing, import types, Zod usage, etc.)
3. **Scan** `src/` and `e2e/` for violations of those rules
4. **Apply** the known exceptions listed in the Scope section above
5. **Report** file, line number, and code snippet for each finding

---

**Agent 2 — React Patterns** (`general-purpose`, model: `sonnet`)

1. **Read** `.claude/rules/react.md`, `.claude/rules/react-hooks.md`, `.claude/rules/state-management.md`, `.claude/rules/tanstack.md` in full
2. **Identify** all rules that can produce observable violations in source code
   (component structure, hook usage, event handler naming, props typing,
   state management patterns, render patterns, etc.)
3. **Scan** `src/` `.tsx` files (and `e2e/` where applicable) for violations
4. **Apply** the known exceptions listed in the Scope section above
5. **Report** file, line number, and code snippet for each finding

---

**Agent 3 — Code Quality & Error Handling** (`general-purpose`, model: `sonnet`)

1. **Read** `.claude/rules/coding-style.md` in full
2. **Identify** all rules that can produce observable violations in source code
   (immutability, error handling, console statements, input validation,
   file organization, etc.)
3. **Scan** `src/` and `e2e/` for violations of those rules
4. **Apply** the known exceptions listed in the Scope section above
5. **Report** file, line number, and code snippet for each finding

---

**Agent 4 — E2E Testing Standards** (`general-purpose`, model: `sonnet`)

1. **Read** `.claude/rules/e2e.md` in full
2. **Identify** all rules that can produce observable violations in E2E code
   (selector strategy, assertion patterns, timeout handling, test organization,
   auth setup, etc.)
3. **Scan** `e2e/` for violations of those rules
4. **Apply** the known exceptions listed in the Scope section above
5. **Report** file, line number, and code snippet for each finding

---

### Step 2: Consolidate Results

After all 4 agents complete, aggregate findings into a single report:

1. **De-duplicate** — remove any finding reported by multiple agents
2. **Classify severity**:

   | Severity | Criteria |
   |----------|----------|
   | HIGH | Security issues, `any` type, `console.log`, silent catch on critical path, external mutation |
   | MEDIUM | Function/export style violations, interface usage, Zustand pattern, event handler naming |
   | LOW | Missing return types, import style inconsistencies, naming conventions, minor pattern deviations |

3. **Group by category** — not by file — for easier prioritization
4. **Count totals** per severity

---

### Step 3: Present Report

Output the final report in this format:

```
## Codebase Consistency Scan — [DATE]

### Summary
- HIGH: N issues
- MEDIUM: N issues
- LOW: N issues
- CLEAN: [list of categories with zero findings]

---

### HIGH

#### [Category Name]
| File | Line | Snippet |
|------|------|---------|
| path/to/file.ts | 42 | `const foo: any = ...` |

---

### MEDIUM
[same structure]

### LOW
[same structure]

---

### Recommended Actions
1. [Highest-impact fix first]
2. ...
```


---

## Critical Rules

- **NEVER modify any files** during this scan — read-only analysis only
- **ALWAYS read the rules files first** before scanning — derive patterns from the current rules, do not rely on memory or assumptions
- **ALWAYS exclude** auto-generated paths listed in Scope
- **ALWAYS apply** the known rule exceptions listed in Scope
- **ALWAYS run all 4 agents in parallel** — a single message with 4 Agent tool calls
- Focus on **actionable findings** — do not report theoretical or speculative issues
- For each finding, include the exact **file path, line number, and code snippet**
  so the developer can jump directly to the issue

## Notes

- Run this scan periodically: before releases, after large merges, or when
  onboarding new contributors
- The scan complements `/prepr` (which checks only changed files) by
  catching drift that accumulates over time across the full codebase
- Auto-fixes are intentionally out of scope — use `/prepr` or
  `pnpm biome:fix` for automated fixes; this skill is for discovery and reporting
- **Rules evolve**: agents read `.claude/rules/` at scan time, so the scan
  always reflects the latest standards without requiring SKILL.md edits
