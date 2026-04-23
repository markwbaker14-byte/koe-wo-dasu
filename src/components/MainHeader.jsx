import { depthLabel, gradeLabel } from "../lib/formatters";

export default function MainHeader({ step, historyView, result, depth, grade, onHamburger }) {
  let title = "新しい解析";
  let badge = null;

  if (historyView) {
    title = result?.topic || "履歴";
    badge = "履歴";
  } else if (step === "result" && result) {
    title = result.topic;
    badge = "解析済み";
  } else if (step === "loading") {
    title = "解析中…";
  }

  return (
    <header className="main-header">
      <div className="main-header-left">
        <button className="hamburger" onClick={onHamburger} aria-label="メニュー">☰</button>
        <div className="main-header-title">
          <span className="main-header-title-text">{title}</span>
          {badge && <span className="main-header-badge">{badge}</span>}
        </div>
      </div>
      <div className="main-header-meta">
        <span>踏み込み度：{depthLabel(depth)}</span>
        <span>対象：{gradeLabel(grade)}</span>
      </div>
    </header>
  );
}
