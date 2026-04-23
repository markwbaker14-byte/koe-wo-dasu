import UsageBar from "./UsageBar";
import LibraryList from "./LibraryList";

export default function Sidebar({
  open,
  isPremium,
  usage,
  usageLoaded,
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
  onNewAnalysis,
  onUpgradeClick,
  onLibraryLockedClick,
}) {
  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">声を出す<span>。</span></div>
        <div className="sidebar-tagline">授業資料から、あなたの言葉を</div>
      </div>

      <div className="sidebar-actions">
        <button className="btn-new" onClick={onNewAnalysis}>＋ 新しい資料を解析</button>
        {isPremium ? (
          <div className="premium-badge">★ プレミアム会員</div>
        ) : (
          <button className="btn-upgrade-sidebar" onClick={onUpgradeClick}>
            ★ プレミアムにアップグレード
          </button>
        )}
      </div>

      {!isPremium && usageLoaded && <UsageBar count={usage.count} />}

      <LibraryList
        isPremium={isPremium}
        subjects={subjects}
        subjLoaded={subjLoaded}
        expandedSubjs={expandedSubjs}
        onToggleSubject={onToggleSubject}
        editingSubjId={editingSubjId}
        editingName={editingName}
        onStartEdit={onStartEdit}
        onChangeEditingName={onChangeEditingName}
        onCommitRename={onCommitRename}
        onCancelEdit={onCancelEdit}
        historyView={historyView}
        refSessId={refSessId}
        useRef_={useRef_}
        onOpenHistory={onOpenHistory}
        onDeleteSession={onDeleteSession}
        onLockedClick={onLibraryLockedClick}
      />

      <div className="sidebar-footer">
        <a href="/" className="sidebar-footer-link">← ランディングページ</a>
      </div>
    </aside>
  );
}
