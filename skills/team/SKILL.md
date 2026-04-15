---
name: team
description: Create agent teams for efficient, high-quality task delivery. Spawns specialized teammates (UX, Architecture, Web Researcher, Devil's Advocate, Security, Performance, Code Reviewer, QA) to collaboratively deliver features with precision and quality.
---

# Team

Create agent teams to efficiently deliver high-quality code for complex tasks.

> **Goal**: Spawn teammates with diverse perspectives to maximize precision, quality, and efficiency through parallel collaboration.

## Usage

```
/team [workflow-type] [task-description]
```

This skill generates the proper prompt to **create an agent team** with the specified teammates.

---

## Workflow Types

### full

Create an agent team with all perspectives for comprehensive analysis:

```
Create an agent team to work on [task]. Spawn these teammates:
- One on UX (user flows, E2E test scenarios, accessibility)
- One on technical architecture (code patterns, API/docs references)
- One on web research (external solutions, best practices)
- One playing devil's advocate (challenge assumptions, find edge cases)
- One on security (OWASP, wallet security, input validation)
- One on performance (bundle size, render optimization)
- One on code review (standards compliance, quality)
- One on QA (verify in browser using Chrome/Playwright)

Have them explore the problem from their perspectives, share findings,
challenge each other's conclusions, and synthesize into prioritized recommendations.
QA should verify the feature works in the actual browser after implementation.
```

### quick

Fast team for smaller tasks:

```
Create an agent team to work on [task]. Spawn:
- One on architecture
- One on UX
- One playing devil's advocate
- One on code review

Have them analyze and report findings quickly.
```

### security-focused

Security-heavy team for sensitive features:

```
Create an agent team to work on [task]. Spawn:
- One on architecture
- One on security (focus on wallet/key handling, OWASP)
- One playing devil's advocate (find security edge cases)
- One on code review

Require plan approval before any implementation.
Have the security teammate challenge all assumptions about trust boundaries.
```

### ux-focused

UX-heavy team for user-facing features:

```
Create an agent team to work on [task]. Spawn:
- One on web research (similar UX patterns in other apps)
- One on UX (user flows, accessibility, E2E scenarios)
- One playing devil's advocate
- One on QA (verify UI in browser, test user flows)

Have the UX teammate create detailed user flow documentation.
QA should verify each flow works in the browser.
```

---

## Implementation Pipelines

After analysis, use these sequential pipelines for implementation:

### feature

```
Create an agent team to implement [feature]. Spawn:
- One planner (create implementation plan)
- One TDD guide (write tests first, then implement)
- One code reviewer (quality check)
- One security reviewer (final security audit)
- One QA (verify feature in browser after implementation)

Execute sequentially: planner → TDD → code review → security → QA.
Require plan approval before TDD begins implementation.
```

### bugfix

```
Create an agent team to fix [bug]. Spawn:
- One explorer (investigate root cause)
- One TDD guide (write regression test, then fix)
- One code reviewer

Have explorer share findings before TDD begins.
```

### refactor

```
Create an agent team to refactor [component]. Spawn:
- One architect (design target structure)
- One code reviewer (ensure safe changes)
- One TDD guide (maintain test coverage)

Require plan approval from architect before changes begin.
```

---

## Model Selection

Assign models based on task complexity to optimize cost and performance:

| Model | Roles | Rationale |
|-------|-------|-----------|
| **Opus** | Architecture, Security, Devil's Advocate, Synthesizer, UX, TDD Guide, E2E Engineer | Deep reasoning, critical analysis, test quality |
| **Sonnet** | Code Reviewer, Planner, Web Researcher, QA | Code generation, research, verification |
| **Haiku** | Performance | Lightweight metrics analysis |

**Example with model specification:**
```
Create an agent team to work on [task]. Spawn:
- One on architecture (use Opus)
- One on security (use Opus)
- One on web research (use Sonnet)
- One on code review (use Sonnet)
```

---

## Teammate Roles

### 1. Web Researcher

**Focus**: External solutions, best practices, library recommendations

**Model**: Sonnet (research and analysis)

**Spawn prompt**:
```
Review external solutions for [task]. Search open source projects,
identify best practices, recommend libraries with pros/cons.
Report findings to the team.
```

### 2. Architecture

**Focus**: Technical design, code organization, documentation references

**Model**: Opus (deep architectural reasoning)

**Spawn prompt**:
```
Analyze the codebase for [task]. Review project documentation and API specs.
Identify patterns, dependencies, and technical risks.
Challenge web researcher's library recommendations.
```

### 3. UX

**Focus**: User experience, accessibility, E2E test scenarios

**Model**: Opus (deep UX reasoning and user flow analysis)

**Spawn prompt**:
```
Design user flows for [task]. Include:
- Happy path steps
- Error states and edge cases
- Accessibility requirements (WCAG)
- E2E test scenarios

Share flows with devil's advocate for challenge.
```

### 4. Devil's Advocate

**Focus**: Challenge assumptions, find edge cases, surface issues

**Model**: Opus (critical analysis and hypothesis testing)

**Spawn prompt**:
```
Challenge all assumptions about [task]. Your job is to:
- Question every design decision
- Find edge cases others missed
- Surface potential failure modes
- Propose alternative approaches

Be adversarial but constructive. Disprove weak ideas.
```

### 5. Security

**Focus**: OWASP, input validation, wallet security

**Model**: Opus (security is non-negotiable, needs deepest reasoning)

**Spawn prompt**:
```
Security audit for [task]. Check:
- OWASP Top 10 vulnerabilities
- Input validation gaps
- Auth/authz weaknesses
- Wallet/key handling (if applicable for crypto/Web3 features)

Challenge architecture teammate on trust boundaries.
```

### 6. Performance

**Focus**: Bundle size, render performance, network optimization

**Model**: Haiku (metrics analysis, lightweight profiling)

**Spawn prompt**:
```
Performance analysis for [task]. Evaluate:
- Bundle size impact
- Render performance (React re-renders)
- Network efficiency (API calls, WebSocket)
- Optimization opportunities

Share concerns with architecture teammate.
```

### 7. Synthesizer (Team Lead Role)

**Focus**: Consolidate findings, resolve conflicts, prioritize actions

**Model**: Opus (complex synthesis across multiple perspectives)

The team lead typically handles synthesis, but can spawn a dedicated synthesizer:

**Spawn prompt**:
```
Synthesize all teammate findings. Create:
- Executive summary
- Consensus points
- Conflict resolutions
- Prioritized action items (P0/P1/P2)
- Final recommendation: PROCEED / CAUTION / REVISE / REJECT
```

### 8. Code Reviewer

**Focus**: Code quality, standards compliance

**Model**: Sonnet (code analysis and quality checks)

**Agent**: Uses `code-reviewer` agent (`.claude/agents/code-reviewer.md`)

**Spawn prompt**:
```
Review code changes for [task]. Check:
- TypeScript strict compliance
- Biome linting
- Tailwind patterns
- Test coverage (80%+ required)

Report issues by severity with specific fixes.
```

### 9. QA (Quality Assurance)

**Focus**: Feature and UI verification using browser automation

**Model**: Sonnet (verification and browser automation)

**Tools**: Chrome DevTools MCP or Playwright

**Spawn prompt**:
```
Verify [feature] in the browser using Chrome DevTools or Playwright.

Verification checklist:
- Login and navigate to the feature
- Test happy path user flows
- Test error states and edge cases
- Verify responsive layout (desktop/mobile)
- Check console for errors
- Take screenshots of key states
- Report any visual or functional issues

Share findings with UX teammate for comparison with design specs.
```

### 10. E2E Engineer

**Focus**: E2E test implementation, fixes, and maintenance

**Model**: Opus (high-quality test design and implementation)

**Approach**: Use TDD (write tests first) for new features or complex changes.
For small fixes or improvements, skip TDD and implement directly.

**Spawn prompt**:
```
Implement or fix E2E tests for [feature].

Guidelines:
- Page Object Model pattern (e2e/page-objects/)
- Use data-testid selectors (never CSS classes or DOM structure)
- Timeout constants from e2e/lib/constants.ts
- Never use waitForTimeout (use proper assertions with expect.poll)
- Deadline pattern for timeout tracking

Decide whether to use TDD based on scope:
- New features or complex changes: Write failing test first (RED → GREEN → REFACTOR)
- Small fixes or improvements: Implement directly

Coordinate with UX teammate for test scenarios.
Share test coverage gaps with Code Reviewer teammate.
```

---

## Best Practices

### Give Teammates Enough Context

Include task-specific details in spawn prompts:

```
Spawn a security reviewer teammate with the prompt: "Review the
feature module at src/components/feature/ for security vulnerabilities.
Focus on balance calculations, input validation, and transaction signing."
```

### Size Tasks Appropriately

- **Too small**: Coordination overhead exceeds benefit
- **Too large**: Teammates work too long without check-ins
- **Just right**: Self-contained units with clear deliverables

**Tip**: Aim for 5-6 tasks per teammate to keep everyone productive.

### Require Plan Approval for Risky Work

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

### Avoid File Conflicts

Break work so each teammate owns different files:

```
Spawn teammates with clear file ownership:
- Frontend teammate: src/components/feature/
- Backend teammate: src/lib/api/
- Test teammate: e2e/specs/feature/
```

### Monitor and Steer

Use `Shift+Down` to cycle through teammates in in-process mode.
Check progress regularly and redirect approaches that aren't working.

### Wait for Teammates to Finish

If the lead starts implementing instead of waiting:

```
Wait for your teammates to complete their tasks before proceeding.
```

### Start with Research Before Implementation

For new agent team users, start with tasks that don't require writing code:
- Reviewing a PR
- Researching a library
- Investigating a bug

---

## Example Prompts

### New Feature (Full Team)

```
Create an agent team to design a new feature.
Spawn these teammates:
- One on UX (user flow, confirmation dialogs)
- One on technical architecture (check docs, API integration)
- One on web research (how other apps handle this)
- One playing devil's advocate (what could go wrong?)
- One on security (transaction signing, input validation)
- One on performance (real-time updates, WebSocket efficiency)

Have them explore from their perspectives and challenge each other.
The devil's advocate should try to disprove each teammate's conclusions.
Synthesize findings into a prioritized implementation plan.
```

### Bug Investigation (Competing Hypotheses)

```
Users report stale data after network reconnection.
Create an agent team to investigate with different hypotheses:
- Teammate 1: WebSocket reconnection logic
- Teammate 2: State management (Zustand store not resetting)
- Teammate 3: React rendering (stale closure issue)
- Teammate 4: API response caching

Have them talk to each other to try to disprove each other's theories,
like a scientific debate. Converge on the actual root cause.
```

### Parallel Code Review

```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage

Have them each review independently and report findings.
```

---

## Arguments

$ARGUMENTS:

**Analysis Workflows (parallel teammates):**
- `full <description>` - All teammates, comprehensive analysis
- `quick <description>` - Core teammates, fast analysis
- `security-focused <description>` - Security-heavy team
- `ux-focused <description>` - UX-heavy with E2E scenarios
- `custom "<teammates>" <description>` - Custom teammate selection

**Implementation Pipelines (sequential with plan approval):**
- `feature <description>` - planner → tdd → code-reviewer → security
- `bugfix <description>` - explorer → tdd → code-reviewer
- `refactor <description>` - architecture → code-reviewer → tdd

---

## Integration with Other Skills

After team analysis:
- **Plan mode** (built-in) - Detailed implementation plan
- `/tdd` - Test-driven implementation
- `/e2e` - Generate E2E tests from UX scenarios
- `/code-review` - Final quality check

---

## Guidelines for Teammate Inclusion

### Always Include Security Teammate When:
- Handling private keys or wallets
- Processing transactions
- Modifying critical business logic
- Changing authentication flows

### Always Include Performance Teammate When:
- Modifying data-heavy components (charts, tables, lists)
- Adding real-time WebSocket subscriptions
- Changing data fetching patterns

### Always Include UX Teammate When:
- Adding new user interactions
- Modifying core user flows
- Changing responsive layouts

### Always Include QA Teammate When:
- Implementing user-facing features
- Changing critical workflows
- Modifying authentication or wallet flows
- After any significant UI changes

---

## Team Cleanup

When finished, ask the lead to clean up:

```
Clean up the team
```

This removes shared team resources. Shut down all teammates first.

---

## Limitations

- **Experimental**: Agent teams may have session resumption issues
- **No nested teams**: Teammates cannot spawn their own teams
- **Split panes**: Require tmux or iTerm2 (not VS Code terminal)
- **Token cost**: Higher than single session (each teammate is separate instance)

---

## Tips

1. **"Create an agent team"** - Use this exact phrase to trigger team creation
2. **Start with research** - Research and review tasks before implementation
3. **Devil's Advocate is invaluable** - Always include for complex tasks
4. **Require plan approval** - For risky or architectural changes
5. **Monitor progress** - Use Shift+Down to check on teammates
6. **5-6 tasks per teammate** - Optimal task sizing
7. **Avoid file conflicts** - Clear file ownership per teammate
