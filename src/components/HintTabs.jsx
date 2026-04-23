import { HINT_TYPES } from "../lib/constants";
import { track } from "../lib/analytics";

export default function HintTabs({ activeType, counts, onChange }) {
  return (
    <div className="hint-tabs">
      {HINT_TYPES.map((h) => (
        <button
          key={h.key}
          data-type={h.short}
          className={`hint-tab${activeType === h.key ? " active" : ""}`}
          onClick={() => {
            if (activeType !== h.key) track("hint_tab_switched", { tab_name: h.key });
            onChange(h.key);
          }}
        >
          <span>{h.icon}</span>
          <span>{h.label}</span>
          <span className="tab-count">{counts[h.key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
