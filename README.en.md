# Snap

[한국어](./README.md)

A Chrome extension that lets you freely drag webpage elements to explore layouts with magnetic grid snapping.

## Features

### Element Drag + Grid Snap
Drag any element on a page and it magnetically snaps to the auto-detected grid.

- **Mouse drag**: Grab and move elements — auto-snaps to column edges and baselines
- **Click select + arrow keys**: Click an element, then nudge with arrow keys (1px per press, `Shift` + arrow for 10px)
- **Snap guide lines**: Pink guide lines appear when snapping, showing alignment positions
- **Grid overlay**: Auto-detects and displays the page's column grid + baseline grid
- **Manual override**: Adjust columns, gutter, margin, baseline directly from the Side Panel
- `Esc` to reset all changes

### Performance

- **No layout thrashing**: Element dimensions are cached at drag start — no per-frame layout recalculation
- **Snap calculation caching**: Column edges are cached by grid key — no redundant array allocation during drag
- **Two-pass container detection**: Checks `body > *` first, only falls through to grandchildren when needed
- **rAF batching**: Drag position updates are batched via requestAnimationFrame

## Tech Stack

| | |
|---|---|
| Extension | Chrome Manifest V3, Side Panel API |
| Language | TypeScript (strict) |
| Build | Vite + @crxjs/vite-plugin |
| UI | Preact |
| Test | Vitest + jsdom (105 tests) |

## Getting Started

```bash
# Install dependencies
npm install

# Dev server (HMR)
npm run dev

# Production build
npm run build

# Run tests
npm test
```

### Load in Chrome

1. Run `npm run build` to generate the `dist/` folder
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder
5. Click the extension icon → toggle features in the Side Panel

## Project Structure

```
src/
├── background/              # Service Worker (message relay)
├── content/
│   ├── modules/
│   │   ├── element-drag.ts  # Orchestrator (Grid + Drag + Selection)
│   │   └── drag/
│   │       ├── drag-core.ts       # Mouse drag + magnetic snap
│   │       ├── grid-renderer.ts   # Column grid auto-detection + rendering
│   │       ├── snap-engine.ts     # Column/baseline snap calculation (cached)
│   │       ├── snap-guides.ts     # Snap guide line display
│   │       └── selection-state.ts # Click selection + keyboard nudge
│   ├── overlay-host.ts      # Shadow DOM isolated overlay
│   └── index.ts             # Content Script entry point
├── sidepanel/               # Side Panel UI (Preact)
│   ├── components/
│   └── styles/
└── shared/                  # Shared types, messages, error handling
tests/
└── unit/                    # Unit tests (105 tests)
```

## Architecture

```
  Side Panel (Preact)     Service Worker      Content Script
  ┌─────────────┐       ┌──────────────┐    ┌──────────────┐
  │ App.tsx      │       │ service-     │    │ index.ts     │
  │ ├─Toggle     │◄─────►│ worker.ts    │◄──►│ ├─element-   │
  │ └─GridConfig │       │ (relay)      │    │ │  drag.ts   │
  └─────────────┘       └──────────────┘    │ ├─drag-core  │
                                             │ ├─snap-engine│
         chrome.runtime.sendMessage          │ ├─grid-render│
         ◄─────────────────────────────►     │ ├─snap-guides│
                                             │ ├─selection  │
                                             │ └─overlay-   │
                                             │   host.ts    │
                                             └──────────────┘
```

### Magnetic Snap Algorithm

The snap engine uses a Figma-inspired magnetic field with hysteresis:

- **Entering**: 20px magnetic zone pulls elements toward snap points with quadratic easing
- **Leaving**: 26px breakaway zone prevents jittery escapes
- **Lock zone**: 2px dead zone for full snap commitment
- **Adaptive zones**: Scale with grid gutter size to prevent over-snapping on tight grids

```
  State machine:

    IDLE ──mousedown──▶ PENDING ──threshold──▶ DRAGGING ──mouseup──▶ IDLE
     │                    │                       │
     │                    └──mouseup──▶ IDLE      └──Esc──▶ IDLE (revert)
     └──Esc──▶ IDLE (resetAll)
```

## License

MIT
