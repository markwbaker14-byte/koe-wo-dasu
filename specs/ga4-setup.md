# GA4 Setup Spec — Koe wo Dasu

> Drafted: 2026-04-23
> Owner: Mark Baker
> Status: Spec ready, GA4 property + implementation pending

This document covers the full Google Analytics 4 setup: event taxonomy,
conversion goals, privacy settings, implementation approach, and a
copy-pasteable Claude Code handoff prompt at the bottom.

---

## 1. Goals — what we want to learn from analytics

Before listing events, we anchor on the questions GA4 should answer:

1. **Acquisition**: where do visitors arrive from, and which landing-page
   sections actually drive clicks into `/app/`?
2. **Activation**: what % of new users complete their first PDF analysis?
3. **Engagement**: how many analyses does an active user run per month?
   How many use the subject library / previous-lecture reference?
4. **Free-to-paid funnel**: at what point in the user journey does the
   premium modal open, and what % of opens convert to a Stripe click?
5. **Conversion**: how many users actually complete a Stripe purchase,
   and what's the cost per acquisition once we start paid traffic?
6. **Retention**: do paid users stick (next-month revisit), and does the
   subject library increase return rate?

Every event below maps to at least one of these questions.

## 2. Event Taxonomy

Naming convention: `snake_case` in English, max 40 characters.
GA4 reserved event names (page_view, session_start, first_visit,
user_engagement, purchase) are used where applicable.

### 2.1 Auto-collected (no implementation work)

| Event              | Notes                                              |
|--------------------|----------------------------------------------------|
| `page_view`        | Default. Tracks `/`, `/app/`, future blog routes.  |
| `session_start`    | Default.                                           |
| `first_visit`      | Default. Useful for activation rate denominator.   |
| `user_engagement`  | Default (~10s active time threshold).              |
| `scroll`           | Optional, enable in GA4 Enhanced Measurement.      |

### 2.2 Landing page

| Event                  | Trigger                                      | Parameters                                              |
|------------------------|----------------------------------------------|---------------------------------------------------------|
| `landing_cta_clicked`  | Click on any "Try the app" CTA on `/`        | `cta_location` = `hero` \| `features` \| `pricing` \| `footer` |

### 2.3 Onboarding (first-time `/app/` visitors)

| Event                    | Trigger                                                 | Parameters                                                            |
|--------------------------|---------------------------------------------------------|-----------------------------------------------------------------------|
| `onboarding_step_viewed` | Each onboarding modal step is shown                     | `step_index` (0-based int), `step_name` (slug)                        |
| `onboarding_completed`   | User finishes the last step                             | (none)                                                                |
| `onboarding_skipped`     | User closes modal before final step                     | `skipped_at_step` (int)                                               |

### 2.4 Core analysis funnel — most important

| Event                    | Trigger                                                 | Parameters                                                            |
|--------------------------|---------------------------------------------------------|-----------------------------------------------------------------------|
| `pdf_upload_attempted`   | User clicks upload area or drops file                   | `source` = `click` \| `drag`                                          |
| `pdf_upload_blocked`     | Upload blocked due to free-tier limit                   | `reason` = `free_limit_reached`                                       |
| `pdf_uploaded`           | File successfully selected (before API call)            | `file_size_kb` (int, rounded)                                         |
| `analysis_started`       | `analyze()` is invoked                                  | `depth` (int), `grade` (string), `has_memo` (bool), `has_reference` (bool) |
| `analysis_succeeded`     | API returns parsed result and `setStep("result")` runs  | `depth`, `grade`, `duration_ms` (int)                                 |
| `analysis_failed`        | `handleError` is called                                 | `error_type` (string, sanitized — no message bodies)                  |
| `memo_applied`           | User re-runs analysis after adding a memo               | `memo_length_chars` (int, bucketed: <50, 50-200, >200)                |

> **Privacy note**: never include PDF content, hint text, or the memo
> body itself as event parameters. Only metadata.

### 2.5 Engagement

| Event                          | Trigger                                              | Parameters                                |
|--------------------------------|------------------------------------------------------|-------------------------------------------|
| `hint_copied`                  | User clicks copy button on a hint card               | `hint_type` (card key, e.g. `question`)   |
| `hint_tab_switched`            | User switches between hint type tabs                 | `tab_name`                                |
| `export_text_clicked`          | User exports current tab as text                     | `tab_name`                                |
| `subject_created`              | User creates a new 科目                              | (none)                                    |
| `lecture_saved`                | User saves a lecture into the subject library        | `subject_count` (number of existing 科目) |
| `previous_lecture_referenced`  | `useReference` toggled on AND a session is selected  | (none)                                    |

### 2.6 Premium funnel — critical for revenue

| Event                       | Trigger                                                          | Parameters                                                              |
|-----------------------------|------------------------------------------------------------------|-------------------------------------------------------------------------|
| `free_limit_reached`        | `usage.count` first reaches `FREE_LIMIT` (fire once per month)   | (none)                                                                  |
| `premium_modal_opened`      | `setShowUpgradeModal(true)` is called                            | `trigger` = `limit_banner` \| `header_button` \| `save_cta` \| `feature_lock` \| `upgrade_button` |
| `premium_stripe_clicked`    | User clicks the actual Stripe link in modal                      | (none)                                                                  |
| `premium_marked_purchased`  | User clicks "I've completed payment" button (manual flag)        | (none)                                                                  |
| `purchase`                  | Stripe success URL hit OR `premium_marked_purchased`             | `value` = 980, `currency` = `"JPY"`, `transaction_id` = generated UUID, `items` = `[{item_id: "premium_monthly", item_name: "Premium Monthly", price: 980, quantity: 1}]` |

> The `purchase` event is GA4's recommended ecommerce event. Using it
> correctly unlocks revenue reports and ROAS calculations.

## 3. User Properties

Set once and updated when changed. Visible across all events.

| Property            | Type    | When set                                     |
|---------------------|---------|----------------------------------------------|
| `is_premium`        | string  | On app load, after upgrade, after downgrade  |
| `grade_level`       | string  | When user changes grade selector             |
| `depth_preference`  | string  | When user changes depth slider               |
| `subject_count`     | number  | Updated when 科目 created/deleted            |

> User properties must NOT be PII. Do not set `user_id` to email or any
> personally identifiable value. If we add login later, hash the email
> with SHA-256 before passing.

## 4. Conversion Goals (mark in GA4 UI as Key Events)

In order of business priority:

1. **`purchase`** — primary revenue conversion
2. **`premium_stripe_clicked`** — purchase intent (high signal)
3. **`analysis_succeeded`** — activation (use first per session as the
   activation moment in GA4 Funnel Explorer)
4. **`landing_cta_clicked`** — landing page effectiveness
5. **`onboarding_completed`** — onboarding completion rate

## 5. Privacy & Compliance

These settings must be confirmed in the GA4 admin UI after the property
is created.

- **IP anonymization**: GA4 default (always on, no action required).
- **Google Signals**: **disable** (Admin → Property → Data Collection).
  We don't need cross-device tracking for ad personalization, and
  enabling it widens privacy disclosure obligations.
- **Data retention**: set to **2 months** (Admin → Property → Data
  Settings → Data Retention). This is the minimum and matches our
  Privacy Policy Section 8 disclosure.
- **Demographics & Interests**: leave **off**.
- **Reporting identity**: set to **device-based** (no User-ID for now).
- **Cookie consent**: defer until lawyer review on Privacy Policy
  Section 8 (whether 電気通信事業法 外部送信規律 applies). For v1, the
  Privacy Policy disclosure of GA4 usage is the consent mechanism.

## 6. Implementation Approach

### 6.1 File changes

| File                              | Change                                                                          |
|-----------------------------------|---------------------------------------------------------------------------------|
| `index.html` (landing) and `app/index.html` | Add gtag.js snippet in `<head>`, gated by env var presence                |
| `src/lib/analytics.js` (new)      | Helper module exposing `track()`, `setUserProperty()`, `trackPurchase()`        |
| `src/App.jsx`                     | Wrap key handlers with tracking calls; minimal logic added inline               |
| `.env`                            | Add `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`                                       |
| `.env.example`                    | Document the variable                                                           |

### 6.2 Helper module shape

```js
// src/lib/analytics.js
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const enabled = Boolean(MEASUREMENT_ID) && typeof window !== "undefined";

export function track(eventName, params = {}) {
  if (!enabled || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export function setUserProperty(key, value) {
  if (!enabled || !window.gtag) return;
  window.gtag("set", "user_properties", { [key]: value });
}

export function trackPurchase({ transactionId, value = 980, currency = "JPY" }) {
  track("purchase", {
    transaction_id: transactionId,
    value,
    currency,
    items: [{
      item_id: "premium_monthly",
      item_name: "Premium Monthly",
      price: value,
      quantity: 1,
    }],
  });
}
```

### 6.3 Snippet to add to both `index.html` files

```html
<!-- Google Analytics 4 -->
<script>
  (function () {
    var GA_ID = "%VITE_GA_MEASUREMENT_ID%"; // replaced at build time
    if (!GA_ID || GA_ID === "%VITE_GA_MEASUREMENT_ID%") return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  })();
</script>
```

> Vite's `define` config or a small build-time substitution is needed
> to replace `%VITE_GA_MEASUREMENT_ID%`. Claude Code will handle this.

## 7. Setup Checklist (Mark's Tasks Before Claude Code Runs)

These steps must complete before the implementation work starts.

- [ ] Create GA4 property in Google Analytics under
      `markwbaker14@gmail.com`. Property name: "Koe wo Dasu Production".
- [ ] Create a Web data stream pointing to
      `https://koe-wo-dasu.vercel.app/`.
- [ ] Copy the Measurement ID (`G-XXXXXXXXXX`) — needed for `.env`.
- [ ] Configure data retention to 2 months
      (Admin → Data Settings → Data Retention).
- [ ] Disable Google Signals
      (Admin → Data Collection → Google Signals).
- [ ] Disable Demographics & Interests reporting.
- [ ] Add a cross-link from Google Search Console (already verified)
      to the new GA4 property
      (Admin → Product Links → Search Console Links).

## 8. Verification Checklist (After Claude Code Implementation)

- [ ] In GA4 DebugView, confirm `page_view` fires on landing page load.
- [ ] Confirm `landing_cta_clicked` fires when clicking the hero CTA.
- [ ] Confirm `pdf_upload_attempted` and `pdf_uploaded` fire in sequence
      when uploading a sample PDF.
- [ ] Confirm `analysis_started` and `analysis_succeeded` fire end-to-end.
- [ ] Force the free-tier limit and confirm `free_limit_reached` and
      `pdf_upload_blocked` fire.
- [ ] Open premium modal and confirm `premium_modal_opened` fires with
      correct `trigger` parameter.
- [ ] Click Stripe link and confirm `premium_stripe_clicked` fires.
- [ ] Run a test purchase (after task #4 Stripe activation) and confirm
      `purchase` event appears in DebugView with value=980, currency=JPY.
- [ ] After 24 hours, confirm events appear in standard reports
      (DebugView is real-time but standard reports lag).

---

## 9. Claude Code Handoff Prompt (copy-paste below)

Send the following to Claude Code in the `koe-wo-dasu` repo. The prompt
references this spec file so the agent can read it for full detail.

```
GA4 計測の実装をお願いします。仕様は以下のファイルにまとめてあります。

  specs/ga4-setup.md

実装範囲は仕様書のセクション 6（Implementation Approach）にある通りです。
以下の順序で進めてください。

1. .env と .env.example に VITE_GA_MEASUREMENT_ID を追加
   - .env は実値（後で Mark が差し込み）
   - .env.example は "G-XXXXXXXXXX" のサンプル値

2. src/lib/analytics.js を新規作成
   - 仕様書 6.2 のコード例の通り実装
   - track / setUserProperty / trackPurchase の 3 関数を export

3. ルートの index.html と app/index.html の両方に
   gtag.js 読み込みスニペットを <head> 内に追加
   - 仕様書 6.3 のスニペットをベースに、Vite の define 機能で
     ビルド時に Measurement ID を埋め込めるよう vite.config.js を調整
   - 環境変数が空の場合はスクリプトをロードしない（開発時のノイズ回避）

4. src/App.jsx に以下の箇所で track() 呼び出しを追加
   仕様書セクション 2.3〜2.6 のイベント表に従う：

   - analyze 関数の冒頭で analysis_started を発火
     params: { depth, grade, has_memo: !!memo, has_reference: !!getRefSession() }
   - analyze 成功時に analysis_succeeded を発火
     params: { depth, grade, duration_ms: 計測値 }
   - analyze 失敗時に analysis_failed を発火
     params: { error_type: エラー種別を文字列化（メッセージ本文は含めない）}
   - PDF アップロードクリック/ドラッグハンドラで pdf_upload_attempted を発火
     params: { source: "click" | "drag" }
   - 無料枠到達でアップロードブロック時に pdf_upload_blocked を発火
     params: { reason: "free_limit_reached" }
   - usage.count が初めて FREE_LIMIT に達した瞬間に free_limit_reached を発火
     （重複発火しないよう localStorage で月単位の発火履歴を持つ）
   - 全プレミアムボタンの onClick で premium_modal_opened を発火
     params: { trigger: 各ボタンの位置を識別する文字列 }
   - Stripe リンクの onClick で premium_stripe_clicked を発火
   - "決済完了" ボタンの onClick で premium_marked_purchased と
     trackPurchase({ transactionId: crypto.randomUUID() }) を発火
   - hint copy ボタンで hint_copied 発火、tab 切替で hint_tab_switched 発火
   - 科目作成 / 講義保存 / 前回参照ON で各々のイベント発火
   - onboarding 各ステップで onboarding_step_viewed、終了/スキップで
     onboarding_completed / onboarding_skipped 発火

5. setUserProperty で is_premium, grade_level, depth_preference,
   subject_count をアプリ起動時と変更時に同期

6. ビルドが通ることを確認（npm run build）

7. 実装完了後、変更ファイル一覧と、各 track() の挿入箇所（行番号）を
   サマリで報告してください。

注意点：
- PDF の中身、ヒントテキスト、メモ本文は絶対にイベントパラメータに
  含めないでください（プライバシー違反になります）
- イベント名は仕様書の表に厳密に一致させてください
- ガード： MEASUREMENT_ID が未設定でもアプリが落ちないように
- TypeScript ではなく素の JavaScript で書いてください（既存コードに合わせる）
- 既存の lint ルールに従ってください
```

---

## 10. Open Questions (deferred until later)

- **Server-side tagging**: when the backend migration (Phase 3 #10)
  happens, consider moving GA4 events server-side for better data
  reliability (ad blockers bypass).
- **Cookie consent banner**: revisit after lawyer feedback on Privacy
  Policy Section 4.4 and 8.
- **Funnel definition in GA4 UI**: build the
  `pdf_upload_attempted → analysis_started → analysis_succeeded →
  premium_modal_opened → premium_stripe_clicked → purchase`
  funnel in Explore once data starts flowing.
