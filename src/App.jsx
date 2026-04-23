import { useCallback, useEffect, useRef, useState } from "react";
import { track, setUserProperty } from "./lib/analytics";
import { callAPI } from "./lib/api";
import { FREE_LIMIT } from "./lib/constants";
import {
  hasFiredFreeLimitThisMonth,
  incrementUsage,
  loadOnboarded,
  loadSubjects,
  loadUsage,
  markFreeLimitFired,
  saveSubjects,
  currentYearMonth,
} from "./lib/storage";
import { memoLengthBucket } from "./lib/formatters";

import Sidebar from "./components/Sidebar";
import MainHeader from "./components/MainHeader";
import UploadScreen from "./components/UploadScreen";
import LoadingScreen from "./components/LoadingScreen";
import ResultsScreen from "./components/ResultsScreen";

import OnboardingModal from "./modals/OnboardingModal";
import SaveModal from "./modals/SaveModal";
import UpgradeModal from "./modals/UpgradeModal";

export default function App() {
  // screens
  const [step, setStep] = useState("upload");
  const [loadingStep, setLoadingStep] = useState(0);
  const [historyView, setHistoryView] = useState(null);

  // file / result
  const [fileName, setFileName] = useState("");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState("question");
  const [copied, setCopied] = useState({});

  // config
  const [depth, setDepth] = useState("applied");
  const [grade, setGrade] = useState("senior");

  // memo
  const [memo, setMemo] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState("");

  // premium
  const [isPremium, setIsPremium] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // reference
  const [refSubjId, setRefSubjId] = useState("");
  const [refSessId, setRefSessId] = useState("");
  const [useRef_, setUseRef_] = useState(false);

  // library
  const [subjects, setSubjects] = useState([]);
  const [subjLoaded, setSubjLoaded] = useState(false);
  const [expandedSubjs, setExpandedSubjs] = useState({});
  const [editingSubjId, setEditingSubjId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // usage
  const [usage, setUsage] = useState({ count: 0, yearMonth: currentYearMonth() });
  const [usageLoaded, setUsageLoaded] = useState(false);

  // modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // layout
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const prevLectureRefActive = useRef(false);

  // init
  useEffect(() => {
    loadSubjects().then((s) => { setSubjects(s); setSubjLoaded(true); });
    loadUsage().then((u) => { setUsage(u); setUsageLoaded(true); });
    loadOnboarded().then((done) => { if (!done) setShowOnboarding(true); });
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("devmode") === "1") setDevMode(true);
    } catch { /* ignore */ }
  }, []);

  // GA4 user properties
  useEffect(() => { setUserProperty("is_premium", isPremium ? "true" : "false"); }, [isPremium]);
  useEffect(() => { setUserProperty("grade_level", grade); }, [grade]);
  useEffect(() => { setUserProperty("depth_preference", depth); }, [depth]);
  useEffect(() => { setUserProperty("subject_count", subjects.length); }, [subjects.length]);

  // GA4 previous_lecture_referenced
  useEffect(() => {
    const active = useRef_ && !!refSessId;
    if (active && !prevLectureRefActive.current) track("previous_lecture_referenced");
    prevLectureRefActive.current = active;
  }, [useRef_, refSessId]);

  const openUpgrade = (trigger) => {
    track("premium_modal_opened", { trigger });
    setShowUpgradeModal(true);
  };

  const getRefSession = useCallback(() => {
    if (!useRef_ || !refSubjId || !refSessId) return null;
    return subjects.find((s) => s.id === refSubjId)?.sessions.find((x) => x.id === refSessId) || null;
  }, [useRef_, refSubjId, refSessId, subjects]);

  const handleError = (err, setter) => {
    const m = err?.message || "";
    if (m.includes("EMPTY_RESPONSE"))
      setter("資料のテキストを読み取れませんでした。スキャンPDFや画像PDFは対応が難しい場合があります。");
    else if (m.includes("PARSE_ERROR"))
      setter("応答の解析に失敗しました。資料が長すぎる可能性があります。10ページ以内の資料をお試しください。");
    else if (m.includes("API_ERROR"))
      setter(`通信エラーが発生しました。（${m.replace("API_ERROR: ", "")}）`);
    else setter("予期しないエラーが発生しました。もう一度お試しください。");
  };

  const runLoadingAnimation = () => {
    setLoadingStep(0);
    const t1 = setTimeout(() => setLoadingStep(1), 1500);
    const t2 = setTimeout(() => setLoadingStep(2), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  };

  const analyze = async (file) => {
    if (!isPremium && usage.count >= FREE_LIMIT) {
      setError(`今月の無料枠（${FREE_LIMIT}回）を使い切りました。プレミアムにアップグレードすると無制限で使えます。`);
      return;
    }
    setStep("loading");
    setError("");
    setHistoryView(null);
    const cancelAnim = runLoadingAnimation();
    const startedAt = performance.now();
    track("analysis_started", { depth, grade, has_memo: !!memo, has_reference: !!getRefSession() });
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = (e) => res(e.target.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setPdfBase64(base64);
      const parsed = await callAPI(base64, "", depth, grade, getRefSession());
      cancelAnim();
      setLoadingStep(3);
      await new Promise((r) => setTimeout(r, 350));

      const next = await incrementUsage(usage);
      setUsage(next);
      if (!isPremium && next.count >= FREE_LIMIT && !hasFiredFreeLimitThisMonth()) {
        track("free_limit_reached");
        markFreeLimitFired();
      }
      setResult(parsed);
      setMemo("");
      setMemoInput("");
      setCopied({});
      setStep("result");
      track("analysis_succeeded", { depth, grade, duration_ms: Math.round(performance.now() - startedAt) });
    } catch (err) {
      cancelAnim();
      const errorType = (err?.message || "").split(":")[0] || "UNKNOWN";
      track("analysis_failed", { error_type: errorType });
      handleError(err, setError);
      setStep("upload");
    }
  };

  const applyMemo = async () => {
    if (!memoInput.trim() || !pdfBase64) return;
    setMemoLoading(true);
    setMemoError("");
    track("memo_applied", { memo_length_chars: memoLengthBucket(memoInput.length) });
    try {
      const parsed = await callAPI(pdfBase64, memoInput, depth, grade, getRefSession());
      setResult(parsed);
      setMemo(memoInput);
      setMemoInput("");
      setCopied({});
    } catch (err) {
      handleError(err, setMemoError);
    } finally {
      setMemoLoading(false);
    }
  };

  const handleFile = (file) => {
    if (!file || file.type !== "application/pdf") {
      setError("PDFファイルを選択してください。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズが大きすぎます。10MB以内のPDFをお試しください。");
      return;
    }
    track("pdf_uploaded", { file_size_kb: Math.round(file.size / 1024) });
    setFileName(file.name);
    analyze(file);
  };

  const onDropzoneBlocked = () => {
    track("pdf_upload_blocked", { reason: "free_limit_reached" });
  };
  const onDropzoneAttempt = (source) => {
    track("pdf_upload_attempted", { source });
  };

  const copyCard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied((p) => ({ ...p, [key]: true }));
      setTimeout(() => setCopied((p) => ({ ...p, [key]: false })), 2000);
    });
    track("hint_copied", { hint_type: key.split("-")[0] });
  };

  const confirmSave = async ({ targetSubjId, newName }) => {
    if (!result) return;
    let updated = [...subjects];
    let target;
    const isNew = targetSubjId === "__new__";
    if (isNew) {
      target = { id: `subj-${Date.now()}`, name: newName, sessions: [] };
      updated = [target, ...updated];
    } else {
      target = updated.find((s) => s.id === targetSubjId);
      if (!target) return;
    }
    const sess = {
      id: `sess-${Date.now()}`,
      sessionNo: target.sessions.length + 1,
      topic: result.topic,
      savedAt: new Date().toLocaleDateString("ja-JP"),
      depth,
      grade,
      cards: {
        question: result.question || [],
        comment: result.comment || [],
        deepdive: result.deepdive || [],
      },
    };
    updated = updated.map((s) => (s.id === target.id ? { ...s, sessions: [...s.sessions, sess] } : s));
    setSubjects(updated);
    await saveSubjects(updated);
    if (isNew) track("subject_created");
    track("lecture_saved", { subject_count: updated.length });
    setShowSaveModal(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
    setExpandedSubjs((p) => ({ ...p, [target.id]: true }));
  };

  const commitRename = async (id) => {
    const t = editingName.trim();
    if (!t) { setEditingSubjId(null); return; }
    const u = subjects.map((s) => (s.id === id ? { ...s, name: t } : s));
    setSubjects(u);
    await saveSubjects(u);
    setEditingSubjId(null);
  };

  const deleteSession = async (sid, sessId) => {
    const u = subjects.map((s) => {
      if (s.id !== sid) return s;
      const sessions = s.sessions.filter((ss) => ss.id !== sessId).map((ss, i) => ({ ...ss, sessionNo: i + 1 }));
      return { ...s, sessions };
    }).filter((s) => s.sessions.length > 0);
    setSubjects(u);
    await saveSubjects(u);
    if (refSessId === sessId) { setRefSessId(""); setUseRef_(false); }
    if (historyView?.sessId === sessId) setHistoryView(null);
  };

  const openHistory = (subjId, sessId) => {
    setHistoryView({ subjId, sessId });
    setActiveType("question");
    setCopied({});
    setSidebarOpen(false);
  };

  const resetToUpload = () => {
    setStep("upload");
    setResult(null);
    setFileName("");
    setPdfBase64(null);
    setCopied({});
    setHistoryView(null);
    setError("");
    setSidebarOpen(false);
  };

  const handleToggleRef = () => {
    if (!isPremium) { openUpgrade("reference_locked"); return; }
    setUseRef_((v) => !v);
  };

  // derived
  const histSubj = historyView ? subjects.find((s) => s.id === historyView.subjId) : null;
  const histSess = histSubj?.sessions.find((s) => s.id === historyView.sessId);
  const histResult = histSess ? { topic: histSess.topic, ...histSess.cards } : null;
  const hasSaves = subjects.reduce((n, s) => n + s.sessions.length, 0) > 0;

  const viewingHistory = historyView && histResult;
  const resultForView = viewingHistory ? histResult : result;
  const depthForView = viewingHistory ? histSess.depth : depth;
  const gradeForView = viewingHistory ? histSess.grade : grade;

  return (
    <div className="app-shell">
      {sidebarOpen && <div className="drawer-overlay" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        open={sidebarOpen}
        isPremium={isPremium}
        usage={usage}
        usageLoaded={usageLoaded}
        subjects={subjects}
        subjLoaded={subjLoaded}
        expandedSubjs={expandedSubjs}
        onToggleSubject={(id) => setExpandedSubjs((p) => ({ ...p, [id]: !p[id] }))}
        editingSubjId={editingSubjId}
        editingName={editingName}
        onStartEdit={(id, name) => { setEditingSubjId(id); setEditingName(name); }}
        onChangeEditingName={setEditingName}
        onCommitRename={commitRename}
        onCancelEdit={() => setEditingSubjId(null)}
        historyView={historyView}
        refSessId={refSessId}
        useRef_={useRef_}
        onOpenHistory={openHistory}
        onDeleteSession={deleteSession}
        onNewAnalysis={resetToUpload}
        onUpgradeClick={() => openUpgrade("sidebar_button")}
        onLibraryLockedClick={() => openUpgrade("library_locked")}
      />

      <div className="main">
        <MainHeader
          step={step}
          historyView={historyView}
          result={viewingHistory ? histResult : result}
          depth={depthForView}
          grade={gradeForView}
          onHamburger={() => setSidebarOpen(true)}
        />

        <div className="main-body">
          {viewingHistory ? (
            <ResultsScreen
              result={resultForView}
              fileName=""
              depth={depthForView}
              grade={gradeForView}
              activeType={activeType}
              onActiveTypeChange={setActiveType}
              copied={copied}
              onCopy={copyCard}
              readOnly
              isPremium={isPremium}
              savedMsg={false}
              onSave={() => {}}
              onReanalyze={() => {}}
              memoInput=""
              setMemoInput={() => {}}
              memoLoading={false}
              memoError=""
              onApplyMemo={() => {}}
              onMemoUpgrade={() => {}}
              onSaveUpgrade={() => {}}
            />
          ) : step === "upload" ? (
            <UploadScreen
              depth={depth}
              grade={grade}
              onDepthChange={setDepth}
              onGradeChange={setGrade}
              isPremium={isPremium}
              subjects={subjects}
              hasSaves={hasSaves}
              useRef_={useRef_}
              refSubjId={refSubjId}
              refSessId={refSessId}
              onToggleRef={handleToggleRef}
              onSelectSubject={(id) => { setRefSubjId(id); setRefSessId(""); }}
              onSelectSession={setRefSessId}
              onRefLockedClick={() => openUpgrade("reference_locked")}
              usage={usage}
              error={error}
              onFilePick={handleFile}
              onDropzoneBlocked={onDropzoneBlocked}
              onDropzoneAttempt={onDropzoneAttempt}
              onLimitUpgradeClick={() => openUpgrade("limit_reached")}
            />
          ) : step === "loading" ? (
            <LoadingScreen fileName={fileName} loadingStep={loadingStep} />
          ) : step === "result" && result ? (
            <ResultsScreen
              result={result}
              fileName={fileName}
              depth={depth}
              grade={grade}
              activeType={activeType}
              onActiveTypeChange={setActiveType}
              copied={copied}
              onCopy={copyCard}
              readOnly={false}
              isPremium={isPremium}
              savedMsg={savedMsg}
              onSave={() => setShowSaveModal(true)}
              onReanalyze={resetToUpload}
              memoInput={memoInput}
              setMemoInput={setMemoInput}
              memoLoading={memoLoading}
              memoError={memoError}
              onApplyMemo={applyMemo}
              onMemoUpgrade={() => openUpgrade("memo_locked")}
              onSaveUpgrade={() => openUpgrade("save_locked")}
            />
          ) : null}
        </div>
      </div>

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}
      {showSaveModal && (
        <SaveModal
          subjects={subjects}
          suggestedName={result?.subjectName || ""}
          topic={result?.topic || ""}
          onClose={() => setShowSaveModal(false)}
          onConfirm={confirmSave}
        />
      )}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onMarkPurchased={() => setIsPremium(true)}
          devMode={devMode}
        />
      )}
    </div>
  );
}
