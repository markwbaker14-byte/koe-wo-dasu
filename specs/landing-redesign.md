# Landing Page Redesign — Migration Spec

> Drafted: 2026-04-23
> Source design: `/sessions/intelligent-practical-edison/mnt/uploads/landing.html`
  (output from Claude Design)
> Target file: `/index.html` in the koe-wo-dasu repo
> Owner: Mark Baker

This spec captures what changes when we swap the current dark-themed
landing for the new light-themed (warm beige + orange) design from
Claude Design, what gets preserved from the current implementation,
and a copy-pasteable Claude Code handoff prompt.

---

## 1. Scope (Phase A — landing only)

In scope:
- Replace `index.html` at the repo root with the new design.
- Preserve all SEO/meta/structured-data elements from the current page.
- Strip dev-mode artifacts from the Claude Design export.
- Re-point internal links to production paths (`app.html` → `/app/`).

Out of scope (Phase B — handled separately):
- Redesigning the React app (`src/App.jsx` and `app/index.html`).
- Adding `/terms` and `/privacy` routes (deferred until legal docs publish).
- OG image creation.

## 2. What's preserved from the current `index.html`

| Element                                                          | Why                                                          |
|------------------------------------------------------------------|--------------------------------------------------------------|
| `<meta name="google-site-verification">`                         | Search Console ownership verification — must not be removed  |
| `<meta name="description">`                                      | Organic search snippet                                       |
| `<meta name="author">`                                           | SEO best practice                                            |
| `<link rel="canonical">`                                         | Prevent duplicate content                                    |
| OGP tags (`og:type`, `og:url`, `og:title`, `og:description`, `og:site_name`, `og:locale`) | SNS preview                                                  |
| Twitter Card tags                                                | Twitter/X preview                                            |
| JSON-LD `SoftwareApplication` structured data                    | Rich snippets, schema.org                                    |
| `<html lang="ja">`                                               | Already matches new design                                   |

## 3. What's stripped from the new design

| Element                              | Why                                                |
|--------------------------------------|----------------------------------------------------|
| `#tweaks-panel` HTML block           | Dev-mode design exploration UI — not for production |
| `TWEAK_DEFAULTS`, `applyTweaks()`, `heroCopies`, `bgTones` JS | Dev-mode only                                      |
| `__edit_mode_*` postMessage handlers | Dev-mode only — sends data to a parent design tool  |
| `EDITMODE-BEGIN/END` markers         | Dev-mode only                                       |

## 4. Internal link updates

| Original (in upload)        | New value                  | Locations                      |
|-----------------------------|----------------------------|--------------------------------|
| `href="app.html"`           | `href="/app/"`             | Nav, hero CTA, both pricing CTAs, bottom CTA |
| `href="#"` (logo)           | `href="/"`                 | Nav logo                       |

## 5. Footer — what changes once legal docs publish

Current new design footer is minimal. Once Phase 1 legal docs ship:

```html
<!-- Add to footer between logo and copy: -->
<div class="footer-links" style="display:flex;gap:20px;font-size:12px;">
  <a href="/terms" style="color:oklch(50% 0.007 260);text-decoration:none;">利用規約</a>
  <a href="/privacy" style="color:oklch(50% 0.007 260);text-decoration:none;">プライバシーポリシー</a>
  <a href="/tokushoho" style="color:oklch(50% 0.007 260);text-decoration:none;">特定商取引法に基づく表記</a>
</div>
```

This is intentionally NOT in the v1 swap — those URLs don't resolve yet
and broken links hurt SEO. Add in a follow-up when each doc ships.

## 6. Verification checklist (after deployment)

- [ ] Visit `https://koe-wo-dasu.vercel.app/` — new design renders.
- [ ] Verify Google Search Console verification tag is intact (View Source).
- [ ] Visit `https://www.opengraph.xyz/url/https%3A%2F%2Fkoe-wo-dasu.vercel.app%2F`
      and confirm OG preview shows correct title/description.
- [ ] Test responsive layout on mobile (≤900px).
- [ ] Test all internal anchor links scroll correctly (#features, #pricing, #faq).
- [ ] Test FAQ accordion expand/collapse.
- [ ] Test depth slider demo in features section.
- [ ] Test `intersection observer` reveal animations trigger on scroll.
- [ ] Click every CTA button — all should land on `/app/`.
- [ ] Run https://pagespeed.web.dev/ and confirm Lighthouse score
      doesn't regress significantly from current page.
- [ ] Confirm structured data is valid via
      https://search.google.com/test/rich-results

## 7. Known follow-ups (post-swap)

- **OG image**: current page has no `og:image`. Twitter Card type is
  `summary_large_image` which expects an image. Recommend designing a
  1200×630 image (warm beige background with orange accent, matching
  new brand) as a separate task.
- **Favicon**: current has no favicon. Nice-to-have for browser tabs
  and bookmark display. Use the `声を出す。` mark from the logo.
- **Footer legal links**: per Section 5, add when Phase 1 docs ship.
- **GA4 snippet**: insert once GA4 spec is implemented (see
  `specs/ga4-setup.md`).
- **Stripe Payment Link**: the premium pricing card CTA currently
  links to `/app/`. Once Stripe is activated (Phase 2), consider
  linking premium card directly to Stripe.

---

## 8. Deliverable

The cleaned, merged, production-ready file is at:

  `specs/landing-redesigned.html`

Mark or Claude Code can copy it over the existing `index.html`.

## 9. Claude Code Handoff Prompt (copy-paste)

```
ランディングページのデザインを刷新します。新ファイルは

  specs/landing-redesigned.html

に置いてあります。仕様の判断は

  specs/landing-redesign.md

にまとめてあります。以下の手順で進めてください。

1. specs/landing-redesigned.html の内容を確認
   - SEO meta（Google verification、OGP、Twitter Card、JSON-LD）が
     全て残っていることをチェック
   - Tweaks panel と dev-mode JS が除去されていることをチェック
   - app.html → /app/ への置換が漏れなく行われているかチェック

2. 動作確認
   - npm run dev でローカル起動し、http://localhost:5173/ を表示
   - 全 CTA ボタンが /app/ へ遷移することを確認
   - FAQ アコーディオンの開閉、踏み込み度スライダー、reveal アニメ
     が正常動作するかチェック

3. 旧 index.html を新ファイルで上書き
   cp specs/landing-redesigned.html index.html
   （または直接エディタで内容を差し替え）

4. ビルド確認
   npm run build
   dist/index.html が想定通り生成されているか

5. コミット
   メッセージ例：
   "feat(landing): replace landing page with new light-themed design

   - Replace dark theme with light theme (oklch warm beige + orange accent)
   - New 8-section layout (Hero, Pain, How, Features, Pricing, FAQ, CTA, Footer)
   - Preserve all SEO/meta/OGP/JSON-LD from previous design
   - Strip dev-mode Tweaks panel from Claude Design export
   - Re-point all CTAs from app.html to /app/
   - See specs/landing-redesign.md for full migration notes"

6. デプロイ後の検証は specs/landing-redesign.md の Section 6
   チェックリストに従って実施し、結果を報告してください。

注意点：
- 既存の React アプリ (src/App.jsx と app/index.html) には触れない
  でください。これは Phase B として別タスクで扱います。
- 旧 index.html を削除する前に diff で SEO meta の差分を最終確認
  してください（Google Search Console 連携が切れるリスクがあります）。
```

## 10. Phase B preview — App redesign considerations

For when we tackle the app redesign (separate task), here are the
features in the current `App.jsx` that need a home in the new design:

| Current feature             | Where it lives now            | Where it might go in new design                      |
|-----------------------------|-------------------------------|------------------------------------------------------|
| OnboardingModal             | Full-screen modal             | Keep as modal, restyle to match new visual language  |
| UpgradeModal (Stripe link)  | Full-screen modal             | Keep as modal, restyle                               |
| SaveModal (subject picker)  | Full-screen modal             | Keep as modal, restyle                               |
| RefPanel (前回参照)         | Inline panel above results    | Sidebar section under library, or inline in upload   |
| Memo input (再生成)          | Inline below results          | Inline below results card, restyled                  |
| Export TXT                  | Header button                 | Inline in results header (already shown in mockup)   |
| Free-limit blocked state    | Disabled upload area + msg    | Re-style with new design's empty-state pattern       |
| Premium toggle (dev-only)   | Hidden button                 | Drop or hide deeper                                  |
| Library: subjects/sessions  | Modal-based                   | Sidebar list (already shown in mockup, mock data)    |
| Loading screen              | Inline spinner                | New 3-step animated loading screen (in mockup)       |
| Result hint cards           | Tab-based, copy buttons       | Same UX, new visual styling (in mockup)              |

Open questions for Phase B:
- The new design hardcodes 3 hint types. Confirm this matches the
  current Anthropic API response shape (`question` / `comment` /
  `deepdive`).
- Sidebar library shows "今日 / 昨日 / 3 日前" relative dates.
  Current data only stores creation timestamps; need to add
  formatting helper.
- New design's "保存はプレミアム" locked-state library item is a
  nice gating UX — adopt for free users.
- Demo / placeholder data in upload should be removed for production.
