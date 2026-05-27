# Design-Dev Tools

Install and configure design-development tools for visual feedback, UI tweaking, and developer experience.

## Available Tools

| Tool | Purpose | Install |
|------|---------|---------|
| [Agentation](#agentation) | Visual UI annotation & feedback in browser | `npm install agentation -D` |
| [DialKit](#dialkit) | Floating control panel for tweaking values | `npm install dialkit motion` |

---

## Agentation

Visual feedback tool for AI coding agents. Annotate and comment on your UI directly in the browser during development.

**Website:** https://www.agentation.com

### Installation

```bash
npm install agentation -D
```

### Setup

Add to your app root (development only):

```tsx
import { Agentation } from "agentation"

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <Agentation />}
    </>
  )
}
```

### Optional: MCP Integration

For agent syncing, add the MCP server:

```bash
npx add-mcp "npx -y agentation-mcp server"
npx agentation-mcp doctor
```

Then configure the endpoint:

```tsx
<Agentation endpoint="http://localhost:4747" />
```

### Key Points
- React 18+ required
- Desktop only (currently)
- Zero external data collection
- Local-first, syncs when available

---

## DialKit

Floating control panel for React with auto-detected controls: sliders, toggles, color pickers, spring editors, and more.

**Website:** https://joshpuckett.me/dialkit

### Installation

```bash
npm install dialkit motion
```

### Setup

Add to your root layout as a sibling (not wrapper):

```tsx
import { DialRoot } from "dialkit"
import "dialkit/styles.css"

export default function Layout({ children }) {
  return (
    <>
      {children}
      <DialRoot />
    </>
  )
}
```

### Usage

Use the `useDialKit` hook to create control panels:

```tsx
import { useDialKit } from "dialkit"

function MyComponent() {
  const config = useDialKit("Panel Name", {
    opacity: [1, 0, 1, 0.1],      // slider: [default, min, max, step]
    enabled: true,                 // toggle
    color: "#ff0000",              // color picker
    label: "Hello",                // text input
  })

  return <div style={{ opacity: config.opacity }}>...</div>
}
```

### Control Types
- **Sliders** - `[default, min, max, step?]` or plain numbers
- **Toggles** - Boolean values
- **Color pickers** - Hex color strings
- **Text inputs** - Non-hex strings
- **Select dropdowns** - Named options
- **Spring editors** - Visual curve editors
- **Action buttons** - Triggerable callbacks
- **Folders** - Nested collapsible groups

### Key Points
- React + Motion library required
- Fully typed with TypeScript
- JSON export for saving configs
- Built-in presets support
