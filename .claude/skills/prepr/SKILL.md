---
name: prepr
description: Pre-PR quality check with adaptive agent selection, code simplification with user approval, and optimized validation. Scales review depth by diff size.
disable-model-invocation: true
---

# Pre-PR Check

Run comprehensive pre-PR checks to ensure code quality before creating a pull request.

## Workflow

### Step 1: Preparation & Classification (Sequential)

1. **Detect parent branch**: Determine the base branch by checking the upstream
   tracking branch or using `git log --oneline --merges` to find the branch point
2. **Identify changed files**: Compare current branch with the detected parent
   branch using `git diff` to get the full list of changed files and the diff
3. **Classify diff** to determine review tier:
   - Count total changed lines (additions + deletions)
   - Detect new function/helper definitions (for utility duplication check)
   - Detect export or shared state changes (for side effect analysis)
   - Detect security-sensitive file changes (for security review)
4. **Check unit test coverage for new functions**: For each new exported
   function detected in `packages/app-sdk/src/`:
   - Look for `__tests__/<filename>.test.ts(x)` or `<filename>.test.ts` nearby
   - If no test file exists, add function to "missing tests" list
   - Skip auto-generated asset files and UI components in `src/ui/`
5. **Determine review tier** (see [Review Tiers](#review-tiers))
6. **Prepare scoped context per agent** (see [Agent Scope Rules](#agent-scope-rules))

### Step 2: Parallel Review (Adaptive agent count)

Launch agents for the determined tier in a SINGLE message using multiple
Agent tool calls:

**Agent 1 — Code Review** (`code-reviewer` agent, model: `opus`):
- Full code review per the agent's checklist (security, code quality,
  performance, best practices, dead code, maintainability)
- Apply fixes directly to changed files
- **DO NOT** run biome or type-check — validation happens once in Step 4
- **Always runs** in all tiers

**Agent 2 — Semantic Logic Review** (`general-purpose` agent, model: `opus`):
- Understand the feature intent from the diff
- Check for edge cases: boundary conditions, empty states, error scenarios
- Check for logic gaps: missing validation, incomplete state handling,
  unhandled branches
- Check for data consistency: type mismatches, incorrect transformations
- Report findings with severity (CRITICAL/HIGH/MEDIUM/LOW) and suggested fixes
- READ-ONLY: Do not apply fixes, only report
- **Runs in**: STANDARD and FULL tiers

**Agent 3 — Utility Duplication Check** (`general-purpose` agent, model: `sonnet`):
- For each new function/helper in the PR, check `packages/app-sdk/src/` for existing
  utilities that cover the same use case (even under different names)
- Reference `.claude/rules/typescript.md` "Helper Functions" section for
  domain-to-file mapping
- Report any duplicates found with replacement suggestions
- READ-ONLY: Do not apply fixes, only report
- **Runs in**: FULL tier only, AND only when new functions are detected in
  Step 1

**Agent 4 — Side Effect Analysis** (`general-purpose` agent, model: `opus`):
- **Scope**: Only files that change exports, shared state (Zustand stores,
  IndexedDB keys, Context providers, localStorage/sessionStorage), or shared UI components (`src/ui/*`)
- **Consumer search**: Use `Grep` tool with the changed file's basename
  (e.g., `pattern: "from.*useAccountsStore"`) to find importers efficiently.
  Do NOT read every file in the project — search first, then read only
  the matched files.
- For each scoped file, analyze impact on consumers:
  - **Consumer analysis**: Verify each consumer is compatible with the change
    (check call sites, destructured props, expected return types).
  - **Shared state impact**: Check if changes affect query keys, cache shape,
    `select` transforms, channel names, payload schemas.
  - **UI component side effects**: Check ALL consumers for CSS selector
    changes, prop default value changes, event handler timing changes, and
    animation conflicts.
  - **Function signature & behavior**: Check return type changes (`null` vs
    `undefined` vs `"-"` vs `"0"`), edge case behavior, formatting
    differences, and import path updates.
  - **Layout & spacing cascade**: Check grid/flex responsive breakpoint
    impact, fixed-width to flexible content overflow, and z-index overlay
    conflicts.
- Classify findings: CRITICAL (breaks existing functionality) / HIGH (visible
  regression) / MEDIUM (edge case change) / LOW (theoretical risk)
- READ-ONLY: Do not apply fixes, only report with file:line references
- **Runs in**: STANDARD and FULL tiers, AND only when export/shared state
  changes are detected in Step 1

**Agent 5 — Security Review** (`security-reviewer` agent, model: `opus`):
- Deep security audit per the agent's SDK-specific checklist (key management,
  message passing, provider security, blockchain interaction, input validation)
- Read `.claude/rules/security.md` + `.claude/rules/web3.md` for rules
- Focus on attack vectors specific to wallet SDKs: key exposure, origin
  bypass, spend permission bounds, IndexedDB encryption, signing flow integrity
- Report findings with severity (CRITICAL/HIGH/MEDIUM/LOW), file:line, impact,
  and suggested fix
- READ-ONLY: Do not apply fixes, only report
- **Runs in**: STANDARD and FULL tiers, AND only when security-sensitive files
  are changed in Step 1 (files under `core/communicator/`, `sign/`, `kms/`,
  `interface/payment/`, `interface/public-utilities/spend-permission/`, `store/`)

### Step 3: Consolidation, Simplification & Side Effect Re-check (Single Phase)

This step combines fix application, code simplification, and side-effect
verification into ONE sequential pass to minimize overhead.

4. **Review agent results**: Collect findings from all launched agents
5. **Apply remaining fixes**: For issues found by Agent 2, 3, 4, and 5 that
   Agent 1 didn't already fix:
   - Apply fixes for CRITICAL and HIGH issues
   - Apply MEDIUM fixes when straightforward
6. **Clean up**: Remove any remaining unused code in changed files
7. **Run simplification** (`code-simplifier` agent, model: `opus`):
   - Review changed files for clarity, consistency, and maintainability
   - Simplify overly complex logic, reduce nesting, improve naming
   - Consolidate duplicate patterns within the changed files
   - **MUST NOT** change functionality or behavior — refactoring only
   - **MUST NOT** modify component interfaces, props, or return types
8. **Present simplification changes for user approval**:
   - Show the diff of simplification changes to the user
   - User reviews and approves or rejects
   - If rejected: revert simplification changes and proceed to Step 4
   - If no changes were made: skip side-effect re-check, proceed to Step 4
9. **Lightweight side-effect re-check** (only if simplification was accepted):
   - Scope: ONLY the diff produced by step 7 (not the full PR diff)
   - Same checklist as Agent 4 (consumer analysis, shared state, UI
     components, function signatures, layout cascade)
   - Perform this check inline (no separate agent) — analyze the simplify
     diff directly and verify no exports, return types, or shared state
     were altered
   - If CRITICAL or HIGH issues found: revert the simplification changes
     and inform the user
   - If only MEDIUM/LOW: report findings to the user and proceed

### Step 3.5: Unit Test Coverage Report

If the "missing tests" list from Step 1 item 4 is non-empty, report it to the
user **after** consolidation and **before** validation:

- List each function missing a test with its source file path
- Suggest the recommended test file path
- **Do NOT block** the commit — this is a suggestion only
- Example output:
  ```
  ⚠️ Unit Test Missing:
  - `newUtilFunction` in src/util/encoding.ts
    → Suggested: src/util/__tests__/encoding.test.ts
  - `newSignMethod` in src/sign/signer.ts
    → Suggested: src/sign/__tests__/signer.test.ts
  ```

If the list is empty, skip this step silently.

### Step 4: Validation (Partially Parallel)

10. **Run `pnpm lint` and `pnpm typecheck` in parallel** (two
    separate Bash calls in one message)
11. **Fix errors**: If either fails, fix reported errors and re-run
12. **Run `pnpm build`**: Execute build after lint + typecheck pass
13. **Fix errors**: If build fails, fix and re-run until clean

## Review Tiers

| Tier | Condition | Agents | Estimated Time |
|------|-----------|--------|----------------|
| LIGHT | < 30 changed lines | Agent 1 only | ~4 min |
| STANDARD | 30–99 changed lines | Agent 1 + Agent 2 + Agent 4 + Agent 5 (if applicable) | ~6 min |
| FULL | ≥ 100 changed lines | All 5 agents (Agent 3, 4, 5 conditional) | ~8 min |

**Override**: If the user explicitly requests a full review regardless of
diff size, always use the FULL tier.

## Agent Scope Rules

To minimize agent processing time, pass only relevant portions of the diff:

| Agent | Receives |
|-------|----------|
| Agent 1 (Code Review) | Full diff + full file list |
| Agent 2 (Semantic Logic) | Full diff (needs full context for logic analysis) |
| Agent 3 (Utility Duplication) | Only new function/helper definitions extracted from the diff |
| Agent 4 (Side Effects) | Only diffs for files that change exports, shared state, or shared UI components |
| Agent 5 (Security) | Only diffs for security-sensitive files (`core/communicator/`, `sign/`, `kms/`, `interface/payment/`, `interface/public-utilities/spend-permission/`, `store/`) |

## Critical Rules

- **ONLY** review and clean up files changed in this PR (do not touch
  unrelated files)
- **NEVER** change functionality or behavior during cleanup
- **ALWAYS** preserve existing component interfaces and props
- **MUST** re-run validation after any fixes to confirm no regressions
- **MUST** pass scoped diff content to each agent per the Agent Scope Rules
  (agents don't share context)
- **MUST** get user approval before accepting simplification changes
- **MUST** revert simplification if side-effect re-check finds CRITICAL or
  HIGH issues

## Notes

- Refer to the rules defined in CLAUDE.md
- Do NOT hardcode the parent branch; always detect it dynamically
- Agent 2, 3, 4, and 5 are read-only reviewers; only Agent 1 (code-reviewer)
  applies fixes during the parallel phase
- **Agent 1 does NOT run biome or type-check** — validation runs once in
  Step 4 to avoid duplicate project-wide scans
- Step 3 combines consolidation + simplification + side-effect re-check to
  avoid multiple sequential agent phases
- Step 3's side-effect re-check (item 9) is performed inline by the main
  agent, not a separate subagent — this saves one agent invocation
- Step 4 runs lint and typecheck in parallel to reduce validation time
- Agent 3, 4, and 5 are conditionally launched based on Step 1 classification:
  Agent 3 only when new functions exist, Agent 4 only when exports or shared
  state change, Agent 5 only when security-sensitive files are changed
- **Agent 4 consumer search**: Use Grep tool to find importers, not
  exhaustive file reading. Search → read matched files only.
