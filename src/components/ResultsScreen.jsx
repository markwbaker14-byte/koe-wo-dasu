import { track } from "../lib/analytics";
import { depthLabel, gradeLabel } from "../lib/formatters";
import { HINT_TYPES } from "../lib/constants";
import HintTabs from "./HintTabs";
import HintCard from "./HintCard";

export default function ResultsScreen({
  result,
  fileName,
  depth,
  grade,
  activeType,
  onActiveTypeChange,
  copied,
  onCopy,
  readOnly,
  isPremium,
  savedMsg,
  onSave,
  onReanalyze,
  memoInput,
  setMemoInput,
  memoLoading,
  memoError,
  onApplyMemo,
  onMemoUpgrade,
  onSaveUpgrade,
}) {
  const counts = HINT_TYPES.reduce((acc, h) => {
    acc[h.key] = (result?.[h.key] || []).length;
    return acc;
  }, {});
  const activeCards = result?.[activeType] || [];

  const exportTxt = () => {
    track("export_text_clicked", { tab_name: activeType });
    const typeMeta = HINT_TYPES.find((h) => h.key === activeType);
    const lines = [
      `■ ${result.topic}`,
      `踏み込み度：${depthLabel(depth)}\u3000対象：${gradeLabel(grade)}`,
      `カテゴリ：${typeMeta?.label}`,
      `出力日：${new Date().toLocaleDateString("ja-JP")}`,
      "",
      ...activeCards.map((c, i) => `【${i + 1}】${c.text}\n\u3000💡 ${c.hint}\n`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `声を出す_${result.topic}_${typeMeta?.label || ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen-results">
      <div className="results-header">
        <div className="results-topic">
          <div className="results-file-icon">📄</div>
          <div className="results-topic-info">
            <div className="results-file-name">{result.topic}</div>
            <div className="results-file-meta">
              {fileName && <span>{fileName}</span>}
              <span>踏み込み度：{depthLabel(depth)}</span>
              <span>対象：{gradeLabel(grade)}</span>
            </div>
          </div>
        </div>
        <div className="results-actions">
          <button className="btn-sm" onClick={exportTxt}>↓ テキスト出力</button>
          {!readOnly && (
            <>
              <button className="btn-sm" onClick={onReanalyze}>↻ 別の資料</button>
              {isPremium ? (
                <button
                  className={`btn-sm${savedMsg ? " success" : " primary"}`}
                  onClick={onSave}
                >
                  {savedMsg ? "✓ 保存しました" : "授業を保存"}
                </button>
              ) : (
                <button className="btn-sm ghost-lock" onClick={onSaveUpgrade}>
                  🔒 保存
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <HintTabs activeType={activeType} counts={counts} onChange={onActiveTypeChange} />

      <div className="hints-grid">
        {activeCards.map((card, i) => (
          <HintCard
            key={`${activeType}-${i}`}
            type={activeType}
            index={i}
            card={card}
            isCopied={!!copied[`${activeType}-${i}`]}
            onCopy={onCopy}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="regen-bar">
          {isPremium ? (
            <>
              <div className="regen-bar-top">
                <div className="regen-label">
                  ★ <strong>講義メモを追加して再生成</strong>
                </div>
              </div>
              <div className="regen-memo">
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder={"例：\n・先生が「日本の少子化は2040年に加速する」と言っていた\n・グループワークで「地方移住」の話題が出た"}
                />
                {memoError && <div className="regen-memo-error">{memoError}</div>}
                <div className="regen-memo-actions">
                  <button
                    className="btn-sm primary"
                    onClick={onApplyMemo}
                    disabled={memoLoading || !memoInput.trim()}
                  >
                    {memoLoading ? "再生成中…" : "メモを反映して再生成"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="regen-locked">
              <div className="regen-locked-body">
                🔒 気に入らなければ、メモを追加して再生成。プレミアム限定機能です。
              </div>
              <button className="btn-sm primary" onClick={onMemoUpgrade}>
                ★ アップグレード
              </button>
            </div>
          )}
        </div>
      )}

      <p className="footnote">
        これらはあくまでヒントです。自分の言葉でアレンジして使ってください。
      </p>
    </div>
  );
}
