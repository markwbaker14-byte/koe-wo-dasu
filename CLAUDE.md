# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Koe wo Dasu (声を出す。)** is a Japanese-language SaaS web app for university students. Users upload PDF lecture materials; the browser POSTs to `/api/analyze` (a Vercel Serverless Function), which proxies the Claude API and returns three types of class-participation hints: questions to ask, statements to make, and discussion-deepening prompts. Free tier: 5 analyses/month. Premium: ¥980/month (Stripe integration pending).

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
| `CARD_TYPES`, `DEPTHS`, `GRADES` | UI enums (value/label/desc only — system-prompt copy lives server-side in `api/analyze.js`) |
| Storage helpers | localStorage read/write wrappers |
| Component functions | `CardView`, `Sidebar`, `SaveModal`, `UpgradeModal`, `OnboardingModal`, `RefPanel`, `MainContent` |
| `App()` | Root: all `useState`/`useRef`, API call orchestration, conditional view rendering |

There is no routing library. The "history view" is state-based (`currentView` state), not URL-routed.

### API integration

The browser never talks to Anthropic directly. Flow:

```
Browser
  └─ src/lib/api.js  callAPI() → POST /api/analyze { pdfBase64, depth, grade, prevSession, memo }
       └─ api/analyze.js (Vercel Function)
            ├─ CORS allowlist + method + body validation
            ├─ buildSystemPrompt() — DEPTH/GRADE instruction copy (server-only)
            └─ fetch api.anthropic.com/v1/messages with process.env.ANTHROPIC_API_KEY
```

- Model: `claude-sonnet-4-20250514`
- PDF is base64-encoded in the browser, posted as JSON, then sent to Anthropic as `type: "document"` in the messages array
- `ANTHROPIC_API_KEY` is server-only (no `VITE_` prefix, never bundled)
- Error contract preserved: function returns `{ error: "API_ERROR: ..." | "EMPTY_RESPONSE" | "PARSE_ERROR" | ... }`; `src/lib/api.js` re-throws; existing `handleError` in App.jsx matches on those substrings
- Response is expected JSON: `{ topic, subjectName, question[], comment[], deepdive[] }`

### localStorage schema

```
lecture-voice:subjects-v2  →  Subject[] with nested Session[] (cards, depth, grade, topic)
lecture-voice:usage        →  { count: number, yearMonth: "YYYY-MM" }  (resets monthly)
```

Premium status is currently a dev-only toggle (`setIsPremium(true)` button). Real Stripe integration is Phase 3.

### Environment

`.env` (gitignored) holds:
- `ANTHROPIC_API_KEY` — server-only, used by `api/analyze.js` under `process.env`. Set the same value in Vercel dashboard (Production + Preview + Development).
- `VITE_GA_MEASUREMENT_ID` — client-side GA4 Measurement ID, inlined at build time into both `index.html` files.

Local dev with the proxy requires `vercel dev` (not `npm run dev`) so the serverless function actually runs.

## Roadmap Context

- **Phase 1 (current)**: Legal docs (ToS + Privacy Policy in `legal/`) pending lawyer review; virtual office address pending
- **Phase 2**: Stripe Payment Link (blocked on Phase 1), landing page improvements
- **Phase 3**: Stripe webhooks, auth, cross-device sync; server-side `FREE_LIMIT` enforcement (currently localStorage, easily bypassed); rate limiting at the function level (Upstash Redis recommended — see `specs/api-key-security-fix.md` §10). API-key exposure fix already shipped.
