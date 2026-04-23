import { useState, useEffect } from "react";
import Modal from "./Modal";
import { track } from "../lib/analytics";
import { markOnboarded } from "../lib/storage";
import { ONBOARDING_SLUGS } from "../lib/constants";

const STEPS = [
  {
    icon: "📄",
    title: "PDFをアップロードするだけ",
    desc: "授業のレジュメ・スライド・配布資料をドロップするだけでOK。AIが内容を読み取り、その場で使える言葉を生成します。",
    visual: (
      <div className="onboard-visual-bg">
        <div className="onboard-hint-row" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>社会学概論_第3回.pdf</div>
            <div style={{ fontSize: 11, color: "var(--text-light)" }}>解析中...</div>
          </div>
          <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
        </div>
      </div>
    ),
  },
  {
    icon: "💬",
    title: "3種類のヒントを使い分ける",
    desc: "生成されたヒントは用途別に3種類。授業の流れに合わせて切り替えてください。",
    visual: (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "❓ 質問する", ex: "先生の研究でこのテーマに関わったことはありますか？", type: "q" },
          { label: "◎ 発言する", ex: "SNSでの炎上も逸脱の一種と見ることができますか？", type: "c" },
          { label: "↓ 深掘りする", ex: "前回の自己概念と今回の逸脱はどう繋がりますか？", type: "d" },
        ].map((c) => (
          <div key={c.type} className="hint-result-card" data-type={c.type} style={{ padding: "10px 14px" }}>
            <div className="hint-result-type" style={{ marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>{c.ex}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "🎚",
    title: "踏み込み度と履歴を活用する",
    desc: "授業内・応用・個人的の3段階で質問の深さを調整できます。授業を保存すると、前回の内容を踏まえた発言も生成できます。",
    visual: (
      <div className="onboard-visual-bg">
        <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 8, fontWeight: 600 }}>踏み込み度</div>
        <div className="seg-control">
          {["授業内", "応用・社会", "個人的"].map((l, i) => (
            <div key={l} className={`seg-btn${i === 1 ? " active" : ""}`} style={{ pointerEvents: "none" }}>{l}</div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    track("onboarding_step_viewed", {
      step_index: step,
      step_name: ONBOARDING_SLUGS[step] || "unknown",
    });
  }, [step]);

  const close = async (completed) => {
    if (completed) track("onboarding_completed");
    else track("onboarding_skipped", { skipped_at_step: step });
    await markOnboarded();
    onClose();
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal onClose={() => close(false)} closeOnBackdrop={false} showClose={false}>
      <div className="onboard-progress">
        <div className="onboard-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <div className="modal-body">
        <div className="onboard-step-num">{step + 1} / {STEPS.length}</div>
        <div className="onboard-icon">{current.icon}</div>
        <div className="onboard-title">{current.title}</div>
        <div className="onboard-desc">{current.desc}</div>
        {current.visual}
        <div className="onboard-nav">
          <button className="onboard-skip" onClick={() => close(false)}>スキップ</button>
          <div className="onboard-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`onboard-dot${i === step ? " active" : ""}`} />
            ))}
          </div>
          <button className="onboard-next" onClick={() => (isLast ? close(true) : setStep(step + 1))}>
            {isLast ? "始める →" : "次へ →"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
