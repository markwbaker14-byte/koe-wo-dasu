export default function RefSelector({
  isPremium,
  subjects,
  hasSaves,
  useRef_,
  refSubjId,
  refSessId,
  onToggle,
  onSelectSubject,
  onSelectSession,
  onLockedClick,
}) {
  if (!isPremium) {
    return (
      <div className="ref-locked" onClick={onLockedClick}>
        <div className="ref-locked-info">
          <div className="ref-locked-icon">🔒</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              前回の授業を参照して生成
            </div>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
              プレミアムで有効化
            </div>
          </div>
        </div>
        <span className="ref-locked-pill">プレミアム限定</span>
      </div>
    );
  }

  if (!hasSaves) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-light)", padding: "8px 0" }}>
        前回の授業を参照するには、まず授業を保存してください。
      </div>
    );
  }

  const currentSubj = subjects.find((s) => s.id === refSubjId);
  const currentSess = currentSubj?.sessions.find((s) => s.id === refSessId);

  return (
    <>
      <div className="ref-toggle">
        <div>
          <div className="ref-toggle-label">↩ 前の回の内容を参照して生成</div>
          <div className="ref-toggle-sub">
            {useRef_ && currentSess
              ? `第${currentSess.sessionNo}回を参照中`
              : "オフ"}
          </div>
        </div>
        <button
          className={`switch${useRef_ ? " on" : ""}`}
          onClick={onToggle}
          aria-label="前回参照トグル"
        />
      </div>

      {useRef_ && (
        <div className="ref-picker">
          <div>
            <div className="ref-picker-group-label">科目</div>
            <div className="ref-chip-list">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSubject(s.id)}
                  className={`ref-chip${refSubjId === s.id ? " active" : ""}`}
                >
                  {s.name}
                  <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>
                    {s.sessions.length}回
                  </span>
                </button>
              ))}
            </div>
          </div>

          {currentSubj && (
            <div>
              <div className="ref-picker-group-label">参照する回</div>
              <div className="ref-chip-list">
                {currentSubj.sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => onSelectSession(sess.id)}
                    className={`ref-chip${refSessId === sess.id ? " active" : ""}`}
                  >
                    第{sess.sessionNo}回：{sess.topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentSess && (
            <div className="ref-preview">
              ↩ 「{currentSubj.name} 第{currentSess.sessionNo}回：{currentSess.topic}」を参照
            </div>
          )}
        </div>
      )}
    </>
  );
}
