# App Redesign — Migration Spec (Phase B)

> Drafted: 2026-04-23
> Source design: `/sessions/intelligent-practical-edison/mnt/uploads/app.html`
  (output from Claude Design)
> Target file(s): `src/App.jsx` and `app/index.html`
> Owner: Mark Baker
> Depends on: Phase A landing swap (independent — can ship in parallel)

This spec captures the full migration from the current dark-themed
React app to the new sidebar-layout, light-main design from Claude
Design. The work is large enough that this doc is the reference; Claude
Code should read it end-to-end before touching any code.

---

## 1. Decisions made (2026-04-23)

| Decision                | Choice                                                                |
|-------------------------|-----------------------------------------------------------------------|
| Visual design source    | New `app.html` from Claude Design (warm beige + orange accent, dark sidebar, light main) |
| Feature placement       | Preserve all current features, restyled to new visual language        |
| **Save** gating         | **Premium-only** (matches new landing pricing card)                   |
| **Reference** gating    | **Premium-only** (matches new landing pricing card)                   |
| **Memo** gating         | Premium-only (already so today, kept as-is)                           |
| Mobile responsive       | **In scope** — sidebar collapses to drawer on small screens           |
| Library data            | Real `subjects` from localStorage (preserve existing schema)          |
| Loading animation       | Keep new 3-step animation, time it against real API call              |
| File architecture       | Recommend splitting `App.jsx` into smaller components (see §10)        |
| Settings page           | **Out of scope** — drop the "設定" link from sidebar footer for v1     |

## 2. Layout architecture

The new app is a two-pane layout:

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (dark)         │  Main (light)                 │
│  width: 240px           │  flex: 1                      │
│  ────────────           │  ────────────                 │
│  Logo                   │  Header (60px)                │
│  "新しい資料を解析"      │  ┌──────────────────────┐     │
│  "★ プレミアム"          │  │ Title  • Depth/Grade │     │
│  Usage bar              │  └──────────────────────┘     │
│  ────────────           │  Body (scrollable)            │
│  Library                │  ┌──────────────────────┐     │
│  - 科目1                │  │  3-screen state      │     │
│    └ 第1回              │  │  machine             │     │
│  - 科目2                │  │  (upload/loading/    │     │
│    └ 第1回              │  │   results)           │     │
│  ────────────           │  │                      │     │
│  ← ランディング         │  └──────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Mobile (< 768px)

- Sidebar becomes a drawer that slides in from the left.
- Header gets a hamburger button on the left to open the drawer.
- Header's depth/grade chips are hidden on mobile (visible in drawer
  or via tap on title).
- Config card sections still stack vertically (already responsive in
  the prototype).
- Drawer overlay (rgba dark with blur) closes on tap outside.

## 3. Three-screen state machine (Main body)

State variable: `step` ∈ `"upload" | "loading" | "result"` (matches
current behavior). New design also implies `historyView` for
read-only mode (when user clicks a saved lecture in sidebar).

### 3a. Upload screen

```
┌──────────────────────────────────────┐
│  Config card                         │
│  ┌──────────────────────────────┐    │
│  │ 踏み込み度                   │    │
│  │ [授業内][応用・社会][個人的] │    │
│  │ 説明テキスト...              │    │
│  ├──────────────────────────────┤    │
│  │ 対象学年                     │    │
│  │ [1・2年][3・4年][大学院生]   │    │
│  │ 説明テキスト...              │    │
│  ├──────────────────────────────┤    │
│  │ 前回参照 (PREMIUM gate)      │    │
│  │ [トグル]                     │    │
│  │   └─ 科目→セッション選択     │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Dropzone                     │    │
│  │ 📄 PDFをドロップまたは選択   │    │
│  │ [PDF] [最大20MB] [text推奨]  │    │
│  └──────────────────────────────┘    │
│                                      │
│  Error message (if any)              │
└──────────────────────────────────────┘
```

**Reference section behavior**:
- For premium users with saved sessions: shows toggle. When on, expands
  to subject selector + session selector. Selected session shows topic
  preview.
- For premium users with no saved sessions: shows "前回の授業を参照する
  にはまず授業を保存してください" hint, no toggle.
- For free users: shows locked state with 🔒 icon + "プレミアム限定" badge
  + small "★ アップグレード" button. Clicking the section opens the
  UpgradeModal with `trigger="reference_locked"`.

**Free-tier limit-reached state** (`!isPremium && usage.count >= FREE_LIMIT`):
- Replace dropzone with empty-state card:
  - Icon: 🔒 in warm beige circle
  - Title: "今月の解析回数が上限に達しました"
  - Body: "プレミアムにアップグレードすると無制限で使えます"
  - CTA: "★ プレミアムにアップグレード" (opens UpgradeModal,
    `trigger="limit_reached"`)
- Sidebar usage bar fill turns red (already in current implementation).
- Config card and reference section remain visible (so user can plan
  next session).

### 3b. Loading screen

```
┌──────────────────────────────────────┐
│           [Spinner animated]         │
│                                      │
│           解析中…                    │
│           {filename}                 │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 📄 PDFを読み込んでいます      │    │
│  │ 🔍 内容を理解しています       │    │
│  │ ✦ ヒントを生成しています      │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

**3-step animation timing** (against real API call):

```js
// Pseudo-code
function startLoading() {
  setStep("loading");
  setLoadingStep(0);                   // step 1 active
  const t1 = setTimeout(() => setLoadingStep(1), 1500);  // step 2 active
  const t2 = setTimeout(() => setLoadingStep(2), 3500);  // step 3 active

  callAPI(...)
    .then((parsed) => {
      clearTimeout(t1); clearTimeout(t2);
      // If API returned before step 3, briefly show step 3 first
      const finalize = () => {
        setLoadingStep(3);              // all done state
        setTimeout(() => transitionToResults(parsed), 400);
      };
      if (currentStep < 2) {
        setLoadingStep(2);              // jump to step 3
        setTimeout(finalize, 600);
      } else {
        finalize();
      }
    })
    .catch((err) => {
      clearTimeout(t1); clearTimeout(t2);
      handleError(...);
      setStep("upload");
    });
}
```

This makes the loading feel natural regardless of API duration.

### 3c. Results screen

```
┌──────────────────────────────────────┐
│  Results header                      │
│  📄 {topic name}                     │
│     {filename} · {depth} · {grade}   │
│                       [Export][再解析][保存] │
│                                      │
│  Hint tabs                           │
│  [❓ 質問する 3][◎ 発言する 3][↓ 深掘り 3] │
│                                      │
│  Hints grid                          │
│  ┌──────────────────────────────┐    │
│  │ ❓ QUESTION         [📋]      │    │
│  │ {hint text}                  │    │
│  │ 💡 {hint note}               │    │
│  ├──────────────────────────────┤    │
│  │ (more cards...)              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Regenerate bar (PREMIUM gate)       │
│  [🔄] 気に入らなければ再生成 [再生成]│
│  + Memo input (premium expand)       │
└──────────────────────────────────────┘
```

**Save button behavior**:
- For premium: opens SaveModal.
- For free: shows 🔒 icon + opens UpgradeModal with `trigger="save_locked"`.

**Regenerate bar behavior**:
- For premium: shows memo input area + 再生成 button.
  - 再生成 with empty memo: re-runs same parameters.
  - 再生成 with memo text: re-runs with memo applied.
- For free: shows premium teaser ("メモ追加 → 再生成はプレミアム限定")
  + "★ アップグレード" button.

**Read-only mode** (when viewing saved lecture from library):
- `historyView` is non-null.
- Hide Save, Re-analyze, Regenerate, Memo inputs.
- Show only Export.
- Header badge changes to "履歴" instead of "解析済み".

## 4. Sidebar component breakdown

### 4a. Logo block (top)
- Logo: "声を出す。" with orange period
- Tagline: "授業資料から、あなたの言葉を"

### 4b. Actions block
- "+ 新しい資料を解析" — resets state, returns to upload screen
- "★ プレミアムにアップグレード" — visible only for free users; opens UpgradeModal with `trigger="sidebar_button"`

### 4c. Usage bar (free users only)
- Label: "今月の解析回数 — X / 5"
  - **Note**: prototype says "今日の解析回数" but data model is monthly.
    Use **"今月"** to match reality.
- Progress bar: orange fill, turns red at limit

### 4d. Library list
- Section label: "最近のライブラリ"
- For premium: render `subjects` from localStorage
  - Each subject is a collapsible group
  - Expanded: shows sessions with topic name + relative date
  - Click subject row: toggle expand
  - Click session row: open in read-only history mode
  - Edit subject name: pencil icon → inline edit
  - Delete session: trash icon (with confirm)
- For free: render single locked teaser item
  ```
  🔒 保存はプレミアム
     無制限で保存・参照
  ```
  - Click opens UpgradeModal with `trigger="library_locked"`

### 4e. Footer
- Link: "← ランディングページ" → `/`
- Drop the "設定" link from prototype

### 4f. Date formatting helper

Add a helper for relative dates:
```js
function relativeDate(savedAt) {
  // savedAt is "YYYY-MM-DD" string
  const saved = new Date(savedAt);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now - saved) / dayMs);
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return savedAt;  // fallback to date string
}
```

## 5. Main header

- Left (mobile only): Hamburger button to open sidebar drawer
- Center-left: Title (in upload: "新しい解析"; in results: topic; in
  history: topic + "履歴" badge)
- Right (desktop only): "踏み込み度：{depth}" • "{grade}" — small read-only
  chips reflecting current settings. Tapping these on mobile could be a
  shortcut to scroll to config section.

## 6. Modals (3 total)

All modals use this base structure:

```html
<div class="modal-overlay" onClick={closeOnBackdrop}>
  <div class="modal-card" onClick={stopPropagation}>
    <button class="modal-close">✕</button>
    {content}
  </div>
</div>
```

CSS for modal base:
```css
.modal-overlay {
  position: fixed; inset: 0;
  background: oklch(14% 0.015 260 / 0.6);
  backdrop-filter: blur(8px);
  display: grid; place-items: center;
  z-index: 1000;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: 32px;
  max-width: 480px;
  width: 100%;
  position: relative;
  box-shadow: 0 24px 48px oklch(16% 0.012 260 / 0.2);
  animation: slideUp 0.3s ease;
}
```

### 6a. OnboardingModal
- Triggered: first visit (`!loadOnboarded()`)
- 3 steps with dot navigation, "次へ" / "スキップ" / "始める" buttons
- Restyle current copy to new visual language (warm beige bg, orange
  accents, white card)
- On finish: `markOnboarded()` + close

### 6b. SaveModal (premium only)
- Triggered: 結果画面の "保存" button
- Content:
  - Title: "授業を保存"
  - Subject picker: existing subjects as chips + "+ 新規科目" chip
  - If "新規科目" selected: text input for name
  - Footer: [キャンセル] [保存する]

### 6c. UpgradeModal
- Triggered: multiple places (see §3 and §4)
- Content:
  - Title: "プレミアムプランへアップグレード"
  - Brief value props (3 bullet points: 無制限解析, 保存・参照, メモ再生成)
  - Pricing: ¥980 / 月
  - CTA button: "Stripeで決済する →" (target="_blank", `_PAYMENT_LINK`)
  - Smaller secondary: "決済が完了したら閉じる" (manual flag, dev-tier)
  - Footer note: "解約はいつでも可能です"

## 7. Premium gating implementation map

| Gate location           | Behavior for free                                              | Trigger param for upgrade modal |
|-------------------------|----------------------------------------------------------------|--------------------------------|
| Upload limit (5/月)     | Empty-state card + CTA                                          | `limit_reached`                 |
| Reference toggle        | Disabled + lock icon + click → modal                            | `reference_locked`              |
| Save button (results)   | Lock icon + click → modal                                       | `save_locked`                   |
| Memo input (regen)      | Replaced with teaser CTA                                        | `memo_locked`                   |
| Library section         | Single locked teaser item                                       | `library_locked`                |
| Sidebar upgrade button  | Always visible for free                                         | `sidebar_button`                |
| Premium toggle (dev)    | Drop entirely OR keep behind a query string `?devmode=1`        | n/a                             |

These trigger param names align with `specs/ga4-setup.md` §2.6
(`premium_modal_opened.trigger` parameter).

## 8. State preservation

All current state must continue to work:

| Current state         | Status                                           |
|-----------------------|--------------------------------------------------|
| `step`                | Keep, plus add `loadingStep` (0-3) for animation |
| `historyView`         | Keep, drives read-only mode                      |
| `fileName`            | Keep                                             |
| `pdfBase64`           | Keep                                             |
| `result`              | Keep                                             |
| `error`               | Keep                                             |
| `activeType`          | Keep, mapped to tab `q`/`c`/`d`                  |
| `dragOver`            | Keep                                             |
| `isPremium`           | Keep                                             |
| `memo`, `memoInput`, `memoLoading`, `memoError` | Keep                       |
| `depth`, `grade`      | Keep                                             |
| `copied`              | Keep                                             |
| `subjects`, `subjLoaded` | Keep                                          |
| `usage`, `usageLoaded`| Keep, label changes from "今日" to "今月"        |
| `showSaveModal`, `saveTargetSubjId`, `newSubjName`, `savedMsg` | Keep |
| `showUpgradeModal`    | Keep, plus add `upgradeTrigger` for analytics    |
| `showOnboarding`, `onboardStep` | Keep                                   |
| `refSubjId`, `refSessId`, `useRef_` | Keep                               |
| `editingSubjId`, `editingName` | Keep                                  |
| `expandedSubjs`       | Keep                                             |
| `fileRef`             | Keep                                             |
| `sidebarOpen` (NEW)   | Add, controls mobile drawer state                |
| `loadingStep` (NEW)   | Add, controls 3-step animation                   |
| `upgradeTrigger` (NEW)| Add, passed to UpgradeModal for GA4 attribution  |

## 9. localStorage schema — no breaking changes

| Key                              | Status     | Notes                                |
|----------------------------------|------------|--------------------------------------|
| `lecture-voice:subjects-v2`      | Unchanged  | Preserved 100%, no migration needed  |
| `lecture-voice:usage`            | Unchanged  | Preserved 100%                       |
| `lecture-voice:onboarded`        | Unchanged  | Preserved 100%                       |

This means existing users with saved data will see their subjects in
the new sidebar immediately after the redesign ships. **Critical: do
not change these keys.**

## 10. Recommended file structure (refactor proposal)

The current 985-line `App.jsx` is hard to navigate. Splitting during
the redesign is the right time. Suggested structure:

```
src/
  App.jsx                        # Root: state + screen routing (≤200 lines)
  index.css                      # Global styles
  main.jsx                       # Entry point (unchanged)
  lib/
    api.js                       # callAPI, buildSystemPrompt, handleError
    storage.js                   # localStorage helpers (load/save/increment)
    constants.js                 # CARD_TYPES, DEPTHS, GRADES, FREE_LIMIT, etc.
    analytics.js                 # GA4 helpers (per ga4-setup.md spec)
    formatters.js                # relativeDate, etc.
  components/
    Sidebar.jsx                  # The dark sidebar
    MainHeader.jsx               # Top header bar
    UploadScreen.jsx             # step="upload"
    LoadingScreen.jsx            # step="loading" with 3-step animation
    ResultsScreen.jsx            # step="result"
    HintCard.jsx                 # Single hint card
    HintTabs.jsx                 # Tab switcher for q/c/d
    ConfigCard.jsx               # depth + grade + reference (+ premium gate)
    Dropzone.jsx                 # File upload area
    LimitReached.jsx             # Empty state when free limit hit
    RefSelector.jsx              # Subject + session picker
    LibraryList.jsx              # Sidebar library content
    LibraryItem.jsx              # Single library row
    UsageBar.jsx                 # Sidebar usage indicator
    Hamburger.jsx                # Mobile menu trigger
  modals/
    Modal.jsx                    # Base modal wrapper
    OnboardingModal.jsx
    SaveModal.jsx
    UpgradeModal.jsx
```

This is a recommendation — Claude Code can adjust based on what feels
clean during implementation. The hard requirement is that public
behavior (state shape, localStorage keys, API calls) doesn't change.

## 11. CSS approach

The current app uses a `T` constants object for inline styles. The new
design uses CSS variables and OKLCH colors. Recommendation:

- Move all design tokens to CSS variables in `index.css` (matching the
  `:root { --bg, --accent, ... }` pattern from the prototype)
- Drop the `T` JS object entirely
- Use plain `className` props for static styles
- Keep inline `style` only for genuinely dynamic values (e.g., progress
  bar width, conditional opacity)

This makes the styling more maintainable and matches the prototype's
approach exactly.

## 12. Edge cases checklist

- [ ] First visit: OnboardingModal shows, sidebar empty (no saves yet),
      free user, usage 0/5
- [ ] Free user upload at 4/5: succeeds, becomes 5/5
- [ ] Free user upload at 5/5: dropzone replaced with limit-reached
      empty state, sidebar usage bar red
- [ ] Free user clicks "保存": UpgradeModal opens with `trigger="save_locked"`
- [ ] Free user clicks "前回参照" toggle: UpgradeModal opens with
      `trigger="reference_locked"`
- [ ] Free user clicks library locked teaser: UpgradeModal opens with
      `trigger="library_locked"`
- [ ] Premium user (manually flagged): all gates open, library shows
      real data, no upgrade buttons in sidebar
- [ ] Mobile (<768px): sidebar hidden, hamburger visible, drawer opens
      on tap, drawer closes on outside tap
- [ ] PDF upload error (wrong type, too large): error banner visible
      above dropzone, stays in upload screen
- [ ] API error (EMPTY_RESPONSE / PARSE_ERROR / API_ERROR):
      handleError() shows correct message, returns to upload screen
- [ ] Click saved session in sidebar: opens in read-only mode, header
      shows "履歴" badge, save/regen buttons hidden
- [ ] Click "新しい資料を解析" in sidebar from any state: returns to
      upload screen, clears result, but preserves depth/grade/ref
- [ ] Existing user (with localStorage data): subjects appear in
      sidebar immediately, usage count preserved

## 13. Verification checklist

After Claude Code finishes:

- [ ] `npm run build` succeeds
- [ ] `npm run dev` and visit `/app/`
- [ ] All current features work per §12 edge cases
- [ ] localStorage keys are unchanged (verify in DevTools)
- [ ] Anthropic API call structure unchanged (verify Network tab on a
      real upload)
- [ ] Mobile rendering at 375px, 768px, 1024px (resize browser)
- [ ] Sidebar drawer opens/closes smoothly on mobile
- [ ] All 3 modals render correctly (Onboarding, Save, Upgrade)
- [ ] No console errors on any screen
- [ ] No lint errors (`npm run lint`)
- [ ] Visual diff: open new design `/sessions/intelligent-practical-edison/mnt/uploads/app.html`
      side-by-side with the new app and confirm visual parity
- [ ] Existing user can still see their saved subjects

## 14. Out of scope (deferred to later)

- Settings page (no link in v1 footer)
- Dark mode toggle (the new design is light-only by intent)
- Server-side data sync
- Real Stripe Webhook for premium verification (still local toggle)
- Analytics events (handled by separate GA4 implementation,
  see `specs/ga4-setup.md`)

## 15. Resolved decisions (Mark confirmed 2026-04-23)

1. **Premium toggle for testing**: dev "決済完了" button is shown
   **only when `?devmode=1` query string is present** in the URL. In
   normal browsing, the button is hidden. Implementation: check
   `new URLSearchParams(window.location.search).get('devmode') === '1'`
   on mount and gate the button with that flag.
2. **Onboarding copy**: keep the current 3-step copy as-is. Restyle
   the visuals for the new design language but don't change the text.
3. **Free user library teaser click behavior**: clicking the locked
   "保存はプレミアム" teaser opens the **UpgradeModal** with
   `trigger="library_locked"`.

---

## 16. Claude Code handoff prompt (copy-paste)

```
アプリ全体のデザイン刷新（Phase B）をお願いします。仕様書は

  specs/app-redesign.md

にまとめてあります。実行前に最初から最後まで読んでから着手して
ください（特に第8〜13章）。新デザインの参照は

  /sessions/intelligent-practical-edison/mnt/uploads/app.html

ですが、これはデモデータと dev-mode 用 Tweaks panel を含むプロト
タイプなので、そのまま使うのではなく仕様書通り実装してください。

実装の流れ：

1. 仕様書の §1〜§9 を熟読し、特に以下を頭に入れる
   - localStorage キーは絶対変更しない
   - "保存" と "前回参照" は今回からプレミアム限定にゲート
   - "新しい資料を解析" や "メモ追加" など現状の全機能を維持

2. ファイル構造のリファクタ（仕様書 §10）
   - 現状の 985 行の src/App.jsx を仕様書のディレクトリ構造に分割
   - lib/ と components/ と modals/ を作る
   - 既存の callAPI, buildSystemPrompt, ストレージヘルパーを抽出

3. CSS をリビルド（仕様書 §11）
   - app/index.html の <head> に Noto Sans JP フォント追加
   - src/index.css （または新規 src/styles/global.css）に CSS 変数定義
   - T オブジェクト（src/App.jsx 行3-20）は削除して CSS 変数に置換
   - 配色は uploads/app.html の :root を完全に踏襲

4. レイアウト実装（仕様書 §2〜§5）
   - Sidebar コンポーネント（ダーク背景、library 含む）
   - MainHeader コンポーネント
   - 3画面ステートマシン（UploadScreen / LoadingScreen / ResultsScreen）
   - LoadingScreen の3ステップアニメは §3b 疑似コードに従って
     実 API 呼び出しに紐づける

5. プレミアムゲート実装（仕様書 §7）
   - 各ゲート箇所で free user は対応するトリガー名で UpgradeModal を開く
   - ライブラリの "保存はプレミアム" 表示は free user のみ

6. モーダル3種をリスタイル（仕様書 §6）
   - OnboardingModal, SaveModal, UpgradeModal
   - 共通 Modal ベースコンポーネント作成

7. モバイル対応（仕様書 §2 末尾）
   - 768px 未満でサイドバーをドロワー化
   - ハンバーガーメニューを Header 左に追加
   - drawer overlay の背景タップで閉じる

8. 検証（仕様書 §12 エッジケース ＋ §13 チェックリスト）
   - 現状ユーザーの保存データが新サイドバーに正しく表示されるかが
     最重要。localStorage に手動でデータ入れて挙動確認すること
   - npm run build と npm run lint がパスすること
   - 全モーダル、全画面、モバイルレイアウトを目視確認

9. コミット
   メッセージ例：
   "feat(app): redesign app with sidebar layout and light theme

   - Replace dark theme with light theme matching new landing
   - Add sidebar with library, usage bar, upgrade CTA
   - Three-screen state machine (upload/loading/results)
   - Gate save and reference behind premium (matches landing pricing)
   - Refactor App.jsx into components/, modals/, lib/
   - Mobile drawer for sidebar (<768px)
   - Preserve all localStorage keys and Anthropic API call shape

   See specs/app-redesign.md for full migration notes."

注意点：
- specs/app-redesigned.html （クリーン化された参照 HTML）を作成
  する余裕があれば、そちらに dev-mode を除いた状態のものを置いて
  おくと、後続の作業者が迷わなくて済みます
- localStorage の互換性が破れると既存ユーザーのデータが消えるので、
  デプロイ前に必ず localStorage 互換テストを実施すること
- Anthropic API のリクエスト形状（model 名、headers、message
  shape）は一切変更しない
- specs/app-redesign.md §15 の Open Questions について Mark の
  回答が必要な場合は Cowork に質問を返してください
```

---

## 17. Out-of-Scope cross-references (so we don't lose them)

These are tracked in the main roadmap (`tasks/todo.md`) but worth
noting here for context:

- GA4 event implementation: see `specs/ga4-setup.md` — both Phase A
  landing and Phase B app should fire events per that spec once
  implemented.
- Privacy Policy & ToS publication: legal docs reference the app's
  data flow. The redesign must not change the data flow described in
  Privacy Policy v1 (no server-side persistence, Anthropic forwarding,
  localStorage scope).
- Stripe Payment Link: when activated (Phase 2 #4), the
  `_PAYMENT_LINK` constant in UpgradeModal must be updated. This is
  independent of the redesign.
