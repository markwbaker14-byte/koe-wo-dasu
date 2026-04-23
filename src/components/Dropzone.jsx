import { useRef, useState } from "react";
import { FREE_LIMIT } from "../lib/constants";

export default function Dropzone({
  isPremium,
  usageCount,
  useRefActive,
  onPick,
  onBlockedClick,
  onAttempt,
}) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  const isLimit = !isPremium && usageCount >= FREE_LIMIT;
  const remaining = Math.max(FREE_LIMIT - usageCount, 0);
  const remainingWarn = !isPremium && remaining > 0 && remaining <= 2;

  const handleClick = () => {
    if (isLimit) { onBlockedClick?.(); return; }
    onAttempt?.("click");
    inputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (isLimit) { onBlockedClick?.(); return; }
    onAttempt?.("drag");
    const file = e.dataTransfer.files?.[0];
    if (file) onPick(file);
  };

  return (
    <div
      className={`dropzone${dragOver ? " dragging" : ""}${isLimit ? " disabled" : ""}`}
      onClick={handleClick}
      onDragOver={(e) => { if (isLimit) return; e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="dropzone-icon">📄</div>
      <div className="dropzone-title">PDFをドロップ、またはクリックして選択</div>
      <div className="dropzone-sub">授業のレジュメ・スライド・配布資料</div>
      <div className="dropzone-formats">
        <span className="format-tag">PDF</span>
        <span className="format-tag">最大 10MB</span>
        <span className="format-tag">テキスト推奨</span>
      </div>
      {!isPremium && usageCount > 0 && remaining > 0 && (
        <div className={`remaining-note${remainingWarn ? " warn" : ""}`}>
          今月の無料枠：残り{remaining}回
        </div>
      )}
      {useRefActive && (
        <div className="remaining-note ref-active-note">↩ 前回の内容を参照して生成します</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
    </div>
  );
}
