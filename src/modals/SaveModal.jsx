import { useState } from "react";
import Modal from "./Modal";

export default function SaveModal({ subjects, suggestedName, topic, onClose, onConfirm }) {
  const [targetId, setTargetId] = useState("__new__");
  const [newName, setNewName] = useState(suggestedName || "");

  const submit = () => {
    const isNew = targetId === "__new__";
    const resolvedName = isNew ? (newName.trim() || suggestedName || "未分類") : null;
    onConfirm({ targetSubjId: targetId, newName: resolvedName });
  };

  return (
    <Modal onClose={onClose}>
      <div className="modal-body">
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>授業を保存</div>
        <div style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 16 }}>今回：{topic}</div>

        <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          科目に追加
        </div>
        <div className="save-subject-list">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setTargetId(s.id)}
              className={`save-subject-chip${targetId === s.id ? " active" : ""}`}
            >
              {s.name}
              <span className="count">（第{s.sessions.length + 1}回として追加）</span>
            </button>
          ))}
          <button
            onClick={() => setTargetId("__new__")}
            className={`save-subject-chip${targetId === "__new__" ? " active" : ""}`}
          >
            ＋ 新しい科目として登録
          </button>
        </div>

        {targetId === "__new__" && (
          <>
            <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600, marginBottom: 6 }}>
              科目名（後から変更できます）
            </div>
            <input
              className="save-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={suggestedName || "例：社会学概論"}
            />
            {suggestedName && (
              <div className="save-input-hint">AIの推定：「{suggestedName}」</div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn-sm" onClick={onClose}>キャンセル</button>
          <button className="btn-sm primary" onClick={submit}>保存する</button>
        </div>
      </div>
    </Modal>
  );
}
