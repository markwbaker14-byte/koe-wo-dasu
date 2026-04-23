import { DEPTHS, GRADES } from "../lib/constants";
import RefSelector from "./RefSelector";

export default function ConfigCard({
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
}) {
  const depthItem = DEPTHS.find((d) => d.value === depth);
  const gradeItem = GRADES.find((g) => g.value === grade);

  return (
    <div className="config-card">
      <div className="config-section">
        <div className="config-label">踏み込み度</div>
        <div className="seg-control">
          {DEPTHS.map((d) => (
            <button
              key={d.value}
              className={`seg-btn${depth === d.value ? " active" : ""}`}
              onClick={() => onDepthChange(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="config-desc">{depthItem?.desc}</div>
      </div>

      <div className="config-section">
        <div className="config-label">対象学年</div>
        <div className="seg-control">
          {GRADES.map((g) => (
            <button
              key={g.value}
              className={`seg-btn${grade === g.value ? " active" : ""}`}
              onClick={() => onGradeChange(g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="config-desc">{gradeItem?.desc}</div>
      </div>

      <div className="config-section">
        <RefSelector
          isPremium={isPremium}
          subjects={subjects}
          hasSaves={hasSaves}
          useRef_={useRef_}
          refSubjId={refSubjId}
          refSessId={refSessId}
          onToggle={onToggleRef}
          onSelectSubject={onSelectSubject}
          onSelectSession={onSelectSession}
          onLockedClick={onRefLockedClick}
        />
      </div>
    </div>
  );
}
