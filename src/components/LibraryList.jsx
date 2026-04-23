import { relativeDate } from "../lib/formatters";

export default function LibraryList({
  isPremium,
  subjects,
  subjLoaded,
  expandedSubjs,
  onToggleSubject,
  editingSubjId,
  editingName,
  onStartEdit,
  onChangeEditingName,
  onCommitRename,
  onCancelEdit,
  historyView,
  refSessId,
  useRef_,
  onOpenHistory,
  onDeleteSession,
  onLockedClick,
}) {
  if (!isPremium) {
    return (
      <>
        <div className="sidebar-section-label">ライブラリ</div>
        <div style={{ padding: "0 8px" }}>
          <div className="library-locked" onClick={onLockedClick}>
            <div className="library-session-icon">🔒</div>
            <div className="library-session-info">
              <div className="library-session-name">保存はプレミアム</div>
              <div className="library-session-meta">無制限で保存・参照</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sidebar-section-label">
        <span>ライブラリ</span>
        {subjLoaded && subjects.length === 0 && (
          <span className="sidebar-section-label-muted">（保存なし）</span>
        )}
      </div>
      <div className="library-list">
        {subjLoaded && subjects.length === 0 && (
          <div className="library-empty">授業を保存するとここに並びます。</div>
        )}
        {subjects.map((subj) => {
          const isExpanded = !!expandedSubjs[subj.id];
          return (
            <div key={subj.id}>
              <div className="library-subject" onClick={() => onToggleSubject(subj.id)}>
                <span className={`library-caret${isExpanded ? " open" : ""}`}>▶</span>
                {editingSubjId === subj.id ? (
                  <input
                    className="library-subject-input"
                    value={editingName}
                    onChange={(e) => onChangeEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onCommitRename(subj.id);
                      if (e.key === "Escape") onCancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="library-subject-name">{subj.name}</span>
                )}
                <span className="library-subject-count">{subj.sessions.length}</span>
                <button
                  className="library-icon-btn"
                  onClick={(e) => { e.stopPropagation(); onStartEdit(subj.id, subj.name); }}
                  title="名前を変更"
                >✎</button>
              </div>
              {isExpanded && subj.sessions.map((sess) => {
                const isActive = historyView?.sessId === sess.id;
                const isRef = refSessId === sess.id && useRef_;
                return (
                  <div
                    key={sess.id}
                    onClick={() => onOpenHistory(subj.id, sess.id)}
                    className={`library-session${isActive ? " active" : ""}`}
                  >
                    <div className="library-session-icon">第{sess.sessionNo}</div>
                    <div className="library-session-info">
                      <div className="library-session-name">{sess.topic}</div>
                      <div className="library-session-meta">{relativeDate(sess.savedAt)}</div>
                    </div>
                    {isRef && <span className="library-session-ref">参照中</span>}
                    <button
                      className="library-icon-btn"
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(subj.id, sess.id); }}
                      title="削除"
                    >✕</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
