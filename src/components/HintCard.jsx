import { HINT_TYPES } from "../lib/constants";

export default function HintCard({ type, index, card, isCopied, onCopy }) {
  const meta = HINT_TYPES.find((h) => h.key === type);
  const short = meta?.short || "q";
  return (
    <div className="hint-result-card" data-type={short}>
      <div className="hint-result-header">
        <div className="hint-result-type">
          {meta?.icon} {meta?.label}
        </div>
        <button
          className={`hint-action-btn${isCopied ? " copied" : ""}`}
          onClick={() => onCopy(card.text, `${type}-${index}`)}
        >
          {isCopied ? "✓ コピー済み" : "📋 コピー"}
        </button>
      </div>
      <div className="hint-result-text">{card.text}</div>
      {card.hint && <div className="hint-result-note">💡 {card.hint}</div>}
    </div>
  );
}
