---
name: debugging-with-chrome
description: Debug UI issues using Chrome browser automation. Use when investigating visual bugs, console errors, network failures, or unexpected component behavior. Requires --chrome flag.
disable-model-invocation: true
---

# Debugging with Chrome

Workflow for debugging UI issues using Chrome MCP tools.

> **Requires**: Launch Claude Code with `--chrome` flag

## When to Use Chrome Debugging

| Symptom | Use Chrome? | Alternative |
|---------|-------------|-------------|
| Visual bug (layout, styling) | Yes | - |
| Console errors | Yes | - |
| Network request failures | Yes | - |
| Component not rendering | Yes | Check imports first |
| Type errors | No | `pnpm type-check` |
| Lint errors | No | `pnpm biome:fix` |
| Build failures | No | Check error output |

---

## Workflow Overview

```
1. Setup → 2. Reproduce → 3. Investigate → 4. Fix → 5. Verify
```

---

## Step 1: Setup

### Ensure Dev Server Running

```bash
lsof -i :<dev-server-port>    # Check if running
pnpm dev                       # Start if needed
```

### Get Browser Context

```
tabs_context_mcp(createIfEmpty: true)
```

If no MCP tab group exists, this creates one.

### Create/Navigate to Tab

```
tabs_create_mcp()                              # Create new tab
navigate(url: "localhost:<dev-server-port>/...")  # Navigate to page
```

---

## Step 2: Reproduce the Issue

### Capture Initial State

```
computer(action: "screenshot")
```

### Navigate to Problem Area

Use these tools to locate the issue:

| Tool | When to Use |
|------|-------------|
| `find(query: "...")` | Find element by description |
| `read_page()` | Get full page structure |
| `read_page(filter: "interactive")` | Get clickable elements only |

### Trigger the Issue

```
computer(action: "left_click", coordinate: [x, y])
form_input(ref: "ref_1", value: "test")
```

---

## Step 3: Investigate

### Check Console Errors

```
read_console_messages(pattern: "error|Error|ERROR")
```

Common patterns:
- `"error"` - General errors
- `"TypeError"` - Type-related errors
- `"undefined"` - Undefined access errors
- `"network"` - Network errors

### Check Network Requests

```
read_network_requests(urlPattern: "/api/")
```

Look for:
- Failed requests (4xx, 5xx status)
- Missing requests (expected but not made)
- Incorrect request payloads

### Inspect Element State

```
read_page(ref_id: "ref_1", depth: 3)   # Specific element
javascript_tool(text: "document.querySelector('...')")
```

---

## Step 4: Fix

Based on investigation:

| Finding | Action |
|---------|--------|
| Console error | Fix the code causing error |
| Network failure | Check API endpoint, auth |
| Missing element | Check conditional rendering |
| Wrong styling | Fix CSS/Tailwind classes |

---

## Step 5: Verify Fix

### Clear Previous State

```
read_console_messages(clear: true)
read_network_requests(clear: true)
```

### Re-test

```
navigate(url: "back")                              # Go back
navigate(url: "localhost:<dev-server-port>/...")    # Reload
computer(action: "screenshot")                     # Capture result
```

### Confirm

- [ ] Issue no longer reproduces
- [ ] No new console errors
- [ ] Network requests succeed
- [ ] Visual appearance correct

---

## Quick Reference

### Chrome MCP Tools

| Tool | Purpose |
|------|---------|
| `tabs_context_mcp` | Get/create browser context |
| `tabs_create_mcp` | Create new tab |
| `navigate` | Go to URL or back/forward |
| `computer(screenshot)` | Capture current state |
| `find` | Find elements by description |
| `read_page` | Get page structure |
| `read_console_messages` | Get console output |
| `read_network_requests` | Get network activity |
| `javascript_tool` | Execute JS in page |
| `form_input` | Set input values |

### More Resources

- [PATTERNS.md](./PATTERNS.md) - Common debugging scenarios
