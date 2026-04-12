import { useState, useRef, useCallback, useEffect } from "react";

// ─── デザイントークン ─────────────────────────────────────
const T = {
  bg:          "#F7F6FF",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F0EFF8",
  sidebar:     "#1A1830",
  sidebarHov:  "#2D2A4A",
  sidebarSel:  "#6C5CE7",
  border:      "#E2E0F0",
  text:        "#1A1830",
  textSub:     "#6B6880",
  textHint:    "#9B98AD",
  purple:      "#6C5CE7",
  purpleLight: "#EEEDFE",
  purpleText:  "#3C3489",
  radius:      "14px",
  radiusSm:    "10px",
  radiusPill:  "999px",
};

const CARD_TYPES = {
  question: { label: "質問する", icon: "?",  bg: "#E6F1FB", border: "#B5D4F4", text: "#042C53", accent: "#185FA5", hintBorder: "#B5D4F4" },
  comment:  { label: "発言する", icon: "◎", bg: "#EAF3DE", border: "#C0DD97", text: "#173404", accent: "#3B6D11", hintBorder: "#C0DD97" },
  deepdive: { label: "深掘りする", icon: "↓", bg: "#EEEDFE", border: "#CECBF6", text: "#26215C", accent: "#534AB7", hintBorder: "#CECBF6" },
};

const DEPTHS = [
  { value: "surface",  label: "授業内",   desc: "資料の内容だけに絞った安全な質問・発言",       instruction: "・資料に書かれている内容の範囲内だけで質問・発言を作ること\n・先生の個人的な経験・意見・私生活には一切触れないこと\n・「この図の意味は？」「この用語の定義は？」など授業の理解を深める問いに絞ること" },
  { value: "applied",  label: "応用・社会", desc: "時事・他分野・実社会との接続に踏み込む",     instruction: "・授業内容を現実社会・時事問題・他の授業と結びつける質問・発言を含めること\n・「これは〇〇の問題とどう関係しますか」など応用的な問いを優先すること\n・先生の専門的見解を引き出す質問も含めてよいが、私生活には踏み込まないこと" },
  { value: "personal", label: "個人的",   desc: "先生の経験・研究背景・私見を引き出す",        instruction: "・先生自身の研究背景・実体験・個人的な見解を引き出す質問を積極的に含めること\n・「先生はこのテーマをどう思いますか」など先生との距離を縮める問いを優先すること\n・授業後や廊下での会話のきっかけにもなるような、先生に「覚えてもらえる」発言を意識すること" },
];

const GRADES = [
  { value: "freshman", label: "学部1・2年" },
  { value: "senior",   label: "学部3・4年" },
  { value: "grad",     label: "大学院生" },
];

const GRADE_INSTRUCTIONS = {
  freshman: "・専門用語は避け、平易な言葉で表現すること\n・内容への理解を深めようとする素直な疑問を優先すること",
  senior:   "・ある程度の専門知識を前提にした問いを含めること\n・実社会や他の授業との接続を意識した発言を含めること",
  grad:     "・先行研究や理論的背景に踏み込んだ問いを含めること\n・批判的・分析的な視点からの発言を積極的に含めること",
};

const STORAGE_KEY      = "lecture-voice:subjects-v2";
const USAGE_KEY        = "lecture-voice:usage";
const FREE_LIMIT       = 5;
const ONBOARD_KEY      = "lecture-voice:onboarded";
const loadOnboarded = async () => { try { const r = JSON.parse(localStorage.getItem(ONBOARD_KEY) || "null"); return !!r; } catch { return false; } };
const markOnboarded = async () => { try { localStorage.setItem(ONBOARD_KEY, "true"); } catch {} };

const loadSubjects = async () => { try { const r = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return r ? r : []; } catch { return []; } };
const saveSubjects = async (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} };

// 利用カウント: { count: number, yearMonth: "2025-04" }
const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

const loadUsage = async () => {
  try {
    const r = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
    if (!r) return { count: 0, yearMonth: currentYearMonth() };
    const u = r;
    // 月が変わったらリセット
    if (u.yearMonth !== currentYearMonth()) return { count: 0, yearMonth: currentYearMonth() };
    return u;
  } catch { return { count: 0, yearMonth: currentYearMonth() }; }
};

const incrementUsage = async (current) => {
  const next = { count: current.count + 1, yearMonth: currentYearMonth() };
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(next)); } catch {}
  return next;
};

const buildSystemPrompt = (hasMemo, depth, grade, prevSession = null) => {
  const depthObj = DEPTHS.find((d) => d.value === depth) || DEPTHS[1];
  const prev = prevSession ? `\n【前回の授業内容（第${prevSession.sessionNo}回：${prevSession.topic}）】\n「前回学んだ${prevSession.topic}と関連して」「先週の内容を踏まえると」のような形で接続する発言・質問を積極的に生成してください。\n${Object.entries(prevSession.cards).flatMap(([,items]) => items.map((c) => `・${c.text}`)).join("\n")}` : "";
  return `あなたは大学の授業における対話促進の専門家です。日本の大学では学生が発言を躊躇することが多いという課題があります。\n\n提供された授業資料${hasMemo ? "と講義中のメモ" : ""}を読み、学生が授業中に使えるヒントを以下の3カテゴリでそれぞれ3〜4個生成してください。\n${hasMemo ? "講義メモがある場合は優先的に反映してください。\n" : ""}必ずJSON形式のみで返答してください。前置き不要。\n\n{\n  "topic": "この資料の授業トピック（20字以内）",\n  "subjectName": "授業科目名の推定（10〜15字以内）",\n  "question": [{ "text": "先生に聞ける質問文（自然な口語で）", "hint": "なぜこれを聞くと良いか（30字以内）" }],\n  "comment": [{ "text": "授業中に言える発言例（自然な口語で）", "hint": "どんな効果があるか（30字以内）" }],\n  "deepdive": [{ "text": "議論を深める問いかけや視点（自然な口語で）", "hint": "どんな議論が生まれるか（30字以内）" }]\n}\n${prev}\n【踏み込み度：${depthObj.label}】\n${depthObj.instruction}\n\n【対象学年】\n${GRADE_INSTRUCTIONS[grade]}`;
};

// ─── スタイルヘルパー ─────────────────────────────────────
const btn  = (x={}) => ({ fontFamily:"inherit", cursor:"pointer", borderRadius:T.radiusSm, fontSize:"13px", padding:"7px 16px", border:`1px solid ${T.border}`, background:T.surface, color:T.text, transition:"all 0.15s", ...x });
const btnP = (x={}) => btn({ background:T.purple, color:"#fff", border:"none", fontWeight:"500", ...x });
const bdg  = (bg, color, x={}) => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:T.radiusPill, background:bg, color, fontSize:"11px", fontWeight:"500", ...x });

// ─── カード一覧（解析結果・履歴閲覧で共用） ───────────────
function CardView({ result, activeType, setActiveType, copied, onCopy, isPremium, onUpgrade, memo, useRef_, refSessId, refSubj, refSess, savedMsg, onSave, onNewFile, depth, grade, setDepth, setGrade, onRegen, memoInput, setMemoInput, memoLoading, memoError, onApplyMemo, readOnly = false }) {
  const typeInfo = CARD_TYPES[activeType];
  const cards    = result?.[activeType] || [];

  const exportTxt = () => {
    const tabLabel   = CARD_TYPES[activeType].label;
    const depthLabel = DEPTHS.find((d) => d.value === depth)?.label || "";
    const gradeLabel = GRADES.find((g) => g.value === grade)?.label || "";
    const lines = [
      `■ ${result.topic}`,
      `踏み込み度：${depthLabel}　対象：${gradeLabel}`,
      `カテゴリ：${tabLabel}`,
      `出力日：${new Date().toLocaleDateString("ja-JP")}`,
      "",
      ...cards.map((c, i) => `【${i + 1}】${c.text}\n　💡 ${c.hint}\n`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `声を出す_${result.topic}_${tabLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SegCtrl = ({ items, value, onChange, accent=T.purple }) => (
    <div style={{ display:"flex", background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"4px", gap:"3px" }}>
      {items.map((it) => (
        <button key={it.value} onClick={() => !readOnly && onChange(it.value)}
          style={{ flex:1, padding:"6px 4px", border:"none", borderRadius:"8px", fontSize:"12px", fontFamily:"inherit", cursor: readOnly ? "default" : "pointer", transition:"all 0.15s", fontWeight: value===it.value ? "500":"400", background: value===it.value ? T.surface:"transparent", color: value===it.value ? accent:T.textSub, boxShadow: value===it.value ? "0 1px 4px rgba(0,0,0,0.1)":"none" }}>
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* トピックブロック */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:"16px 20px", marginBottom:"20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"12px", flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"4px" }}>{readOnly ? "保存済み授業" : "Today's Topic"}</div>
            <div style={{ fontSize:"20px", fontWeight:"700", color:T.text, marginBottom:"8px" }}>{result.topic}</div>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
              {memo && !readOnly && <span style={bdg("#EAF3DE","#27500A")}>✓ 講義メモ反映済み</span>}
              {useRef_ && refSessId && !readOnly && <span style={bdg(T.purpleLight,T.purpleText)}>↩ 前回参照済み</span>}
              <span style={bdg(T.surfaceAlt,T.textSub)}>{DEPTHS.find((d)=>d.value===depth)?.label}</span>
              <span style={bdg(T.surfaceAlt,T.textSub)}>{GRADES.find((g)=>g.value===grade)?.label}</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {!readOnly && (
              <>
                <button onClick={onSave} style={savedMsg ? btnP({ fontSize:"12px", background:"#3B6D11" }) : btn({ fontSize:"12px" })}>{savedMsg ? "✓ 保存しました" : "授業を保存"}</button>
                <button onClick={onNewFile} style={btn({ fontSize:"12px" })}>別の資料を読む</button>
              </>
            )}
            <button onClick={exportTxt} style={btn({ fontSize:"12px" })} title="表示中のタブをテキストで保存">↓ テキスト出力</button>
          </div>
        </div>
      </div>

      {/* 踏み込み度・学年（readOnlyは非操作） */}
      {!readOnly && (
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", marginBottom:"6px", textTransform:"uppercase" }}>踏み込み度</div>
            <SegCtrl items={DEPTHS.map((d)=>({value:d.value,label:d.label}))} value={depth} onChange={(v)=>{setDepth(v); onRegen(v,grade);}} />
            <div style={{ fontSize:"11px", color:T.textHint, marginTop:"5px" }}>{DEPTHS.find((d)=>d.value===depth)?.desc}</div>
          </div>
          <div>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", marginBottom:"6px", textTransform:"uppercase" }}>対象学年</div>
            <SegCtrl items={GRADES} value={grade} onChange={(v)=>{setGrade(v); onRegen(depth,v);}} />
          </div>
        </div>
      )}

      {/* タブ */}
      <div style={{ display:"flex", background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"4px", gap:"3px", marginBottom:"16px" }}>
        {Object.entries(CARD_TYPES).map(([key,val]) => (
          <button key={key} onClick={() => setActiveType(key)}
            style={{ flex:1, padding:"8px 4px", border:"none", borderRadius:"8px", fontSize:"13px", fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s", fontWeight: activeType===key ? "500":"400", background: activeType===key ? T.surface:"transparent", color: activeType===key ? CARD_TYPES[key].accent:T.textSub, boxShadow: activeType===key ? "0 1px 4px rgba(0,0,0,0.1)":"none" }}>
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* カード */}
      <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"24px" }}>
        {cards.map((card, i) => {
          const ck = `${activeType}-${i}`;
          const isCopied = copied[ck];
          return (
            <div key={i} className="card-hover" style={{ background:typeInfo.bg, border:`1px solid ${typeInfo.border}`, borderRadius:T.radius, padding:"16px 18px", position:"relative" }}>
              <div style={{ position:"absolute", top:"14px", right:"14px", width:"22px", height:"22px", borderRadius:"50%", background:typeInfo.accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:"11px", fontWeight:"600" }}>{i+1}</div>
              <div style={{ fontSize:"14px", lineHeight:"1.75", color:typeInfo.text, paddingRight:"32px", marginBottom:"10px" }}>{card.text}</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:"10px", borderTop:`1px solid ${typeInfo.hintBorder}`, gap:"8px" }}>
                <div style={{ fontSize:"11px", color:typeInfo.accent, fontWeight:"500" }}>💡 {card.hint}</div>
                <button className="copy-btn" onClick={() => onCopy(card.text, ck)}
                  style={{ flexShrink:0, padding:"4px 10px", border:"none", borderRadius:T.radiusSm, background: isCopied ? typeInfo.accent : `${typeInfo.accent}20`, color: isCopied ? "#fff":typeInfo.accent, fontSize:"11px", cursor:"pointer", fontFamily:"inherit", fontWeight:"500", transition:"all 0.15s", whiteSpace:"nowrap" }}>
                  {isCopied ? "✓ コピー済み" : "コピー"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* プレミアム：講義メモ（readOnly時は非表示） */}
      {!readOnly && (
        <div style={{ border:`1px solid ${isPremium ? T.purple : T.border}`, borderRadius:T.radius, overflow:"hidden", marginBottom:"20px" }}>
          <div style={{ background: isPremium ? T.purpleLight : T.surfaceAlt, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:"13px", fontWeight:"500", color: isPremium ? T.purpleText:T.textSub, display:"flex", alignItems:"center", gap:"6px" }}>
              <span>★</span> 講義メモを追加して再生成
            </div>
            {!isPremium && <span style={bdg(T.purple,"#fff",{fontSize:"11px"})}>プレミアム限定</span>}
          </div>
          <div style={{ padding:"16px", background:T.surface }}>
            {isPremium ? (
              <>
                <p style={{ fontSize:"12px", color:T.textSub, marginBottom:"10px", lineHeight:"1.6" }}>講義中に先生が話した内容・板書・気になったことを入力すると、それに対応した発言ヒントを再生成します。</p>
                <textarea value={memoInput} onChange={(e)=>setMemoInput(e.target.value)}
                  placeholder={"例：\n・先生が「日本の少子化は2040年に加速する」と言っていた\n・グループワークで「地方移住」の話題が出た"}
                  style={{ width:"100%", minHeight:"90px", padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:T.radiusSm, fontFamily:"inherit", fontSize:"13px", lineHeight:"1.7", background:T.surfaceAlt, color:T.text, resize:"vertical", boxSizing:"border-box" }} />
                {memoError && <div style={{ color:"#A32D2D", fontSize:"12px", marginTop:"6px" }}>{memoError}</div>}
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"10px" }}>
                  <button onClick={onApplyMemo} disabled={memoLoading || !memoInput.trim()}
                    style={btnP({ opacity: memoLoading || !memoInput.trim() ? 0.5:1, cursor: memoLoading || !memoInput.trim() ? "not-allowed":"pointer", display:"flex", alignItems:"center", gap:"6px" })}>
                    {memoLoading && <div style={{ width:"12px", height:"12px", border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />}
                    {memoLoading ? "再生成中..." : "メモを反映して再生成"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"12px 0" }}>
                <div style={{ fontSize:"28px", marginBottom:"8px" }}>🔒</div>
                <p style={{ fontSize:"13px", color:T.textSub, lineHeight:"1.7", marginBottom:"12px" }}>講義中に追加された情報をもとに<br/>発言ヒントをリアルタイムで更新できます。</p>
                <button onClick={()=>onUpgrade()} style={btnP()}>★ プレミアムにアップグレード</button>
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize:"11px", color:T.textHint, textAlign:"center", lineHeight:"1.6" }}>これらはあくまでヒントです。自分の言葉でアレンジして使ってください。</p>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────
export default function App() {
  const [step, setStep]           = useState("upload"); // upload | loading | result
  const [historyView, setHistoryView] = useState(null); // { subjId, sessId } | null  ← 履歴閲覧モード
  const [fileName, setFileName]   = useState("");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [activeType, setActiveType] = useState("question");
  const [dragOver, setDragOver]   = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [memo, setMemo]           = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState("");
  const [depth, setDepth]         = useState("applied");
  const [grade, setGrade]         = useState("senior");
  const [copied, setCopied]       = useState({});
  const [subjects, setSubjects]   = useState([]);
  const [subjLoaded, setSubjLoaded] = useState(false);
  const [usage, setUsage]         = useState({ count: 0, yearMonth: currentYearMonth() });
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTargetSubjId, setSaveTargetSubjId] = useState("__new__");
  const [newSubjName, setNewSubjName] = useState("");
  const [savedMsg, setSavedMsg]   = useState(false);
  // 決済モーダル
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // ★ Stripeの Payment Link URLをここに設定する
  const PAYMENT_LINK = "https://buy.stripe.com/test_8x2cMY7VzfEIc1D4aP18c00";
  // オンボーディング
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardStep, setOnboardStep]       = useState(0);
  const [refSubjId, setRefSubjId] = useState("");
  const [refSessId, setRefSessId] = useState("");
  const [useRef_, setUseRef_]     = useState(false);
  const [editingSubjId, setEditingSubjId] = useState(null);
  const [editingName, setEditingName]     = useState("");
  const [expandedSubjs, setExpandedSubjs] = useState({});
  const fileRef = useRef();

  useEffect(() => {
    loadSubjects().then((s) => { setSubjects(s); setSubjLoaded(true); });
    loadUsage().then((u) => { setUsage(u); setUsageLoaded(true); });
    loadOnboarded().then((done) => { if (!done) setShowOnboarding(true); });
  }, []);

  const getRefSession = () => {
    if (!useRef_ || !refSubjId || !refSessId) return null;
    return subjects.find((s) => s.id === refSubjId)?.sessions.find((s) => s.id === refSessId) || null;
  };

  const callAPI = async (base64, extraMemo="", d=depth, g=grade, prevSess=null) => {
    const hasMemo = extraMemo.trim().length > 0;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:2000,
        system: buildSystemPrompt(hasMemo,d,g,prevSess),
        messages:[{ role:"user", content:[
          { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } },
          { type:"text", text: hasMemo ? `この授業資料を分析して学生向けの発言ヒントを生成してください。\n\n【講義メモ】\n${extraMemo}` : "この授業資料を分析して学生向けの発言ヒントを生成してください。" },
        ]}],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(`API_ERROR: ${data.error?.message||res.status}`);
    const text = data.content?.find((b)=>b.type==="text")?.text||"";
    if (!text.trim()) throw new Error("EMPTY_RESPONSE");
    try { return JSON.parse(text.replace(/```json|```/g,"").trim()); } catch { throw new Error("PARSE_ERROR"); }
  };

  const handleError = (err, setter) => {
    const m = err.message||"";
    if (m.includes("EMPTY_RESPONSE"))   setter("資料のテキストを読み取れませんでした。スキャンPDFや画像PDFは対応が難しい場合があります。");
    else if (m.includes("PARSE_ERROR")) setter("応答の解析に失敗しました。資料が長すぎる可能性があります。10ページ以内の資料をお試しください。");
    else if (m.includes("API_ERROR"))   setter(`通信エラーが発生しました。（${m.replace("API_ERROR: ","")}）`);
    else setter("予期しないエラーが発生しました。もう一度お試しください。");
  };

  const analyze = async (file) => {
    // 無料枠チェック
    if (!isPremium && usage.count >= FREE_LIMIT) {
      setError(`今月の無料枠（${FREE_LIMIT}回）を使い切りました。プレミアムにアップグレードすると無制限で使えます。`);
      return;
    }
    setStep("loading"); setError(""); setHistoryView(null);
    try {
      const base64 = await new Promise((res,rej) => { const r=new FileReader(); r.onload=(e)=>res(e.target.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
      setPdfBase64(base64);
      const parsed = await callAPI(base64,"",depth,grade,getRefSession());
      // 成功したらカウントを増やす
      const nextUsage = await incrementUsage(usage);
      setUsage(nextUsage);
      setResult(parsed); setMemo(""); setMemoInput(""); setCopied({});
      setNewSubjName(parsed.subjectName||""); setSaveTargetSubjId("__new__");
      setStep("result");
    } catch(err) { handleError(err,setError); setStep("upload"); }
  };

  const applyMemo = async () => {
    if (!memoInput.trim()||!pdfBase64) return;
    setMemoLoading(true); setMemoError("");
    try {
      const parsed = await callAPI(pdfBase64,memoInput,depth,grade,getRefSession());
      setResult(parsed); setMemo(memoInput); setMemoInput(""); setCopied({});
    } catch(err) { handleError(err,setMemoError); }
    finally { setMemoLoading(false); }
  };

  const regenerate = async (nd,ng) => {
    if (!pdfBase64) return;
    setStep("loading");
    try { const parsed=await callAPI(pdfBase64,memo,nd,ng,getRefSession()); setResult(parsed); setCopied({}); setStep("result"); }
    catch(err) { handleError(err,setError); setStep("result"); }
  };

  const confirmSave = async () => {
    if (!result) return;
    let updated=[...subjects]; let target;
    if (saveTargetSubjId==="__new__") {
      target={ id:`subj-${Date.now()}`, name:newSubjName.trim()||result.subjectName||"未分類", sessions:[] };
      updated=[target,...updated];
    } else { target=updated.find((s)=>s.id===saveTargetSubjId); if(!target) return; }
    const sess={ id:`sess-${Date.now()}`, sessionNo:target.sessions.length+1, topic:result.topic, savedAt:new Date().toLocaleDateString("ja-JP"), depth, grade, cards:{ question:result.question||[], comment:result.comment||[], deepdive:result.deepdive||[] } };
    updated=updated.map((s)=>s.id===target.id?{...s,sessions:[...s.sessions,sess]}:s);
    setSubjects(updated); await saveSubjects(updated);
    setShowSaveModal(false); setSavedMsg(true); setTimeout(()=>setSavedMsg(false),2500);
    // 新規科目なら展開
    setExpandedSubjs((p)=>({...p,[target.id]:true}));
  };

  const commitRename = async (id) => {
    const t=editingName.trim(); if(!t){setEditingSubjId(null);return;}
    const u=subjects.map((s)=>s.id===id?{...s,name:t}:s);
    setSubjects(u); await saveSubjects(u); setEditingSubjId(null);
  };

  const deleteSession = async (sid,sessId) => {
    const u=subjects.map((s)=>{ if(s.id!==sid) return s; const sessions=s.sessions.filter((ss)=>ss.id!==sessId).map((ss,i)=>({...ss,sessionNo:i+1})); return{...s,sessions}; }).filter((s)=>s.sessions.length>0);
    setSubjects(u); await saveSubjects(u);
    if(refSessId===sessId){setRefSessId("");setUseRef_(false);}
    if(historyView?.sessId===sessId) setHistoryView(null);
  };

  const handleFile = (file) => {
    if(!file||file.type!=="application/pdf"){setError("PDFファイルを選択してください。");return;}
    if(file.size>10*1024*1024){setError("ファイルサイズが大きすぎます。10MB以内のPDFをお試しください。");return;}
    setFileName(file.name); analyze(file);
  };

  const onDrop = useCallback((e)=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);},[depth,grade,useRef_,refSubjId,refSessId]);

  const copyCard = (text,key) => {
    navigator.clipboard.writeText(text).then(()=>{ setCopied((p)=>({...p,[key]:true})); setTimeout(()=>setCopied((p)=>({...p,[key]:false})),2000); });
  };

  const toggleSubj = (id) => setExpandedSubjs((p)=>({...p,[id]:!p[id]}));

  const openHistory = (subjId, sessId) => { setHistoryView({ subjId, sessId }); setActiveType("question"); setCopied({}); };

  // 履歴閲覧用データ
  const histSubj = historyView ? subjects.find((s)=>s.id===historyView.subjId) : null;
  const histSess = histSubj?.sessions.find((s)=>s.id===historyView.sessId);
  const histResult = histSess ? { topic:histSess.topic, ...histSess.cards } : null;

  // 参照用
  const refSubj = subjects.find((s)=>s.id===refSubjId);
  const refSess = refSubj?.sessions.find((s)=>s.id===refSessId);

  // ─── サイドバー ──────────────────────────────────────────
  const Sidebar = () => (
    <div style={{ width:"240px", minWidth:"240px", background:T.sidebar, display:"flex", flexDirection:"column", height:"100vh", position:"sticky", top:0, overflowY:"auto" }}>
      {/* ロゴ */}
      <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#fff", letterSpacing:"-0.02em" }}>声を出す。</div>
        <div style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginTop:"3px" }}>授業資料から、あなたの言葉を</div>
      </div>

      {/* 新規解析ボタン */}
      <div style={{ padding:"12px" }}>
        <button onClick={()=>{setStep("upload");setResult(null);setFileName("");setPdfBase64(null);setCopied({});setHistoryView(null);}}
          style={{ width:"100%", padding:"9px 0", borderRadius:T.radiusSm, background:T.purple, color:"#fff", border:"none", fontFamily:"inherit", fontSize:"13px", fontWeight:"500", cursor:"pointer" }}>
          ＋ 新しい資料を解析
        </button>
      </div>

      {/* プレミアムバッジ */}
      <div style={{ padding:"0 12px 12px" }}>
        {isPremium ? (
          <div style={{ padding:"7px 12px", borderRadius:T.radiusSm, background:"rgba(108,92,231,0.25)", color:T.purpleLight, fontSize:"12px", fontWeight:"500", textAlign:"center" }}>★ プレミアム会員</div>
        ) : (
          <button onClick={()=>setShowUpgradeModal(true)} style={{ width:"100%", padding:"7px 0", borderRadius:T.radiusSm, background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.6)", border:"1px solid rgba(255,255,255,0.12)", fontFamily:"inherit", fontSize:"12px", cursor:"pointer" }}>
            ★ プレミアムにアップグレード
          </button>
        )}
      </div>

      {/* 利用状況メーター（無料ユーザーのみ） */}
      {!isPremium && usageLoaded && (
        <div style={{ padding:"0 12px 14px" }}>
          <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:T.radiusSm, padding:"10px 12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"7px" }}>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)" }}>今月の解析回数</span>
              <span style={{ fontSize:"12px", fontWeight:"600", color: usage.count >= FREE_LIMIT ? "#F09595" : "rgba(255,255,255,0.75)" }}>
                {usage.count} / {FREE_LIMIT}
              </span>
            </div>
            {/* プログレスバー */}
            <div style={{ height:"4px", borderRadius:"2px", background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:"2px", transition:"width 0.4s ease",
                width: `${Math.min((usage.count / FREE_LIMIT) * 100, 100)}%`,
                background: usage.count >= FREE_LIMIT
                  ? "#E24B4A"
                  : usage.count >= FREE_LIMIT - 1
                    ? "#EF9F27"
                    : "#6C5CE7",
              }} />
            </div>
            {usage.count >= FREE_LIMIT && (
              <div style={{ fontSize:"10px", color:"#F09595", marginTop:"6px", lineHeight:"1.5" }}>
                翌月にリセットされます
              </div>
            )}
          </div>
        </div>
      )}

      {/* 科目ライブラリ */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 0 16px" }}>
        <div style={{ padding:"8px 16px 6px", fontSize:"11px", color:"rgba(255,255,255,0.35)", fontWeight:"500", letterSpacing:"0.08em", textTransform:"uppercase" }}>
          科目ライブラリ {subjLoaded && subjects.length===0 && <span style={{ fontSize:"10px" }}>（保存なし）</span>}
        </div>

        {subjects.map((subj) => {
          const isExpanded = expandedSubjs[subj.id];
          return (
            <div key={subj.id}>
              {/* 科目行 */}
              <div style={{ display:"flex", alignItems:"center", padding:"6px 8px 6px 16px", cursor:"pointer" }}
                onClick={()=>toggleSubj(subj.id)}>
                <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.3)", marginRight:"6px", transition:"transform 0.15s", display:"inline-block", transform: isExpanded?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                {editingSubjId===subj.id ? (
                  <input value={editingName} onChange={(e)=>setEditingName(e.target.value)}
                    onKeyDown={(e)=>{if(e.key==="Enter")commitRename(subj.id);if(e.key==="Escape")setEditingSubjId(null);}}
                    onClick={(e)=>e.stopPropagation()} autoFocus
                    style={{ flex:1, padding:"2px 6px", borderRadius:"6px", border:"1px solid rgba(108,92,231,0.6)", background:"rgba(255,255,255,0.1)", color:"#fff", fontFamily:"inherit", fontSize:"13px", outline:"none" }} />
                ) : (
                  <span style={{ flex:1, fontSize:"13px", color:"rgba(255,255,255,0.85)", fontWeight:"500", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{subj.name}</span>
                )}
                <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)", marginLeft:"4px" }}>{subj.sessions.length}</span>
                <button onClick={(e)=>{e.stopPropagation();setEditingSubjId(subj.id);setEditingName(subj.name);}}
                  style={{ marginLeft:"4px", padding:"2px 5px", border:"none", background:"transparent", color:"rgba(255,255,255,0.25)", cursor:"pointer", fontSize:"10px", borderRadius:"4px" }} title="名前を変更">✎</button>
              </div>

              {/* 回一覧 */}
              {isExpanded && subj.sessions.map((sess) => {
                const isActive = historyView?.sessId===sess.id;
                const isRef    = refSessId===sess.id && useRef_;
                return (
                  <div key={sess.id}
                    onClick={()=>openHistory(subj.id,sess.id)}
                    style={{ display:"flex", alignItems:"center", padding:"5px 10px 5px 32px", cursor:"pointer", background: isActive ? "rgba(108,92,231,0.35)" : "transparent", borderLeft: isActive ? `2px solid ${T.purple}` : "2px solid transparent", transition:"all 0.1s" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"12px", color: isActive ? "#fff" : "rgba(255,255,255,0.6)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <span style={{ color: isActive ? T.purpleLight : "rgba(108,92,231,0.7)", fontWeight:"600", marginRight:"5px", fontSize:"11px" }}>第{sess.sessionNo}回</span>
                        {sess.topic}
                      </div>
                      <div style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)", marginTop:"1px" }}>{sess.savedAt}</div>
                    </div>
                    <div style={{ display:"flex", gap:"4px", alignItems:"center", marginLeft:"4px" }}>
                      {isRef && <span style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"9px", background:"rgba(108,92,231,0.4)", color:T.purpleLight }}>参照中</span>}
                      <button onClick={(e)=>{e.stopPropagation();deleteSession(subj.id,sess.id);}}
                        style={{ padding:"2px 5px", border:"none", background:"transparent", color:"rgba(255,255,255,0.2)", cursor:"pointer", fontSize:"10px", borderRadius:"4px" }} title="削除">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── 保存モーダル ─────────────────────────────────────────
  const SaveModal = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,24,48,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"1rem" }}>
      <div style={{ background:T.surface, borderRadius:T.radius, padding:"24px", maxWidth:"400px", width:"100%", border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:"16px", fontWeight:"600", marginBottom:"4px" }}>授業を保存</div>
        <div style={{ fontSize:"12px", color:T.textSub, marginBottom:"16px" }}>今回：{result?.topic}</div>
        <div style={{ marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>科目に追加</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {subjects.map((s)=>(
              <button key={s.id} onClick={()=>setSaveTargetSubjId(s.id)}
                style={btn({ textAlign:"left", padding:"8px 12px", background: saveTargetSubjId===s.id?T.purpleLight:T.surfaceAlt, color: saveTargetSubjId===s.id?T.purpleText:T.text, border: saveTargetSubjId===s.id?`1px solid ${T.purple}`:"1px solid transparent", fontWeight: saveTargetSubjId===s.id?"500":"400" })}>
                {s.name} <span style={{ color:T.textHint, fontSize:"11px" }}>（第{s.sessions.length+1}回として追加）</span>
              </button>
            ))}
            <button onClick={()=>setSaveTargetSubjId("__new__")}
              style={btn({ textAlign:"left", padding:"8px 12px", background: saveTargetSubjId==="__new__"?T.purpleLight:T.surfaceAlt, color: saveTargetSubjId==="__new__"?T.purpleText:T.text, border: saveTargetSubjId==="__new__"?`1px solid ${T.purple}`:"1px solid transparent", fontWeight: saveTargetSubjId==="__new__"?"500":"400" })}>
              ＋ 新しい科目として登録
            </button>
          </div>
        </div>
        {saveTargetSubjId==="__new__" && (
          <div style={{ marginBottom:"16px" }}>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", marginBottom:"6px" }}>科目名（後から変更できます）</div>
            <input value={newSubjName} onChange={(e)=>setNewSubjName(e.target.value)}
              placeholder={result?.subjectName||"例：社会学概論"}
              style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:T.radiusSm, fontFamily:"inherit", fontSize:"13px", background:T.surfaceAlt, color:T.text, boxSizing:"border-box", outline:"none" }} />
            <div style={{ fontSize:"11px", color:T.textHint, marginTop:"4px" }}>AIの推定：「{result?.subjectName||"不明"}」</div>
          </div>
        )}
        <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
          <button onClick={()=>setShowSaveModal(false)} style={btn()}>キャンセル</button>
          <button onClick={confirmSave} style={btnP()}>保存する</button>
        </div>
      </div>
    </div>
  );


  // ─── オンボーディングモーダル ──────────────────────────────
  const ONBOARD_STEPS = [
    {
      icon: "📄",
      title: "PDFをアップロードするだけ",
      desc: "授業のレジュメ・スライド・配布資料をドロップするだけでOK。AIが内容を読み取り、その場で使える言葉を生成します。",
      visual: (
        <div style={{ background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"16px", marginTop:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 14px", background:T.surface, borderRadius:"10px", border:`1px solid ${T.border}` }}>
            <span style={{ fontSize:"20px" }}>📄</span>
            <div>
              <div style={{ fontSize:"13px", fontWeight:"500", color:T.text }}>社会学概論_第3回.pdf</div>
              <div style={{ fontSize:"11px", color:T.textHint }}>解析中...</div>
            </div>
            <div style={{ marginLeft:"auto", width:"16px", height:"16px", border:`2px solid ${T.purpleLight}`, borderTop:`2px solid ${T.purple}`, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
          </div>
        </div>
      ),
    },
    {
      icon: "💬",
      title: "3種類のヒントを使い分ける",
      desc: "生成されたヒントは用途別に3種類。授業の流れに合わせて切り替えてください。",
      visual: (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"16px" }}>
          {[
            { bg:"#E6F1FB", border:"#B5D4F4", text:"#042C53", accent:"#185FA5", label:"? 質問する", ex:"先生の研究でこのテーマに関わったことはありますか？" },
            { bg:"#EAF3DE", border:"#C0DD97", text:"#173404", accent:"#3B6D11", label:"◎ 発言する", ex:"SNSでの炎上も逸脱の一種と見ることができますか？" },
            { bg:"#EEEDFE", border:"#CECBF6", text:"#26215C", accent:"#534AB7", label:"↓ 深掘りする", ex:"前回の自己概念と今回の逸脱はどう繋がりますか？" },
          ].map((c, i) => (
            <div key={i} style={{ background:c.bg, border:`1px solid ${c.border}`, borderRadius:"10px", padding:"10px 14px" }}>
              <div style={{ fontSize:"10px", color:c.accent, fontWeight:"600", marginBottom:"4px" }}>{c.label}</div>
              <div style={{ fontSize:"12px", color:c.text, lineHeight:"1.6" }}>{c.ex}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: "🎚",
      title: "踏み込み度と履歴を活用する",
      desc: "授業内・応用・個人的の3段階で質問の深さを調整できます。また授業を科目・回ごとに保存すると、前回の内容を踏まえた発言を自動生成できます。",
      visual: (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginTop:"16px" }}>
          <div style={{ background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"10px 14px" }}>
            <div style={{ fontSize:"11px", color:T.textHint, marginBottom:"8px", fontWeight:"500" }}>踏み込み度</div>
            <div style={{ display:"flex", background:T.surface, borderRadius:"8px", padding:"3px", gap:"3px" }}>
              {["授業内","応用・社会","個人的"].map((l, i) => (
                <div key={i} style={{ flex:1, padding:"5px 4px", borderRadius:"6px", fontSize:"11px", textAlign:"center", background: i===1 ? T.purple:"transparent", color: i===1 ? "#fff":T.textSub, fontWeight: i===1 ? "500":"400" }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"10px 14px" }}>
            <div style={{ fontSize:"11px", color:T.textHint, marginBottom:"6px", fontWeight:"500" }}>科目ライブラリ（サイドバー）</div>
            {[["第1回","社会化と自己"],["第2回","逸脱と規範"]].map(([n,t],i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"4px 0", fontSize:"12px" }}>
                <span style={{ color:T.purple, fontWeight:"600", fontSize:"11px" }}>{n}</span>
                <span style={{ color:T.textSub }}>{t}</span>
                {i===1 && <span style={{ marginLeft:"auto", fontSize:"10px", padding:"1px 6px", borderRadius:"9px", background:T.purpleLight, color:T.purpleText }}>参照中</span>}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const closeOnboarding = async () => {
    await markOnboarded();
    setShowOnboarding(false);
    setOnboardStep(0);
  };

  const OnboardingModal = () => {
    const step = ONBOARD_STEPS[onboardStep];
    const isLast = onboardStep === ONBOARD_STEPS.length - 1;
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(14,13,26,0.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:400, padding:"1rem" }}>
        <div style={{ background:T.surface, borderRadius:"20px", maxWidth:"440px", width:"100%", border:`1px solid ${T.border}`, overflow:"hidden" }}>
          {/* プログレスバー */}
          <div style={{ height:"3px", background:T.surfaceAlt }}>
            <div style={{ height:"100%", background:T.purple, borderRadius:"3px", transition:"width 0.3s ease", width:`${((onboardStep + 1) / ONBOARD_STEPS.length) * 100}%` }} />
          </div>

          <div style={{ padding:"28px 28px 24px" }}>
            {/* ステップ番号 */}
            <div style={{ fontSize:"11px", color:T.textHint, marginBottom:"12px", letterSpacing:"0.06em" }}>
              {onboardStep + 1} / {ONBOARD_STEPS.length}
            </div>

            {/* アイコン＋タイトル */}
            <div style={{ fontSize:"32px", marginBottom:"10px" }}>{step.icon}</div>
            <div style={{ fontSize:"20px", fontWeight:"700", color:T.text, marginBottom:"10px", lineHeight:"1.3" }}>{step.title}</div>
            <div style={{ fontSize:"13px", color:T.textSub, lineHeight:"1.75" }}>{step.desc}</div>

            {/* ビジュアル */}
            {step.visual}

            {/* ナビゲーション */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"24px" }}>
              <button onClick={closeOnboarding}
                style={{ background:"transparent", border:"none", color:T.textHint, fontSize:"12px", cursor:"pointer", fontFamily:"inherit", padding:"4px 0" }}>
                スキップ
              </button>
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                {/* ドットインジケーター */}
                {ONBOARD_STEPS.map((_, i) => (
                  <div key={i} style={{ width: i===onboardStep ? "20px":"6px", height:"6px", borderRadius:"3px", background: i===onboardStep ? T.purple:T.border, transition:"all 0.2s" }} />
                ))}
              </div>
              <button
                onClick={() => { if (isLast) { closeOnboarding(); } else { setOnboardStep((s) => s + 1); } }}
                style={{ padding:"9px 20px", borderRadius:T.radiusSm, background:T.purple, color:"#fff", border:"none", fontSize:"13px", fontWeight:"500", cursor:"pointer", fontFamily:"inherit" }}>
                {isLast ? "始める →" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── 決済モーダル ─────────────────────────────────────────
  const UpgradeModal = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(14,13,26,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:"1rem" }}
      onClick={(e)=>{ if(e.target===e.currentTarget) setShowUpgradeModal(false); }}>
      <div style={{ background:T.surface, borderRadius:"20px", padding:"0", maxWidth:"460px", width:"100%", border:`1px solid ${T.border}`, overflow:"hidden" }}>

        {/* ヘッダー */}
        <div style={{ background:`linear-gradient(135deg, #1A1830 0%, #2D2A4A 100%)`, padding:"28px 28px 24px", position:"relative" }}>
          <button onClick={()=>setShowUpgradeModal(false)}
            style={{ position:"absolute", top:"16px", right:"16px", background:"rgba(255,255,255,0.1)", border:"none", color:"rgba(255,255,255,0.6)", width:"28px", height:"28px", borderRadius:"50%", cursor:"pointer", fontFamily:"inherit", fontSize:"14px" }}>✕</button>
          <div style={{ fontSize:"11px", color:T.purple, fontWeight:"600", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>プレミアムプラン</div>
          <div style={{ fontSize:"26px", fontWeight:"700", color:"#fff", marginBottom:"4px" }}>
            ¥980 <span style={{ fontSize:"14px", fontWeight:"400", color:"rgba(255,255,255,0.5)" }}>/ 月（税込）</span>
          </div>
          <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.45)" }}>いつでも解約可 · クレジットカード</div>
        </div>

        {/* 特典リスト */}
        <div style={{ padding:"24px 28px" }}>
          <div style={{ fontSize:"12px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"14px" }}>プレミアム限定の機能</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"24px" }}>
            {[
              { icon:"∞", label:"PDF解析 無制限", desc:"月5回の制限がなくなります" },
              { icon:"↩", label:"前回の授業を参照して生成", desc:"同じ科目の前回内容を踏まえた発言を生成" },
              { icon:"★", label:"講義メモを追加して再生成", desc:"授業中の板書・口頭説明を即座に反映" },
              { icon:"📚", label:"科目・回ごとの保存（無制限）", desc:"すべての授業履歴を蓄積できます" },
            ].map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"12px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:T.purpleLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0, color:T.purple, fontWeight:"600" }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"500", color:T.text, marginBottom:"2px" }}>{f.label}</div>
                  <div style={{ fontSize:"11px", color:T.textHint }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 比較表 */}
          <div style={{ background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"12px 16px", marginBottom:"20px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 80px", gap:"8px", fontSize:"11px" }}>
              <div style={{ color:T.textHint, fontWeight:"500" }}></div>
              <div style={{ color:T.textHint, textAlign:"center" }}>無料</div>
              <div style={{ color:T.purple, textAlign:"center", fontWeight:"600" }}>プレミアム</div>
              {[
                ["PDF解析", "月5回", "無制限"],
                ["前回参照", "✕", "✓"],
                ["講義メモ", "✕", "✓"],
                ["科目保存", "✕", "無制限"],
              ].map(([label, free, premium], i) => (
                <>
                  <div key={`l${i}`} style={{ color:T.textSub, fontSize:"12px", paddingTop:"4px" }}>{label}</div>
                  <div key={`f${i}`} style={{ color:T.textHint, textAlign:"center", paddingTop:"4px" }}>{free}</div>
                  <div key={`p${i}`} style={{ color:"#3B6D11", textAlign:"center", fontWeight:"500", paddingTop:"4px" }}>{premium}</div>
                </>
              ))}
            </div>
          </div>

          {/* CTAボタン */}
          <a href={STRIPE_PAYMENT_LINK} target="_blank" rel="noopener noreferrer"
            style={{ display:"block", width:"100%", padding:"14px", borderRadius:T.radiusSm, background:T.purple, color:"#fff", fontFamily:"inherit", fontSize:"14px", fontWeight:"600", textAlign:"center", textDecoration:"none", boxSizing:"border-box", transition:"background 0.2s" }}
            onMouseOver={(e)=>e.currentTarget.style.background="#8B7CF0"}
            onMouseOut={(e)=>e.currentTarget.style.background=T.purple}>
            Stripeで安全に決済する →
          </a>
          <p style={{ fontSize:"11px", color:T.textHint, textAlign:"center", marginTop:"10px", lineHeight:"1.6" }}>
            Stripeの安全な決済ページに移動します。<br/>
            決済完了後、サポートまでご連絡ください。
          </p>

          {/* デモ用：開発中のフラグ切り替えボタン */}
          <button onClick={()=>{ setIsPremium(true); setShowUpgradeModal(false); }}
            style={{ width:"100%", marginTop:"8px", padding:"8px", borderRadius:T.radiusSm, background:"transparent", border:`1px dashed ${T.border}`, color:T.textHint, fontSize:"11px", cursor:"pointer", fontFamily:"inherit" }}>
            ※ デモ：プレミアムを有効化（開発用）
          </button>
        </div>
      </div>
    </div>
  );

  // ─── 前回参照パネル（Upload画面内） ─────────────────────
  const RefPanel = () => (
    <div style={{ background:T.surface, border:`1px solid ${useRef_?T.purple:T.border}`, borderRadius:T.radius, overflow:"hidden", marginBottom:"16px" }}>
      <div onClick={()=>setUseRef_((v)=>!v)}
        style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", background: useRef_?T.purpleLight:"transparent" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", fontWeight:"500", color: useRef_?T.purpleText:T.text }}>
          <span>↩</span> 前の回の内容を参照して生成
        </div>
        <span style={bdg(useRef_?T.purple:T.surfaceAlt, useRef_?"#fff":T.textSub)}>
          {useRef_&&refSess ? `第${refSess.sessionNo}回参照中` : "オフ"}
        </span>
      </div>
      {useRef_ && (
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.border}` }}>
          {subjects.length===0 ? (
            <p style={{ fontSize:"12px", color:T.textSub, textAlign:"center", margin:0 }}>まだ保存された授業がありません。</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <div>
                <div style={{ fontSize:"11px", color:T.textHint, marginBottom:"6px", fontWeight:"500" }}>科目</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                  {subjects.map((s)=>(
                    <button key={s.id} onClick={()=>{setRefSubjId(s.id);setRefSessId("");}}
                      style={btn({ textAlign:"left", padding:"7px 12px", fontSize:"13px", background: refSubjId===s.id?T.purpleLight:T.surfaceAlt, color: refSubjId===s.id?T.purpleText:T.text, border: refSubjId===s.id?`1px solid ${T.purple}`:"1px solid transparent", fontWeight: refSubjId===s.id?"500":"400" })}>
                      {s.name} <span style={{ color:T.textHint, fontSize:"11px" }}>（{s.sessions.length}回分）</span>
                    </button>
                  ))}
                </div>
              </div>
              {refSubjId && (
                <div>
                  <div style={{ fontSize:"11px", color:T.textHint, marginBottom:"6px", fontWeight:"500" }}>参照する回</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                    {subjects.find((s)=>s.id===refSubjId)?.sessions.map((sess)=>(
                      <button key={sess.id} onClick={()=>setRefSessId(sess.id)}
                        style={btn({ textAlign:"left", padding:"7px 12px", fontSize:"13px", background: refSessId===sess.id?"#E6F1FB":T.surfaceAlt, color: refSessId===sess.id?"#042C53":T.text, border: refSessId===sess.id?"1px solid #185FA5":"1px solid transparent", fontWeight: refSessId===sess.id?"500":"400" })}>
                        <span style={{ color:T.purple, fontWeight:"600", marginRight:"6px" }}>第{sess.sessionNo}回</span>{sess.topic}
                        <span style={{ color:T.textHint, fontSize:"11px", marginLeft:"6px" }}>{sess.savedAt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {refSessId && (
                <div style={{ background:T.purpleLight, borderRadius:T.radiusSm, padding:"8px 12px", fontSize:"12px", color:T.purpleText, fontWeight:"500" }}>
                  ↩ 「{refSubj?.name} 第{refSess?.sessionNo}回：{refSess?.topic}」を前回として参照します
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── メインエリアのコンテンツ ────────────────────────────
  const MainContent = () => {
    // 履歴閲覧モード
    if (historyView && histResult) {
      return (
        <div style={{ padding:"24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"20px" }}>
            <span style={{ fontSize:"11px", color:T.textHint }}>
              {histSubj?.name} / 第{histSess?.sessionNo}回
            </span>
          </div>
          <CardView
            result={histResult} activeType={activeType} setActiveType={setActiveType}
            copied={copied} onCopy={copyCard} isPremium={isPremium} onUpgrade={()=>setShowUpgradeModal(true)}
            memo="" useRef_={false} refSessId="" refSubj={null} refSess={null}
            savedMsg={false} onSave={()=>{}} onNewFile={()=>{}}
            depth={histSess.depth} grade={histSess.grade}
            setDepth={()=>{}} setGrade={()=>{}} onRegen={()=>{}}
            memoInput="" setMemoInput={()=>{}} memoLoading={false} memoError="" onApplyMemo={()=>{}}
            readOnly={true}
          />
        </div>
      );
    }

    // アップロード画面
    if (step==="upload") return (
      <div style={{ padding:"24px", maxWidth:"640px" }}>
        <p style={{ fontSize:"13px", lineHeight:"1.8", color:T.textSub, marginBottom:"20px", padding:"12px 16px", background:T.surface, borderRadius:T.radius, border:`1px solid ${T.border}` }}>
          授業のレジュメや資料をアップロードすると、授業中に使える質問・発言・深掘りのヒントを生成します。
        </p>

        {/* 踏み込み度・学年 */}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", marginBottom:"6px", textTransform:"uppercase" }}>踏み込み度</div>
            <div style={{ display:"flex", background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"4px", gap:"3px" }}>
              {DEPTHS.map((d)=>(
                <button key={d.value} onClick={()=>setDepth(d.value)} title={d.desc}
                  style={{ flex:1, padding:"6px 4px", border:"none", borderRadius:"8px", fontSize:"12px", fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s", fontWeight: depth===d.value?"500":"400", background: depth===d.value?T.surface:"transparent", color: depth===d.value?T.purple:T.textSub, boxShadow: depth===d.value?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize:"11px", color:T.textHint, marginTop:"5px" }}>{DEPTHS.find((d)=>d.value===depth)?.desc}</div>
          </div>
          <div>
            <div style={{ fontSize:"11px", color:T.textHint, fontWeight:"500", letterSpacing:"0.06em", marginBottom:"6px", textTransform:"uppercase" }}>対象学年</div>
            <div style={{ display:"flex", background:T.surfaceAlt, borderRadius:T.radiusSm, padding:"4px", gap:"3px" }}>
              {GRADES.map((g)=>(
                <button key={g.value} onClick={()=>setGrade(g.value)}
                  style={{ flex:1, padding:"6px 4px", border:"none", borderRadius:"8px", fontSize:"12px", fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s", fontWeight: grade===g.value?"500":"400", background: grade===g.value?T.surface:"transparent", color: grade===g.value?T.purple:T.textSub, boxShadow: grade===g.value?"0 1px 4px rgba(0,0,0,0.1)":"none" }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {subjLoaded && subjects.reduce((n,s)=>n+s.sessions.length,0)>0 && <RefPanel />}

        {/* 利用制限到達時のバナー */}
        {!isPremium && usage.count >= FREE_LIMIT && (
          <div style={{ background:"#FCEBEB", border:"1px solid #F7C1C1", borderRadius:T.radius, padding:"16px 20px", marginBottom:"16px" }}>
            <div style={{ fontSize:"14px", fontWeight:"600", color:"#A32D2D", marginBottom:"6px" }}>
              今月の無料枠（{FREE_LIMIT}回）を使い切りました
            </div>
            <div style={{ fontSize:"13px", color:"#7A2020", marginBottom:"14px", lineHeight:"1.6" }}>
              プレミアムにアップグレードすると、来月を待たずに今すぐ続けられます。
            </div>
            <button onClick={()=>setShowUpgradeModal(true)} style={btnP({ fontSize:"13px" })}>
              ★ プレミアムにアップグレード（¥980/月）
            </button>
          </div>
        )}

        <div onClick={()=>{ if(!isPremium && usage.count >= FREE_LIMIT) return; fileRef.current.click(); }}
          onDragOver={(e)=>{ if(!isPremium && usage.count >= FREE_LIMIT) return; e.preventDefault(); setDragOver(true); }}
          onDragLeave={()=>setDragOver(false)} onDrop={onDrop}
          style={{
            border: `2px dashed ${dragOver ? T.purple : T.border}`,
            borderRadius: T.radius,
            padding: "48px 24px",
            textAlign: "center",
            cursor: (!isPremium && usage.count >= FREE_LIMIT) ? "not-allowed" : "pointer",
            background: dragOver ? T.purpleLight : T.surface,
            transition: "all 0.2s",
            opacity: (!isPremium && usage.count >= FREE_LIMIT) ? 0.45 : 1,
            position: "relative",
          }}>
          <div style={{ fontSize:"32px", marginBottom:"12px" }}>📄</div>
          <div style={{ fontSize:"15px", fontWeight:"500", marginBottom:"6px", color:T.text }}>PDFをドロップ、またはクリックして選択</div>
          <div style={{ fontSize:"12px", color:T.textHint }}>
            授業のレジュメ・スライド・資料に対応
            {!isPremium && usage.count > 0 && usage.count < FREE_LIMIT && (
              <div style={{ color: usage.count >= FREE_LIMIT - 1 ? "#BA7517" : T.textHint, marginTop:"4px", fontSize:"12px" }}>
                残り{FREE_LIMIT - usage.count}回 / 今月の無料枠
              </div>
            )}
            {useRef_&&refSessId && <div style={{ color:T.purple, fontWeight:"500", marginTop:"4px" }}>↩ 前回の内容を参照して生成します</div>}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" style={{ display:"none" }} onChange={(e)=>handleFile(e.target.files[0])} />
        {error && <div style={{ color:"#A32D2D", fontSize:"13px", marginTop:"12px", padding:"10px 14px", background:"#FCEBEB", borderRadius:T.radiusSm }}>{error}</div>}
      </div>
    );

    // ローディング
    if (step==="loading") return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:"16px" }}>
        <div style={{ width:"44px", height:"44px", border:`3px solid ${T.purpleLight}`, borderTop:`3px solid ${T.purple}`, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
        <div style={{ fontSize:"15px", fontWeight:"500", color:T.text }}>解析中...</div>
        <div style={{ fontSize:"12px", color:T.textSub }}>
          {useRef_&&refSessId ? "前回の授業内容を参照しながら生成中..." : "発言のヒントを生成しています"}
        </div>
      </div>
    );

    // 結果
    if (step==="result" && result) return (
      <div style={{ padding:"24px" }}>
        <CardView
          result={result} activeType={activeType} setActiveType={setActiveType}
          copied={copied} onCopy={copyCard} isPremium={isPremium} onUpgrade={()=>setShowUpgradeModal(true)}
          memo={memo} useRef_={useRef_} refSessId={refSessId} refSubj={refSubj} refSess={refSess}
          savedMsg={savedMsg} onSave={()=>setShowSaveModal(true)} onNewFile={()=>{setStep("upload");setResult(null);setFileName("");setPdfBase64(null);setCopied({});setHistoryView(null);}}
          depth={depth} grade={grade} setDepth={setDepth} setGrade={setGrade} onRegen={regenerate}
          memoInput={memoInput} setMemoInput={setMemoInput} memoLoading={memoLoading} memoError={memoError} onApplyMemo={applyMemo}
          readOnly={false}
        />
      </div>
    );

    return null;
  };

  // ─── レンダリング ────────────────────────────────────────
  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:"'Inter','Hiragino Sans',sans-serif", color:T.text, overflow:"hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .card-hover:hover .copy-btn { opacity:1 !important; }
        input:focus, textarea:focus { outline:none; border-color:${T.purple} !important; box-shadow: 0 0 0 3px ${T.purpleLight}; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:2px; }
      `}</style>

      {showOnboarding && <OnboardingModal />}
      {showSaveModal && <SaveModal />}
      {showUpgradeModal && <UpgradeModal />}

      {/* サイドバー */}
      <Sidebar />

      {/* メインエリア */}
      <div style={{ flex:1, overflowY:"auto", minWidth:0 }}>
        <MainContent />
      </div>
    </div>
  );
}
