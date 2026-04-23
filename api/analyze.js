// Vercel Serverless Function — proxies Anthropic Messages API.
// Hides the API key, validates origin/method/body, returns parsed JSON.
// See specs/api-key-security-fix.md §4 for rationale.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2000;

const ALLOWED_ORIGINS = new Set([
  "https://koe-wo-dasu.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
]);

// Hard cap on PDF base64 size (~10MB raw → ~13.5MB base64).
const MAX_PDF_BASE64_BYTES = 14 * 1024 * 1024;

const DEPTH_INSTRUCTIONS = {
  surface: {
    label: "授業内",
    instruction:
      "・資料に書かれている内容の範囲内だけで質問・発言を作ること\n・先生の個人的な経験・意見・私生活には一切触れないこと\n・「この図の意味は？」「この用語の定義は？」など授業の理解を深める問いに絞ること",
  },
  applied: {
    label: "応用・社会",
    instruction:
      "・授業内容を現実社会・時事問題・他の授業と結びつける質問・発言を含めること\n・「これは〇〇の問題とどう関係しますか」など応用的な問いを優先すること\n・先生の専門的見解を引き出す質問も含めてよいが、私生活には踏み込まないこと",
  },
  personal: {
    label: "個人的",
    instruction:
      "・先生自身の研究背景・実体験・個人的な見解を引き出す質問を積極的に含めること\n・「先生はこのテーマをどう思いますか」など先生との距離を縮める問いを優先すること\n・授業後や廊下での会話のきっかけにもなるような、先生に「覚えてもらえる」発言を意識すること",
  },
};

const GRADE_INSTRUCTIONS = {
  freshman: "・専門用語は避け、平易な言葉で表現すること\n・内容への理解を深めようとする素直な疑問を優先すること",
  senior: "・ある程度の専門知識を前提にした問いを含めること\n・実社会や他の授業との接続を意識した発言を含めること",
  grad: "・先行研究や理論的背景に踏み込んだ問いを含めること\n・批判的・分析的な視点からの発言を積極的に含めること",
};

function buildSystemPrompt({ depth, grade, prevSession, hasMemo }) {
  const depthObj = DEPTH_INSTRUCTIONS[depth] || DEPTH_INSTRUCTIONS.applied;
  const prev = prevSession
    ? `\n【前回の授業内容（第${prevSession.sessionNo}回：${prevSession.topic}）】\n「前回学んだ${prevSession.topic}と関連して」「先週の内容を踏まえると」のような形で接続する発言・質問を積極的に生成してください。\n${Object.entries(prevSession.cards || {})
        .flatMap(([, items]) => (items || []).map((c) => `・${c.text}`))
        .join("\n")}`
    : "";
  return `あなたは大学の授業における対話促進の専門家です。日本の大学では学生が発言を躊躇することが多いという課題があります。\n\n提供された授業資料${hasMemo ? "と講義中のメモ" : ""}を読み、学生が授業中に使えるヒントを以下の3カテゴリでそれぞれ3〜4個生成してください。\n${hasMemo ? "講義メモがある場合は優先的に反映してください。\n" : ""}必ずJSON形式のみで返答してください。前置き不要。\n\n{\n  "topic": "この資料の授業トピック（20字以内）",\n  "subjectName": "授業科目名の推定（10〜15字以内）",\n  "question": [{ "text": "先生に聞ける質問文（自然な口語で）", "hint": "なぜこれを聞くと良いか（30字以内）" }],\n  "comment": [{ "text": "授業中に言える発言例（自然な口語で）", "hint": "どんな効果があるか（30字以内）" }],\n  "deepdive": [{ "text": "議論を深める問いかけや視点（自然な口語で）", "hint": "どんな議論が生まれるか（30字以内）" }]\n}\n${prev}\n【踏み込み度：${depthObj.label}】\n${depthObj.instruction}\n\n【対象学年】\n${GRADE_INSTRUCTIONS[grade]}`;
}

export default async function handler(req, res) {
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

  const hasMemo = typeof memo === "string" && memo.trim().length > 0;
  const systemPrompt = buildSystemPrompt({ depth, grade, prevSession, hasMemo });

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
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              {
                type: "text",
                text: hasMemo
                  ? `この授業資料を分析して学生向けの発言ヒントを生成してください。\n\n【講義メモ】\n${memo}`
                  : "この授業資料を分析して学生向けの発言ヒントを生成してください。",
              },
            ],
          },
        ],
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
  const content = json?.content?.find?.((b) => b.type === "text")?.text || json?.content?.[0]?.text;
  if (!content || !content.trim()) {
    return res.status(502).json({ error: "EMPTY_RESPONSE" });
  }

  const cleaned = content.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return res.status(502).json({ error: "PARSE_ERROR" });
  }

  return res.status(200).json(parsed);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};
