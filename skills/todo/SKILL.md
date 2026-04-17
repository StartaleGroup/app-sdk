---
name: todo
description: Todo-driven development for long-running AI tasks. Externalizes task state to todo.md to prevent AI goal drift. Use /todo init to create a structured task plan, /todo check for mid-task progress checkpoints, /todo score for final weighted scoring, /todo clear to archive and reset.
---

# /todo — Todo-Driven Development

External whiteboard for long-running tasks. Prevents AI goal drift by writing task state to disk instead of relying on context memory.

## Auto-Invoke Criteria

Automatically invoke `/todo init` when ALL of the following are true:
- Task involves **3+ files** or **new feature implementation**
- Task is estimated to require **multiple logical steps** (not a one-shot fix)
- No `todo.md` already exists in the project root

Do NOT auto-invoke for:
- Single-file bug fixes or small edits
- Code review, linting, or formatting tasks
- Questions, research, or exploration requests

Inspired by Manus AI's approach: complex problems get lost when thinking only in your head. Write them down.

## Mode Detection

Parse the argument after `/todo`:

| Argument | Condition | Mode |
|----------|-----------|------|
| `init` | — | Init Mode |
| (none) | `todo.md` does not exist | Init Mode |
| `check` | — | Check Mode |
| (none) | `todo.md` exists | Check Mode |
| `score` | — | Score Mode |
| `clear` | — | Clear Mode |

The todo file lives at `./todo.md` (project root). Add to `.gitignore` if not already there.

---

## Mode 1: Init

Create a structured `todo.md` from the user's task description.

### Steps

1. Parse requirements: extract concrete deliverables from the user's request
2. Break down into atomic todos: each todo must be independently verifiable
3. Assign priority: HIGH (must-do), MEDIUM (should-do), LOW (nice-to-have)
4. Define acceptance criteria: each todo gets a one-line verification method
5. Write `todo.md` using the format below
6. Show the generated todos to the user and confirm before starting work

### todo.md Format

```markdown
# Task: [concise task name]
Created: [ISO timestamp]

## Spec
[1-3 sentence summary of what the user wants — never modify after init]

## Todos

### HIGH Priority
- [ ] Todo item description
  - Verify: [how to verify this is done]
- [ ] Another todo
  - Verify: [verification method]

### MEDIUM Priority
- [ ] Todo item
  - Verify: [verification method]

### LOW Priority
- [ ] Todo item
  - Verify: [verification method]

## Progress Log
| Time | Action | Todos Completed |
|------|--------|-----------------|
| [init time] | Created todo.md | 0/N |
```

### Init Rules

- Each todo must be **atomic** — one clear thing to do, not a vague goal
- Each todo must be **verifiable** — concrete check (e.g., "type-check passes", "component renders X", "file exists at Y")
- HIGH = minimum viable deliverable, MEDIUM = complete feature, LOW = polish/extras
- Aim for 5-15 todos. More items means the task should be split into phases
- Add `todo.md` to `.gitignore` if not already present

---

## Mode 2: Check

Mid-task checkpoint. Read `todo.md` from disk, update progress, re-orient.

### Steps

1. Read `./todo.md` from disk — never rely on memory
2. For each unchecked `[ ]` item: run the verification method if feasible
   - Passes → mark `[x]`
   - Partial → keep `[ ]`, append a short note inline
3. Add a row to the Progress Log: timestamp, action summary, completed/total count
4. Display status summary: `X/N todos complete (Y%)`
5. Re-orient: state the next HIGH priority `[ ]` item to work on next

### Check Rules

- Do NOT modify Spec or todo descriptions — only check/uncheck and log
- If a todo seems wrong, flag it inline but do not delete
- If new required work is discovered, add under a `## Discovered` section at the bottom
- Always re-read `todo.md` from disk before updating

---

## Mode 3: Score

Final evaluation after task completion.

### Steps

1. Read `./todo.md` from disk
2. Verify every todo item by running its verification method
3. Score each item:
   - **100%** — fully done, verification passes
   - **80%** — minor gap or caveat, mostly complete
   - **50%** — partial, meaningful work done but incomplete
   - **0%** — not done or verification fails
4. Calculate weighted total: HIGH = 3x, MEDIUM = 2x, LOW = 1x
5. Append the score report to `todo.md` under `## Score Report`

### Score Report Format

```markdown
## Score Report
Scored: [ISO timestamp]

| Priority | Item | Status | Score | Note |
|----------|------|--------|-------|------|
| HIGH     | ... | done   | 100%  | — |
| HIGH     | ... | partial | 50%  | Missing X |
| MEDIUM   | ... | done   | 100%  | — |
| LOW      | ... | skipped | 0%  | Out of scope |

**Score: XX / 100 — PASS / FAIL** (pass line: 90)

### Follow-up Required
- [ ] [Any unfinished HIGH items with recommended next steps]
```

### Score Rules

- **Pass line: 90 / 100** — below 90 is FAIL
- Be honest — do not inflate scores
- 0% is valid for intentionally skipped items (note WHY)
- Note the reason when items are incomplete
- Suggest follow-up actions for all unfinished HIGH items

---

## Mode 4: Clear

Archive current `todo.md` and start fresh.

### Steps

1. Check if `./todo.md` exists
2. If it exists, move to `./report/todo-[unix-timestamp].md` (create `report/` if needed)
3. Confirm the archive path to the user
4. If `todo.md` does not exist, inform user there is nothing to clear

---

## Integration Notes

When `todo.md` exists, the agent should:
- Run `/todo check` after each logical phase of work
- Re-read `todo.md` from disk before starting new sub-tasks
- Run `/todo score` when the user says the task is complete

---

## Critical Rules

- NEVER delete or modify the `## Spec` section after init
- NEVER inflate scores — honest assessment only
- ALWAYS read `todo.md` from disk, never rely on context memory
- ALWAYS show the user the generated todos before starting work (init mode)
- todo.md lives at project root — verify `.gitignore` includes it
