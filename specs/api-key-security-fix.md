# API Key Security Fix — Move Anthropic Call Server-Side

> **Priority: P0 — blocks Phase B and any further iteration**
> Drafted: 2026-04-23
> Owner: Mark Baker
> Why now: API key has been exposed in the production JS bundle since
> launch. Was previously scheduled as Phase 3 but the risk is too real
> to keep deferring. Spend cap is set (confirmed 2026-04-23) so blast
> radius is bounded, but unauthorized usage is still happening time
> against Mark's quota until the fix lands.

This spec covers two interlocking changes that **must ship together**:

1. **Architecture change**: move the Anthropic API call from the browser
   to a Vercel Serverless Function. Browser calls `/api/analyze`, the
   function calls Anthropic.
2. **Key rotation**: generate a fresh API key, configure it as a
   server-only env var, then revoke the old (compromised) key.

Doing only one is meaningless. Doing them in the wrong order breaks
production. The procedure below sequences them safely.

---

## 1. Current state (what's leaking)

```
Browser
  └─ fetch("https://api.anthropic.com/v1/messages")
       headers: { "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY }
```

`VITE_*` env vars are inlined into the production JS bundle by Vite at
build time. Any visitor can:

```
1. Open DevTools → Sources tab on koe-wo-dasu.vercel.app/app/
2. Find the bundled JS (e.g., assets/index-{hash}.js)
3. Search for "sk-ant-" — the API key is there in plaintext
```

This is true for every deployed build since launch.

## 2. Target state (what we ship)

```
Browser
  └─ fetch("/api/analyze", {
       method: "POST",
       body: JSON.stringify({ pdfBase64, depth, grade, prevSession, memo })
     })

Vercel Function (api/analyze.js)
  ├─ Validate request (Origin, method, body shape, size)
  ├─ Build system prompt (current logic, moved server-side)
  ├─ fetch("https://api.anthropic.com/v1/messages")
  │    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY }
  │    (server-side env var, never bundled)
  └─ Return parsed JSON to browser
```

`ANTHROPIC_API_KEY` (no `VITE_` prefix) is **never** bundled because
it's read at runtime in a Node environment, not at Vite build time.

## 3. File changes

| File                              | Action                                                          |
|-----------------------------------|-----------------------------------------------------------------|
| `api/analyze.js`                  | **NEW** — Vercel Function with proxy + system prompt builder    |
| `src/lib/api.js` (NEW)            | Refactor `callAPI` to fetch `/api/analyze` instead of Anthropic |
| `src/App.jsx`                     | Replace inline `callAPI` with import from `lib/api.js`          |
| `.env`                            | Add `ANTHROPIC_API_KEY` (no VITE_ prefix). Keep `VITE_ANTHROPIC_API_KEY` temporarily until rollout completes, then remove |
| `.env.example`                    | Document `ANTHROPIC_API_KEY`, deprecate `VITE_ANTHROPIC_API_KEY` |
| `vercel.json` (may need creation) | Optionally configure function settings                          |
| `package.json`                    | No new dependencies needed (use `fetch` built-in)               |

## 4. `api/analyze.js` design

Vercel auto-detects files in `/api` as Serverless Functions. Use Node.js
runtime (default).

```js
// api/analyze.js
// Vercel Serverless Function — proxies Anthropic Messages API
// Hides API key, validates origin/method/body, returns parsed JSON.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2000;

const ALLOWED_ORIGINS = new Set([
  "https://koe-wo-dasu.vercel.app",
  "http://localhost:5173",  // for npm run dev
]);

// Hard cap on PDF base64 size (10MB raw → ~13.5MB base64).
// Reject larger payloads to limit abuse cost and Vercel function
// invocation memory.
const MAX_PDF_BASE64_BYTES = 14 * 1024 * 1024;

export default async function handler(req, res) {
  // CORS — only allow our own origins
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  let body;
  try {
    body = req.body;
    if (typeof body === "string") body = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { pdfBase64, depth, grade, prevSession, memo } = body || {};

  if (typeof pdfBase64 !== "string" || pdfBase64.length === 0) {
    return res.status(400).json({ error: "Missing pdfBase64" });
  }
  if (pdfBase64.length > MAX_PDF_BASE64_BYTES) {
    return res.status(413).json({ error: "PDF too large" });
  }
  if (!["surface", "applied", "personal"].includes(depth)) {
    return res.status(400).json({ error: "Invalid depth" });
  }
  if (!["freshman", "senior", "grad"].includes(grade)) {
    return res.status(400).json({ error: "Invalid grade" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY env var not configured");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const systemPrompt = buildSystemPrompt({ depth, grade, prevSession, hasMemo: Boolean(memo) });

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            {
              type: "text",
              text: memo
                ? `この授業資料を分析して学生向けの発言ヒントを生成してください。\n\n【講義メモ】\n${memo}`
                : "この授業資料を分析して学生向けの発言ヒントを生成してください。",
            },
          ],
        }],
      }),
    });
  } catch (err) {
    console.error("Anthropic fetch failed:", err);
    return res.status(502).json({ error: "API_ERROR: upstream unreachable" });
  }

  if (!upstream.ok) {
    const status = upstream.status;
    const text = await upstream.text().catch(() => "");
    console.error("Anthropic non-OK:", status, text);
    return res.status(502).json({ error: `API_ERROR: ${status}` });
  }

  const json = await upstream.json();
  const content = json?.content?.[0]?.text;
  if (!content) {
    return res.status(502).json({ error: "EMPTY_RESPONSE" });
  }

  // Anthropic returns the JSON inside a code block sometimes; strip it.
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(502).json({ error: "PARSE_ERROR" });
  }

  return res.status(200).json(parsed);
}

function buildSystemPrompt({ depth, grade, prevSession, hasMemo }) {
  // Move the existing buildSystemPrompt logic from src/App.jsx here.
  // Reference DEPTHS / GRADE_INSTRUCTIONS constants — duplicate them
  // server-side OR import from a shared module if file structure allows.
  // (Vercel Functions can import from `../src/lib/...` if config allows;
  // simplest is to inline the constants here.)
  // ...
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",  // covers our 14MB base64 cap + JSON overhead
    },
  },
};
```

Notes:
- The system prompt builder logic must move to the function. Either
  inline the `DEPTHS` / `GRADE_INSTRUCTIONS` constants in `api/analyze.js`,
  or extract them into a shared module that both client and server import.
- We're not adding rate limiting in this iteration (see §10 follow-ups).
  The spend cap and Origin check are the primary protections.

## 5. `src/lib/api.js` design

```js
// src/lib/api.js
// Client-side wrapper for the analyze endpoint. Replaces the direct
// Anthropic call that used to live in src/App.jsx.

export async function callAPI(pdfBase64, memo = "", depth, grade, prevSession = null) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64, depth, grade, prevSession, memo }),
  });

  if (!res.ok) {
    let errBody;
    try { errBody = await res.json(); } catch { errBody = {}; }
    throw new Error(errBody.error || `API_ERROR: ${res.status}`);
  }

  return res.json();
}
```

This function has the **exact same signature** as the current
`callAPI` in `src/App.jsx` (line 322 area). All call sites in App.jsx
work without modification — we just import from `lib/api.js` instead.

## 6. App.jsx changes

Minimal — just remove the inline `callAPI` definition and import from
the new module. The `buildSystemPrompt` function and the system-prompt
related constants (or at least the strings used there) become
**server-only** and can be deleted from App.jsx.

```jsx
// Top of src/App.jsx
import { callAPI } from "./lib/api";

// Delete:
// - buildSystemPrompt function
// - the inline callAPI function
// - DEPTHS[].instruction values (only needed server-side now)
//   — keep DEPTHS[].label and .desc for UI display

// All call sites of callAPI(...) work as-is.
```

## 7. Deploy & rotate procedure (CRITICAL — order matters)

**Wrong order = production goes down or stays insecure.** Follow
exactly.

### Step A — Pre-deploy local verification
1. Implement `api/analyze.js`, `src/lib/api.js`, and App.jsx changes
   per §4–§6.
2. Add `ANTHROPIC_API_KEY=<current-old-key>` to `.env` (alongside
   the existing `VITE_ANTHROPIC_API_KEY`). Yes, both temporarily.
3. Run `vercel dev` (NOT `npm run dev`) so the function actually runs
   locally. (`npm run dev` only runs the Vite frontend.)
4. Verify a real PDF upload works end-to-end: open DevTools Network
   tab and confirm the request goes to `localhost:3000/api/analyze`,
   NOT to `api.anthropic.com`.

### Step B — Configure Vercel project env vars
1. In Vercel dashboard → Settings → Environment Variables:
   - Add `ANTHROPIC_API_KEY` = current key value, scope: Production +
     Preview + Development.
   - **Leave** `VITE_ANTHROPIC_API_KEY` for now (will remove in Step E).
2. Commit and push.
3. Wait for Vercel to redeploy.

### Step C — Verify production proxy works
1. Visit `https://koe-wo-dasu.vercel.app/app/`.
2. Upload a sample PDF.
3. DevTools Network tab: request goes to `koe-wo-dasu.vercel.app/api/analyze`,
   NOT `api.anthropic.com`.
4. Verify analysis result returns correctly.
5. View page source: confirm `sk-ant-` does NOT appear in any bundled
   JS. Use DevTools → Sources → search across all loaded files.

### Step D — Rotate the key
1. In Anthropic console (https://console.anthropic.com/settings/keys):
   - Create a new API key. Copy it.
   - **Do not delete the old key yet.**
2. In Vercel dashboard → Settings → Environment Variables:
   - Update `ANTHROPIC_API_KEY` to the new key value.
3. Vercel auto-redeploys.
4. Verify production still works (upload a PDF, check it returns).

### Step E — Revoke the old key + cleanup
1. In Anthropic console: **revoke the old key**. (This is the moment
   the leaked key becomes useless.)
2. In Vercel dashboard → Settings → Environment Variables:
   - **Delete** `VITE_ANTHROPIC_API_KEY` from all environments.
3. In repo: edit `.env` to remove `VITE_ANTHROPIC_API_KEY`. Update
   `.env.example` accordingly. Commit and push.
4. Verify production still works.

### Step F — Optional: scrub git history
The old key is in git history (in `.env`). Even though it's revoked
and useless, scrubbing is good hygiene. Use BFG Repo-Cleaner or
`git filter-repo`. Since the key is revoked, this is low-priority.

## 8. Testing & verification

After Step E:

- [ ] Upload a PDF on production — works
- [ ] DevTools Network tab — only request to `/api/analyze`, never to
  `api.anthropic.com`
- [ ] DevTools Sources → search all bundled JS for `sk-ant-` — zero
  matches
- [ ] DevTools Sources → search all bundled JS for `anthropic-dangerous-direct-browser-access`
  — zero matches (this header was a tell-tale of direct browser calls)
- [ ] Try POST `/api/analyze` from a non-allowed origin (use `curl`
  with `Origin: https://example.com`) — returns 403
- [ ] Try GET `/api/analyze` — returns 405
- [ ] Try POST with empty body — returns 400
- [ ] Try POST with 50MB pdfBase64 — returns 413
- [ ] Anthropic console — confirm new key shows usage, old key shows
  no further usage after revocation timestamp

## 9. Documentation updates

After the fix ships, update:

- `CLAUDE.md` lines 49–50, 64, 70: remove "intentionally client-side"
  and "backend migration is a planned future phase" — describe the new
  proxy architecture.
- `legal/privacy-policy-ja.md`: the data flow description (Section 5.1)
  is unaffected because the user's PDF still goes to Anthropic, just
  via our server. The disclosure remains accurate. **No change needed.**
- `tasks/todo.md` Phase 3 #10: mark the API key item as completed,
  reduce the rest of Phase 3 to a smaller scope.

## 10. Out of scope (follow-ups, not blocking this fix)

- **Rate limiting** at the function level. Recommend Upstash Redis +
  `@upstash/ratelimit` (free tier: 10k commands/day, no credit card).
  Implementation: ~20 lines added to `api/analyze.js`. Add as a
  separate task once we have analytics data on actual request volume.
- **Auth & per-user request signing**. Currently anyone with a browser
  can POST to `/api/analyze`. The Origin check prevents direct curl
  abuse but a determined attacker could spoof it. Real defense requires
  user accounts (planned with Stripe Webhook integration).
- **Stripe Webhook for premium verification**. Currently `isPremium`
  is a client-side toggle. Server-side verification is part of the
  larger backend migration but not blocking the security fix.
- **Move FREE_LIMIT enforcement server-side**. Currently it's a
  localStorage counter that any user can edit. Real enforcement
  requires the same auth work above.

These are real concerns but **not gate-blocking the security fix**.
The current spend cap protects against unbounded abuse during this
window.

## 11. Coordination with other in-flight work

- **Phase A (landing redesign)**: independent. Can ship in parallel.
- **Phase B (app redesign)**: **must wait for this fix**. Phase B
  touches `src/App.jsx` heavily. Doing security fix first means Phase B
  refactor incorporates `lib/api.js` from day one, avoiding rework.
- **GA4 implementation**: already shipped, unaffected.

Recommended sequence:
1. **NOW**: Security fix (this spec) — Claude Code work
2. **AFTER security fix lands**: Phase B (app redesign)

## 12. Claude Code handoff prompt (copy-paste)

```
Anthropic API キーの本番バンドルからの露出を即修正します。仕様書は

  specs/api-key-security-fix.md

にまとめてあります。最初に頭から最後まで読んでから着手してください。
特に §7 のデプロイ手順は順序が重要で、間違えると本番が止まるか、
鍵漏洩が解決しません。

実装の流れ：

1. §4 のコードに従って api/analyze.js を新規作成
   - buildSystemPrompt のロジックを src/App.jsx から移植
     （DEPTHS[].instruction と GRADE_INSTRUCTIONS は server-only にする）
   - CORS / method check / body validation を §4 通り実装
   - sizeLimit を 15mb に設定

2. src/lib/api.js を新規作成（§5 のコード通り）

3. src/App.jsx を修正
   - インラインの callAPI 関数を削除
   - buildSystemPrompt 関数を削除
   - DEPTHS[].instruction / GRADE_INSTRUCTIONS を削除
     （UI 表示には .label と .desc のみあれば足りる）
   - import { callAPI } from "./lib/api"; を追加
   - 全 callAPI 呼び出し箇所はそのまま動くこと（シグネチャ無変更）

4. .env と .env.example を更新
   - ANTHROPIC_API_KEY を追加（VITE_ プレフィックスなし）
   - VITE_ANTHROPIC_API_KEY は §7 の Step E まで残す

5. ローカル検証（§7 Step A）
   - vercel dev で起動（npm run dev は Vite フロントだけなのでダメ）
   - DevTools Network タブで /api/analyze に POST されることを確認
   - api.anthropic.com への直接呼び出しが消えていることを確認

6. コミット
   メッセージ例：
   "feat(api): proxy Anthropic API through Vercel Function

   - Add api/analyze.js Serverless Function (CORS, validation, system prompt)
   - Move callAPI from src/App.jsx to src/lib/api.js (now hits /api/analyze)
   - Remove buildSystemPrompt and *_INSTRUCTIONS from client bundle
   - Add ANTHROPIC_API_KEY env var (server-only, no VITE_ prefix)
   - Keep VITE_ANTHROPIC_API_KEY temporarily for rollout (removed in
     follow-up commit per specs/api-key-security-fix.md §7 Step E)

   See specs/api-key-security-fix.md for the full deploy + rotate
   procedure that Mark must run after this commit lands."

7. プッシュしたら Mark に「§7 Step B 以降をお願いします」と
   伝えてください。Step B〜E は Vercel ダッシュボードと Anthropic
   コンソールでの手作業なので Claude Code 側ではできません。

8. 検証は §8 のチェックリスト全項目を満たすことを Mark が確認します。

注意点：
- VITE_ プレフィックスのある env 変数は本番ビルドに inline されます。
  新しい ANTHROPIC_API_KEY には絶対 VITE_ を付けないでください。
- api/ ディレクトリは Vercel が自動でサーバーレス関数として扱うので、
  vite.config.js の修正は不要です。
- localStorage キー、Anthropic API のリクエスト形状（model 名・
  message shape）は一切変更しないでください。
- Phase B（app redesign）はこの修正が本番デプロイ＆鍵ローテーション
  完了するまで着手しないでください。マージコンフリクト回避のためです。
```
