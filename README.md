# Startale Front-End Team Claude Config

Shared Claude Code configuration for Startale front-end projects, distributed as a **git subtree**.

## Table of contents

- [How it works](#how-it-works)
  - [The tier system](#the-tier-system)
  - [Available projects](#available-projects)
  - [Naming conventions](#naming-conventions)
  - [Repo structure](#repo-structure)
- [Setup](#setup)
  - [Step 1: Add the subtree](#step-1-add-the-subtree)
  - [Step 2: Set up git aliases](#step-2-set-up-git-aliases-recommended)
  - [Step 3: Add to .gitignore](#step-3-add-to-gitignore-optional)
- [Working with project files](#working-with-project-files)
- [Pulling updates](#pulling-updates)
- [Pushing changes back](#pushing-changes-back)
  - [How team files are shared](#how-team-files-are-shared)
  - [Branch naming convention](#branch-naming-convention)
  - [How to push](#how-to-push)
  - [Merge direction](#merge-direction)
- [What's included](#whats-included)
  - [Rules](#rules)
  - [Commands](#commands)
  - [Hooks](#hooks)
  - [Design and UX (Impeccable)](#design-and-ux-impeccable)
  - [On agents](#on-agents)

---

## How it works

This repo's root contains the contents of a `.claude/` directory — rules, skills, commands, and hooks. Consumer projects pull it in as a **git subtree** with the prefix `.claude`, so the contents land directly in `.claude/` and Claude Code discovers the config automatically.

```
your-project/
├── .claude/                    # git subtree (this repo)
│   ├── rules/
│   ├── skills/
│   ├── commands/
│   ├── hooks/
│   ├── agents/
│   ├── .gitignore
│   └── README.md
└── src/                        # your project code
```

The subtree is fully committed in the consumer project's git history. You can pull updates from this repo and push changes back via PRs.

### The tier system

We use a naming convention to separate config by ownership and scope:

| Tier    | Managed in                     | File pattern     | Scope                              |
|---------|--------------------------------|------------------|------------------------------------|
| team    | subtree `master`               | `*.team.*`       | All projects across the team       |
| project | subtree `<project>` branches   | `*.project.*`    | Per-project config                 |
| local   | each engineer's machine        | `*.local.*`      | Per-engineer, never committed      |

Config is applied in order from broadest to most specific:

```
team → project → local
```

Later tiers can override or extend earlier ones.

### Available projects

Projects have dedicated branches that contain team config from `master` plus their own project-specific files:

- **`strium-apps`** — Strium homepage and DEX application
- **`superapp`** — Startale super app
- **`superapp-sdk`** — SDK documentation

Each project has a dedicated branch with the same name (e.g., `strium-apps`).

### Naming conventions

Use the tier marker as the middle segment: `name.<tier>.ext`

- Examples: `frontend.team.md`, `api.project.md`, `personal.local.md`
- Tier markers: `team`, `project`, `local`

### Repo structure

```
agents/                         # Specialized AI agent definitions
│   ├── build-error-resolver.team.md
│   ├── code-reviewer.team.md
│   ├── e2e-runner.team.md
│   ├── security-reviewer.team.md
│   ├── skill-builder.team.md
│   └── tdd-guide.team.md
commands/                       # Slash commands
│   ├── design-and-ux/          # UX review commands
│   ├── e2e-maintenance.team.md
│   ├── e2e.team.md
│   ├── fix-conflict-lock.yaml.team.md
│   └── tdd.team.md
hooks/
│   └── design-and-ux/          # UX-related hooks
rules/                          # Coding standards and guidelines
│   ├── design-and-ux/          # UX, a11y, motion, interaction rules
│   ├── coding-style.team.md
│   ├── react.team.md
│   ├── typescript.team.md
│   └── ...                     # (12 engineering rules total)
skills/                         # Interactive skill workflows
│   ├── achievements.team/
│   ├── creating-ui-components.team/
│   ├── debugging-with-chrome.team/
│   ├── prepr.team/
│   ├── team.team/
│   └── ...                     # (12 engineering + 18 design skills)
```

Files are organized by domain (e.g., `design-and-ux/`) within each folder. `*.team.*` files live on `master`, with `*.project.*` files added on project branches.

---

## Setup

### Step 1: Add the subtree

Choose the branch that matches your project:

| If your project is... | Use branch |
|----------------------|------------|
| Strium homepage or DEX | `strium-apps` |
| Startale super app | `superapp` |
| SDK documentation | `superapp-sdk` |
| None of the above / team-only | `master` |

```bash
# Add the remote (one-time)
git remote add claude-config https://github.com/StartaleGroup/claude-config-frontend.git

# Add the subtree (replace BRANCH with your project branch)
git subtree add --prefix=.claude claude-config strium-apps --squash
```

### Step 2: Set up git aliases (recommended)

Add these to your project's git config (replace `strium-apps` with your project branch):

```bash
# cc-pull: Pull latest shared config
git config alias.cc-pull 'subtree pull --prefix=.claude claude-config strium-apps --squash'

# cc-push: Push .claude/ changes to your project branch
git config alias.cc-push '!f() { git subtree push --prefix=.claude claude-config $1; }; f'
```

Then use:

```bash
# Pull latest config
git cc-pull

# Push changes back (always to a feature branch, then open a PR)
git cc-push from/my-project/description-of-change
```

**Team file promotion:** If your push includes `.team.*` file changes, a GitHub Action automatically opens a follow-up PR from `master` with those team files. Reviewers approve the promotion, and master syncs back to all project branches.

### Step 3: Add to .gitignore (optional)

The subtree is fully committed, so no `.gitignore` changes are strictly needed. However, you may want to ignore local config files:

```gitignore
# Local/personal Claude config (never committed)
.claude/*.local.*
.claude/**/*.local.*
settings.local.*
```

---

## Working with project files

Project files (`*.project.*`) live on project branches (e.g., `strium-apps`) and are tracked normally — no special `.gitignore` handling or `git add -f` needed.

### Creating project files

Use the `*.project.*` naming convention for files, and `*.project` suffix on directory names for skills:

```
.claude/
├── rules/
│   ├── react.team.md              # from shared config (don't edit directly)
│   ├── api.project.md             # project-specific API rules
│   └── tailwind.project.md        # project-specific Tailwind overrides
├── skills/
│   ├── achievements.team/         # team skill (from shared config)
│   │   └── SKILL.md
│   └── playwright-login.project/  # project-specific skill
│       └── SKILL.md
└── CLAUDE.project.md              # project-specific CLAUDE.md
```

**Skill naming convention:**

| Tier | Directory name | Example |
|------|---------------|---------|
| team | `skill-name.team/` | `skills/achievements.team/SKILL.md` |
| project | `skill-name.project/` | `skills/playwright-login.project/SKILL.md` |
| local | `skill-name.local/` | `skills/my-debug.local/SKILL.md` |

---

## Pulling updates

```bash
git cc-pull
# Or without alias:
git subtree pull --prefix=.claude claude-config strium-apps --squash
```

---

## Pushing changes back

Changes made to config files inside a consumer project can be pushed back to this repo. Always push to a **feature branch** and open a PR — never push directly to `master` or to a project branch.

### How team files are shared

When you push to your project branch with `cc-push`, both `.team.*` and `.project.*` changes land on that project branch. If your push includes `.team.*` file changes, a GitHub Action automatically opens a follow-up PR from master with those team files — reviewers approve the promotion, and master syncs back to all project branches.

You don't need to decide which branch to target. Just push to your project branch via `cc-push`, and CI handles the rest.

### Branch naming convention

```
from/<consumer-project>/<short-description>
```

Examples:
- `from/strium-apps/add-trading-rules` → PR to `strium-apps`
- `from/superapp/update-motion-tokens` → PR to `superapp`
- `from/superapp-sdk/fix-a11y-rule` → PR to `superapp-sdk`

### How to push

```bash
git cc-push from/my-project/add-api-rules
```

Then open a PR from `from/my-project/add-api-rules` → your project branch (e.g., `strium-apps`).

### Merge direction

Project branches (`strium-apps`, `superapp`, `superapp-sdk`) contain project-specific config alongside team config. Team files flow bidirectionally via CI automation:

```
master → project branches    ✅  (sync-to-projects.yml, automatic)
project branches → master    ✅  (promote-team-files.yml, .team.* files only)
```

When `.team.*` files are modified on a project branch, CI automatically creates a promotion PR to master. When master is updated, CI automatically merges it into all project branches. Engineers don't need to manage this manually.

---

## What's included

### Rules

#### Engineering rules

| Rule | Description |
|------|-------------|
| `coding-style.team.md` | Immutability, file organization, implicit return, error handling, comments |
| `react.team.md` | Component patterns, file structure, naming conventions |
| `react-hooks.team.md` | Custom hooks, WebSocket guard, dependency management |
| `state-management.team.md` | Zustand store patterns, selectors, subscriptions |
| `tanstack.team.md` | TanStack Router + Query patterns, SSR considerations |
| `typescript.team.md` | Type safety, Zod schemas, auto-generated files |
| `tailwind.team.md` | Shared Tailwind conventions (cn(), spacing, colors) |
| `security.team.md` | Environment variables, XSS prevention, data validation, logging |
| `web3.team.md` | Wallet interactions, chain operations, Polkadot.js |
| `testing.team.md` | Test coverage requirements, TDD workflow |
| `unit-test.team.md` | Vitest patterns, boundary testing, mock conventions |
| `e2e.team.md` | Playwright patterns, page objects, data-testid |
| `contributing.team.md` | Branch naming and merge direction rules |

#### Design and UX rules

| Rule | Description |
|------|-------------|
| `design-and-ux/ux.team.md` | UX patterns, component conventions, layout rules |
| `design-and-ux/a11y.team.md` | Accessibility — WCAG, ARIA, keyboard nav, focus |
| `design-and-ux/motion.team.md` | Animation, transitions, reduced-motion, performance |
| `design-and-ux/interaction.team.md` | States, touch targets, dialogs, optimistic UI |

### Agents

| Agent | Description |
|-------|-------------|
| `build-error-resolver.team.md` | Resolves build and TypeScript errors with minimal diffs |
| `code-reviewer.team.md` | Code quality and standards review |
| `e2e-runner.team.md` | E2E test generation and maintenance with Playwright |
| `security-reviewer.team.md` | Security vulnerability detection and remediation |
| `tdd-guide.team.md` | Test-driven development enforcement |
| `skill-builder.team.md` | Skill authoring and improvement |

### Commands

#### Engineering commands

| Command | Description |
|---------|-------------|
| `/e2e` | Generate and run E2E tests |
| `/e2e-maintenance` | Maintain and fix existing E2E tests |
| `/tdd` | Test-driven development workflow |
| `/fix-conflict-lock.yaml` | Resolve pnpm-lock.yaml merge conflicts |

#### Design and UX commands

| Command | Description |
|---------|-------------|
| `/review-ux` | Full review across all four UX rule groups |
| `/review-motion` | Motion-only review for animation/transition work |

### Skills

#### Engineering skills

| Skill | Description |
|-------|-------------|
| `/achievements.team` | Summarize branch changes |
| `/creating-ui-components.team` | React component creation guide |
| `/debugging-with-chrome.team` | Chrome browser UI debugging |
| `/inconsistency-scan.team` | Full codebase consistency scan |
| `/learn.team` | Extract reusable patterns |
| `/polish-styling.team` | Tailwind CSS cleanup |
| `/pr-summary.team` | PR summary generation |
| `/prepr.team` | Pre-PR quality check with parallel agents |
| `/reflect.team` | Review mistakes, update rules |
| `/side-effect.team` | Side effect analysis |
| `/team.team` | Role-based task delivery with specialized agents |
| `/todo.team` | Todo-driven task tracking |

#### Design and UX skills (Impeccable)

### Hooks

| Hook | Trigger | Description |
|------|---------|-------------|
| `pre-commit-ux-prompt` | pre-commit | Prompts engineer to run `/review-ux` when UI files are staged |

Fires when staged files include `*.tsx`, `*.css`, or `*.module.css`. Does not block — responds to `n` or timeout by allowing the commit to proceed.

### Design and UX (Impeccable)

The `design-and-ux/` domain provides frontend quality tooling built on [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus.

**Why Impeccable?** Without guidance, AI coding assistants produce generic output — Inter font, purple-to-blue gradients, cards nested inside cards, gray text on colored backgrounds. Impeccable is an open-source Claude Code skill set (Apache 2.0) that breaks these defaults with negative constraints, domain-specific reference docs, and targeted slash commands.

| Skill | Description |
|-------|-------------|
| `/frontend-design` | Hub skill — design principles and anti-patterns referenced by other skills |
| `/audit` | Comprehensive quality audit (a11y, performance, theming, responsive) |
| `/critique` | UX review with actionable feedback |
| `/polish` | Final pre-ship quality pass |
| `/normalize` | Align with design system standards |
| `/colorize` | Color palette and theming |
| `/typeset` | Typography improvements |
| `/arrange` | Layout and spatial design |
| `/animate` | Motion and transitions |
| `/bolder` | Increase visual impact |
| `/quieter` | Reduce visual noise |
| `/delight` | Add personality and moments of joy |
| `/overdrive` | Maximum creative expression |
| `/clarify` | Improve comprehension and scannability |
| `/distill` | Simplify and reduce complexity |
| `/extract` | Pull reusable components |
| `/adapt` | Responsive and cross-platform adaptations |
| `/harden` | Edge cases, error states, defensive design |
| `/onboard` | First-run and onboarding flows |
| `/optimize` | Performance optimization |
| `/teach-impeccable` | One-time setup — gathers project design context |

Skills reference each other — `/audit` suggests follow-ups like `/normalize` or `/optimize`. Run `/teach-impeccable` once per project to capture brand, audience, and aesthetic direction in `.impeccable.md`.

### On design-and-ux agents

The current design-and-ux commands are self-contained. If review logic grows complex enough to warrant separation, the recommended upgrade path is:

- `@a11y-agent` — dedicated accessibility reviewer
- `@motion-agent` — dedicated motion reviewer

Promote to agents when you find yourself duplicating review logic across multiple commands.
