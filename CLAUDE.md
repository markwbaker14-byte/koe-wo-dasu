# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Koe wo Dasu (声を出す。)** is a Japanese-language SaaS web app for university students. Users upload PDF lecture materials; the app calls the Claude API directly from the browser and returns three types of class-participation hints: questions to ask, statements to make, and discussion-deepening prompts. Free tier: 5 analyses/month. Premium: ¥980/month (Stripe integration pending).

Production: `https://koe-wo-dasu.vercel.app/` — landing at `/`, app at `/app/`.

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # Production build → dist/
npm run lint     # ESLint on .js/.jsx
npm run preview  # Preview production build locally
```

No test suite exists yet.

## Architecture

### Dual entry points

Vite builds two separate bundles from `vite.config.js`:
- `/index.html` → marketing landing page (self-contained with inline `<style>`)
- `/app/index.html` → the React app (`src/main.jsx` → `src/App.jsx`)

### Everything is in `src/App.jsx` (~985 lines)

The entire React app is a single file. Key sections in order:

| Section | What it does |
|---|---|
| `const T = {...}` | Design tokens (colors, spacing, typography) |
| `CARD_TYPES`, `DEPTHS`, `GRADES` | UI enums + system prompt instructions per depth/grade |
| Storage helpers | localStorage read/write wrappers |
| `buildSystemPrompt()` | Constructs Claude system prompt from depth, grade, and optional previous-lecture context |
| `callAPI()` | Direct `fetch` to `https://api.anthropic.com/v1/messages` using `VITE_ANTHROPIC_API_KEY` |
| Component functions | `CardView`, `Sidebar`, `SaveModal`, `UpgradeModal`, `OnboardingModal`, `RefPanel`, `MainContent` |
| `App()` | Root: all `useState`/`useRef`, API call orchestration, conditional view rendering |

There is no routing library. The "history view" is state-based (`currentView` state), not URL-routed.

### API integration

- Model: `claude-sonnet-4-20250514`
- PDF is base64-encoded in the browser and sent as `type: "document"` in the messages array
- API key is intentionally client-side (header comment: `// anthropic-dangerous-direct-browser-access`)
- Response is expected JSON: `{ topic, subjectName, question[], comment[], deepdive[] }`

### localStorage schema

```
lecture-voice:subjects-v2  →  Subject[] with nested Session[] (cards, depth, grade, topic)
lecture-voice:usage        →  { count: number, yearMonth: "YYYY-MM" }  (resets monthly)
```

Premium status is currently a dev-only toggle (`setIsPremium(true)` button). Real Stripe integration is Phase 3.

### Environment

`.env` holds `VITE_ANTHROPIC_API_KEY`. This file is in the repo intentionally for now; backend migration is a planned future phase.

## Roadmap Context

- **Phase 1 (current)**: Legal docs (ToS + Privacy Policy in `legal/`) pending lawyer review; virtual office address pending
- **Phase 2**: Stripe Payment Link (blocked on Phase 1), landing page improvements
- **Phase 3**: Backend migration (move API key server-side, Stripe webhooks, auth); GA4 analytics (spec in `specs/ga4-setup.md`, not yet in code)
