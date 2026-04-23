import Modal from "./Modal";
import { track, trackPurchase } from "../lib/analytics";
import { PAYMENT_LINK } from "../lib/constants";

const FEATURES = [
  { icon: "∞", label: "PDF解析 無制限", desc: "月5回の制限がなくなります" },
  { icon: "↩", label: "前回の授業を参照", desc: "同じ科目の前回内容を踏まえて生成" },
  { icon: "★", label: "講義メモで再生成", desc: "授業中の板書・口頭説明を即時反映" },
  { icon: "📚", label: "科目・回ごとの保存", desc: "すべての授業履歴を無制限で蓄積" },
];

export default function UpgradeModal({ onClose, onMarkPurchased, devMode = false }) {
  return (
    <Modal onClose={onClose}>
      <div className="upgrade-hero">
        <div className="upgrade-kicker">プレミアムプラン</div>
        <div className="upgrade-price">
          ¥980
          <span className="upgrade-price-suffix">/ 月（税込）</span>
        </div>
        <div className="upgrade-note">いつでも解約可 · クレジットカード</div>
      </div>

      <div className="modal-body">
        <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>
          プレミアム限定の機能
        </div>
        <div className="upgrade-features">
          {FEATURES.map((f) => (
            <div key={f.label} className="upgrade-feature">
              <div className="upgrade-feature-icon">{f.icon}</div>
              <div>
                <div className="upgrade-feature-title">{f.label}</div>
                <div className="upgrade-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <a
          href={PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="upgrade-cta"
          onClick={() => track("premium_stripe_clicked")}
        >
          Stripeで安全に決済する →
        </a>
        <p className="upgrade-disclaimer">
          Stripeの安全な決済ページに移動します。<br />
          決済完了後、サポートまでご連絡ください。
        </p>

        {devMode && (
          <button
            className="upgrade-dev"
            onClick={() => {
              track("premium_marked_purchased");
              trackPurchase({ transactionId: crypto.randomUUID() });
              onMarkPurchased?.();
              onClose();
            }}
          >
            ※ デモ：プレミアムを有効化（開発用）
          </button>
        )}
      </div>
    </Modal>
  );
}
