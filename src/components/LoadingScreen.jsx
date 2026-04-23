const STEPS = [
  { icon: "📄", label: "PDFを読み込んでいます" },
  { icon: "🔍", label: "内容を理解しています" },
  { icon: "✦", label: "ヒントを生成しています" },
];

export default function LoadingScreen({ fileName, loadingStep }) {
  return (
    <div className="screen-loading">
      <div className="loading-spinner" />
      <div>
        <div className="loading-title">解析中…</div>
        {fileName && <div className="loading-sub">{fileName}</div>}
      </div>
      <div className="loading-steps">
        {STEPS.map((s, i) => {
          let cls = "loading-step";
          if (i < loadingStep) cls += " done";
          else if (i === loadingStep) cls += " active";
          return (
            <div key={s.label} className={cls}>
              <span className="step-icon">{i < loadingStep ? "✓" : s.icon}</span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
