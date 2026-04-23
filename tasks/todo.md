# Koe wo Dasu — Marketing & Operations Roadmap

> Last updated: 2026-04-23
> Owner: Mark Baker (sole operator, Tokyo)
> Production URLs: https://koe-wo-dasu.vercel.app/  •  https://koe-wo-dasu.vercel.app/app/

This file is the single source of truth for non-engineering operational work
on Koe wo Dasu. Engineering work happens in Claude Code; this file scopes,
sequences, and verifies the work that Cowork drives.

---

## Operating Context (decided 2026-04-23)

- **Operator status**: Individual, no 開業届 filed yet, treated as 任意団体 for now.
  - **Trade name (屋号)**: **Mark Baker Studio** (decided 2026-04-23). Umbrella
    name designed to host multiple services so future products don't require
    re-issuing legal docs. "声を出す。" sits under this 屋号 as a service name.
  - ⚠️ Recommendation: file 開業届 within 1 month of first paid revenue
    (Tokyo tax office) — required under 所得税法 Art. 229 and unlocks the
    青色申告 deduction. Lawyer review will likely flag this too. The 屋号 on
    the 開業届 should match what's used in 規約 and 特商法表記.
- **Tokushoho address strategy**: Virtual office / PO box (to be contracted).
  - Decided 2026-04-23: address-only virtual office service (GMO Office Support
    recommended, ~¥660/month). Home address rejected due to irreversibility of
    public disclosure (Wayback Machine, search caches) and personal-safety risk.
  - Phone: separate 050 number (not personal mobile).
  - Blocking dependency for: Stripe activation, ToS publication, Privacy Policy.
- **Drafting style for legal docs**: Standard SaaS template + service-specific
  additions, with mandatory lawyer review before public release.
- **Document language**: User-facing legal docs → Japanese. Internal management
  files (this file, lessons.md, specs) → English.

---

## Phase 1 — Pre-Monetization Foundation (HIGH priority, blocking Stripe)

> **Tokushoho display page** (`legal/tokushoho-ja.md`) drafted 2026-04-23.
> Has placeholders for address, phone, email, contact email — to be filled
> in once GMO virtual office and 050 number are confirmed. Review points
> added to lawyer checklist Section 5.

### 1. Terms of Service (利用規約)
- [x] Decide on operator display name → **「声を出す。運営チーム」**
- [x] Decide refund policy → **monthly auto-renew, no pro-rated refund,
      access continues until end of paid month**
- [x] Decide drafting style → **template + service-specific additions, then
      mandatory lawyer review** (lawyer = personal contact of Mark's)
- [x] Decide umbrella 屋号 → **Mark Baker Studio** (replaces "声を出す。運営チーム"
      everywhere; allows future services to share legal infrastructure)
- [x] Indirect trademark / namespace check (web search): no exact-match conflict
      found in Japan; adjacent "Mark Baker" entities exist globally (Peppa Pig
      animator, documentary "Mark Baker Studios" with plural S, Rutgers
      linguist, bowling coach), none operating as a Japanese SaaS 屋号
- [ ] **Mark to confirm via J-PlatPat (3 min)**: search 商標出願・登録情報
      検索 for "Mark Baker Studio" in 第9類 (software) and 第42類 (SaaS) —
      <https://www.j-platpat.inpit.go.jp/t1101>
- [ ] **Mark to confirm via Cloudflare Registrar (1 min)**: check availability
      and reserve `markbakerstudio.com` (recommended) plus optionally `.jp`,
      `.studio`, `.dev` — <https://domains.cloudflare.com/>
- [x] Draft v1 in Japanese (`legal/terms-of-service-ja.md`)
- [x] Prepare lawyer review checklist (`legal/lawyer-review-checklist.md`)
- [ ] Mark's self-read pass on v1 — flag anything that doesn't match the
      service's actual behavior
- [~] Contract virtual office (GMO Office Support 月額プラン, address-only)
      — **Application submitted by Mark on 2026-04-23. Awaiting GMO review
      (typically 1–3 business days). Address will be inserted once confirmed.**
- [ ] Acquire 050 number (SMARTalk free, or 050 plus ¥330/month)
- [ ] Hand off to lawyer (target: 1-2 week turnaround)
- [ ] Reflect lawyer feedback → v2
- [ ] Insert virtual office address, contact email, and effective date
- [ ] Publish at /terms and link from landing page footer + premium signup flow
- [ ] Verification: visit footer link on mobile + desktop, confirm rendering

### 2. Privacy Policy (プライバシーポリシー)
- [x] Map current data flows (PDF upload → browser memory → Anthropic API →
  response → localStorage; no server-side persistence today)
- [x] Draft v1 in Japanese (`legal/privacy-policy-ja.md`) with sections on:
  - PDF content handling and retention (none server-side)
  - Anthropic API forwarding and cross-border transfer (US)
  - localStorage scope and user-controlled deletion
  - GA4 cookie usage (planned, included pre-implementation)
  - Stripe customer data flow (cross-border transfer to US)
  - Vercel hosting cross-border transfer
- [x] Add Privacy Policy review points to lawyer checklist (Section 4)
- [ ] Mark's self-read pass on v1 — flag any data flow that doesn't match reality
- [ ] Lawyer review (combine with ToS review session)
- [ ] Insert virtual office address, contact email, and effective date
- [ ] Publish at /privacy and link from footer + signup flow
- [ ] Verification: confirm both /terms and /privacy resolve and are readable

### 3. Google Analytics 4
- [x] Decide event taxonomy → see `specs/ga4-setup.md` Section 2
      (24 custom events grouped by funnel stage, plus auto-collected events)
- [x] Decide user properties → `is_premium`, `grade_level`,
      `depth_preference`, `subject_count`
- [x] Decide conversion goals → `purchase`, `premium_stripe_clicked`,
      `analysis_succeeded`, `landing_cta_clicked`, `onboarding_completed`
- [x] Decide privacy settings → 2-month retention, Google Signals OFF,
      Demographics OFF, IP anonymization ON (default)
- [x] Prepare Claude Code handoff prompt → see `specs/ga4-setup.md` Section 9
- [x] Privacy Policy already mentions GA4 (Section 5.4 and Section 8)
- [x] **Claude Code implementation complete (2026-04-23)** — verified locally:
      - `src/lib/analytics.js` created with track/setUserProperty/trackPurchase
      - `index.html` and `app/index.html` have gtag.js snippet (privacy flags on)
      - `src/App.jsx` instrumented with 30 GA4 helper calls
      - Google Search Console verification tag preserved
      - Status: working tree dirty (commit + push pending on Mark's side)
- [ ] **Mark to create GA4 property** under markwbaker14@gmail.com
      (per checklist in `specs/ga4-setup.md` Section 7)
- [ ] **Mark to add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to .env**
- [ ] **Mark to confirm commit + push of GA4 changes** (working tree
      shows uncommitted; verify with `git log -1`)
- [ ] Verification per `specs/ga4-setup.md` Section 8 (DebugView, 9 checks)
- [ ] Cross-link with Search Console

---

## Phase 2 — Launch Monetization (MEDIUM priority)

### 4. Stripe Payment Link
- [ ] Stripe account activation (requires Tokushoho address from #1)
- [ ] Create Product + Price (¥980/month subscription, JPY)
- [ ] Generate Payment Link with success URL = /app/?premium=success
- [ ] Hand off to Claude Code: replace STRIPE_PAYMENT_LINK constant in App.jsx
- [ ] Test purchase end-to-end with personal card (then refund)
- [ ] Document the manual-refund process (no Webhook yet, see #10)

### 5. Landing Page Conversion Improvements

#### 5a. Landing page redesign (Claude Design output → production)
- [x] Receive new design from Claude Design (`uploads/landing.html` and
      `uploads/app.html`) — 2026-04-23
- [x] Decide migration strategy → landing first, app second; preserve all
      current features in new visual language; keep raw HTML approach;
      reuse existing localStorage data
- [x] Draft migration spec → `specs/landing-redesign.md`
- [x] Produce cleaned production-ready HTML → `specs/landing-redesigned.html`
      (SEO/meta preserved, dev-mode artifacts removed, all CTAs re-pointed
      to `/app/`)
- [~] **Send Claude Code handoff prompt** (in `specs/landing-redesign.md`
      Section 9) to swap `index.html` — **Mark sending 2026-04-23**
- [ ] Verify per `specs/landing-redesign.md` Section 6 checklist
      (rendering, OG preview, FAQ accordion, responsive, structured data)

#### 5b. Other conversion improvements (after redesign ships)
- [ ] Record a 30-60s usage demo (screen recording, no voiceover required)
- [ ] Convert to optimized GIF or MP4 (≤3MB) and embed above the fold
- [ ] Draft 3-5 testimonials (placeholder copy initially, real testimonials
  once we have early users — flag clearly if fictional in v1)
- [ ] Design OG image (1200x630, warm beige + orange matching new design)
- [ ] Hand off implementation to Claude Code
- [ ] A/B verification: open in private window, check OG preview via
  https://www.opengraph.xyz/

#### 5c. App redesign (Phase B — separate effort)
- [x] Complete feature inventory of current `App.jsx` (subagent run)
- [x] Confirm hint type names match Anthropic API response shape
      (question / comment / deepdive — confirmed match)
- [x] Decide premium gating policy → "保存" and "前回参照" both
      gated (matches new landing pricing card)
- [x] Decide mobile scope → in scope (sidebar → drawer at <768px)
- [x] Decide loading screen approach → keep 3-step animation, time
      against real API call
- [x] Decide file architecture → recommend split into components/,
      modals/, lib/ (Claude Code's call to execute)
- [x] Draft app redesign spec → `specs/app-redesign.md` (17 sections)
- [x] **Mark answered 3 open questions** (spec §15) — dev toggle behind
      `?devmode=1`, onboarding copy unchanged, library teaser opens
      UpgradeModal
- [ ] **Send Claude Code handoff prompt** (spec §16) — ready to ship
- [ ] Verify per spec §12 (edge cases) and §13 (verification checklist)

### 6. Contact Form
- [ ] Choose tooling (recommend: simple Formspree or Tally embed; no backend)
- [ ] Decide what fields to collect (name, email, category, message)
- [ ] Hand off implementation spec to Claude Code
- [ ] Verification: submit a test message, confirm email arrival

---

## Phase 3 — Growth (LOWER / MEDIUM-TERM priority)

### 7. SEO Blog Content
- [ ] Decide on URL structure (/blog/[slug] vs Note/Zenn external)
- [ ] Keyword research for university-student pain points
- [ ] Draft 3 cornerstone articles:
  - 大学の授業で発言できない時の対処法
  - 教授に覚えてもらう質問の仕方
  - レジュメをAIで読み解く勉強法（無料テンプレ付き）
- [ ] Internal links from each article to /app/
- [ ] Submit new URLs to Search Console

### 8. Twitter/X Marketing
- [ ] Create or repurpose @KoeWoDasu account
- [ ] Decide voice/tone guide (Japanese, friendly senpai tone)
- [ ] Plan 4-week initial content calendar (3 posts/week)
- [ ] Pin a "what is this" thread with screenshots and the demo GIF
- [ ] Engagement targets and stop-loss criteria

### 9. Error Monitoring (Sentry or alternative)
- [ ] Evaluate Sentry free tier vs alternatives (LogRocket, Highlight)
- [ ] Hand off implementation spec to Claude Code
- [ ] Set up Slack/email alerts for production errors

### 10. Backend Migration (Mid-term, after first 50 paid users)
- [ ] Move Anthropic API calls server-side (kill key exposure)
- [ ] Stripe Webhook for subscription state (premium = server-verified)
- [ ] Authentication (Magic link or OAuth)
- [ ] Cross-device data sync to replace localStorage-only model
- [ ] This is a substantial engineering effort — separate planning doc when ready

---

## Verification & Quality Standards (per user preference)

For every task above, "done" requires:
1. The change is live in production (or, for docs, the file is published)
2. A manual or automated check that proves the change works
3. A short note in the review section below describing what was verified

Lessons learned from corrections go into `tasks/lessons.md` (created on first
correction).

---

## Review / Completion Log

(To be populated as tasks finish.)
