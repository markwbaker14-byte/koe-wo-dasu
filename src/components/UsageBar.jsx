import { FREE_LIMIT } from "../lib/constants";

export default function UsageBar({ count }) {
  const ratio = Math.min(count / FREE_LIMIT, 1);
  const pct = ratio * 100;
  const atLimit = count >= FREE_LIMIT;
  const warning = count >= FREE_LIMIT - 1 && !atLimit;

  let cls = "usage-fill";
  if (atLimit) cls += " danger";
  else if (warning) cls += " warning";

  return (
    <div className="usage-bar">
      <div className="usage-label">
        <span>今月の解析回数</span>
        <span className="usage-label-value">{count} / {FREE_LIMIT}</span>
      </div>
      <div className="usage-track">
        <div className={cls} style={{ width: `${pct}%` }} />
      </div>
      {atLimit && <div className="usage-note-limit">翌月1日にリセットされます</div>}
    </div>
  );
}
