import { useEffect } from "react";

export default function Modal({ onClose, children, closeOnBackdrop = true, showClose = true }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {showClose && (
          <button className="modal-close" onClick={onClose} aria-label="閉じる">✕</button>
        )}
        {children}
      </div>
    </div>
  );
}
