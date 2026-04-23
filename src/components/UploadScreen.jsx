import { FREE_LIMIT } from "../lib/constants";
import ConfigCard from "./ConfigCard";
import Dropzone from "./Dropzone";

export default function UploadScreen({
  depth,
  grade,
  onDepthChange,
  onGradeChange,
  isPremium,
  subjects,
  hasSaves,
  useRef_,
  refSubjId,
  refSessId,
  onToggleRef,
  onSelectSubject,
  onSelectSession,
  onRefLockedClick,
  usage,
  error,
  onFilePick,
  onDropzoneBlocked,
  onDropzoneAttempt,
  onLimitUpgradeClick,
}) {
  const isLimit = !isPremium && usage.count >= FREE_LIMIT;

  return (
    <div className="screen-upload">
      <ConfigCard
        depth={depth}
        grade={grade}
        onDepthChange={onDepthChange}
        onGradeChange={onGradeChange}
        isPremium={isPremium}
        subjects={subjects}
        hasSaves={hasSaves}
        useRef_={useRef_}
        refSubjId={refSubjId}
        refSessId={refSessId}
        onToggleRef={onToggleRef}
        onSelectSubject={onSelectSubject}
        onSelectSession={onSelectSession}
        onRefLockedClick={onRefLockedClick}
      />

      {error && <div className="error-banner">{error}</div>}

      {isLimit ? (
        <div className="limit-reached">
          <div className="limit-reached-icon">🔒</div>
          <div className="limit-reached-title">今月の解析回数が上限に達しました</div>
          <div className="limit-reached-body">
            プレミアムにアップグレードすると無制限で使えます。<br />
            無料枠は翌月1日にリセットされます。
          </div>
          <button className="btn-sm primary" onClick={onLimitUpgradeClick}>
            ★ プレミアムにアップグレード（¥980/月）
          </button>
        </div>
      ) : (
        <Dropzone
          isPremium={isPremium}
          usageCount={usage.count}
          useRefActive={useRef_ && !!refSessId}
          onPick={onFilePick}
          onBlockedClick={onDropzoneBlocked}
          onAttempt={onDropzoneAttempt}
        />
      )}
    </div>
  );
}
