# Debugging Scenarios

Common debugging patterns for frontend applications.

---

## Scenario 1: Component Not Rendering

### Symptoms
- Expected component missing from page
- Blank area where component should be

### Investigation

```
1. read_page()                    # Check if element exists in DOM
2. read_console_messages(pattern: "error")  # Check for errors
```

### Common Causes

| Cause | Solution |
|-------|----------|
| Import error | Check import path, file exists |
| Conditional render `false` | Check condition logic |
| Data not loaded | Check if data fetch completed |
| Parent hiding children | Check parent visibility/overflow |

### Example Flow

```
tabs_context_mcp(createIfEmpty: true)
navigate(url: "localhost:<dev-server-port>/")
computer(action: "screenshot")
find(query: "target component")        # Not found?
read_console_messages(pattern: "error|undefined")
# Found: "Cannot read property 'id' of undefined"
# → Data not loaded, check useQuery hook
```

---

## Scenario 2: Click Not Working

### Symptoms
- Button click does nothing
- Form submission doesn't trigger

### Investigation

```
1. find(query: "submit button")
2. read_page(ref_id: "ref_1", depth: 2)    # Check element props
3. javascript_tool(text: "document.querySelector('button').disabled")
```

### Common Causes

| Cause | Solution |
|-------|----------|
| Element disabled | Check `disabled` prop condition |
| Wrong element clicked | Verify coordinates/ref |
| Handler not attached | Check `onClick` binding |
| Event propagation blocked | Check `e.stopPropagation()` |
| Overlay blocking | Check z-index, backdrop |

### Example Flow

```
find(query: "submit button")
# Found: ref_1
read_page(ref_id: "ref_1")
# Shows: disabled="true"
# → Check form validation, canSubmit state
```

---

## Scenario 3: API Request Failing

### Symptoms
- Data not loading
- Error message displayed
- Infinite loading state

### Investigation

```
1. read_network_requests(urlPattern: "/api/")
2. read_console_messages(pattern: "fetch|network|error")
```

### Common Causes

| Cause | Solution |
|-------|----------|
| 401 Unauthorized | Check auth token |
| 404 Not Found | Check endpoint URL |
| 500 Server Error | Check backend logs |
| CORS error | Check server CORS config |
| Network timeout | Check server running |

### Example Flow

```
read_network_requests(urlPattern: "/api/")
# Shows: status 401, "Unauthorized"
# → Check auth state, token refresh
```

---

## Scenario 4: Styling/Layout Issues

### Symptoms
- Element positioned incorrectly
- Overflow/clipping issues
- Wrong colors/sizes

### Investigation

```
1. computer(action: "screenshot")
2. computer(action: "zoom", region: [x1, y1, x2, y2])  # Zoom to area
3. javascript_tool(text: "getComputedStyle(element)")
```

### Common Causes

| Cause | Solution |
|-------|----------|
| Missing class | Check `cn()` conditions |
| Class conflict | Check Tailwind merge order |
| Parent constraint | Check parent flex/grid |
| z-index stacking | Check z-index values |
| Mobile viewport | Use `dvh` instead of `vh` |

### Example Flow

```
computer(action: "screenshot")
# Sidebar overlapping content
computer(action: "zoom", region: [0, 0, 300, 600])
# z-index issue visible
# → Check sidebar z-index, add z-10
```

---

## Scenario 5: Form Validation Not Working

### Symptoms
- Invalid input accepted
- Error messages not showing
- Submit enabled when should be disabled

### Investigation

```
1. form_input(ref: "ref_1", value: "invalid")
2. computer(action: "screenshot")
3. read_console_messages(pattern: "validation|zod")
```

### Common Causes

| Cause | Solution |
|-------|----------|
| Schema not applied | Check `validators.onChange` |
| Error not displayed | Check field.state.meta.errors |
| Stale validation | Check dependency array |
| Wrong schema | Check Zod schema logic |

---

## Scenario 6: State Not Updating

### Symptoms
- UI doesn't reflect changes
- Stale data displayed
- Actions have no visible effect

### Investigation

```
1. read_console_messages(pattern: "state|store")
```

### Common Causes

| Cause | Solution |
|-------|----------|
| Missing selector | Use `store((s) => s.value)` |
| Stale closure | Check useCallback deps |
| Immutability issue | Don't mutate state directly |
| Wrong store | Check import path |

---

## Quick Troubleshooting Commands

### General Health Check

```
read_console_messages(onlyErrors: true, limit: 10)
read_network_requests(limit: 10)
computer(action: "screenshot")
```

### Clear and Retry

```
read_console_messages(clear: true)
read_network_requests(clear: true)
navigate(url: "back")
navigate(url: "forward")
```

### Capture Evidence

```
computer(action: "screenshot")
# Or for specific area:
computer(action: "zoom", region: [x1, y1, x2, y2])
```
