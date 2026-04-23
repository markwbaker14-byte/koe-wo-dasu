# Lawyer Review Checklist — Koe wo Dasu Terms of Service v1

> Purpose: hand this to the reviewing lawyer alongside `terms-of-service-ja.md`
> so they can focus on the high-risk decisions instead of re-reading boilerplate.
>
> Drafted: 2026-04-23
> Reviewer: (TBD — Mark's friend)

---

## 1. Service & Operator Snapshot

- **Service name**: 声を出す。 (Koe wo Dasu)
- **What it does**: Students upload a class PDF (handout/syllabus). The site
  forwards the PDF text to Anthropic's Claude API. Claude returns suggested
  questions, comments, and follow-up prompts the student can use during class.
- **Pricing**: Free (5 analyses/month). Premium ¥980/month (unlimited + extras).
- **Tech**: Static React app on Vercel. No backend. PDF text and outputs are
  stored only in the user's browser localStorage.
- **Operator**: Mark Baker, sole operator, Tokyo. Operating under the trade
  name (屋号) **"Mark Baker Studio"**. No 開業届 filed yet (treated as 任意団体).
  Umbrella naming is intentional so future services can sit under the same
  屋号 without re-issuing legal documents.
- **Tokushoho address**: Virtual office contract pending — to be inserted at
  publication time.
- **Payments**: Stripe Payment Link, JPY, monthly auto-renew.
- **No login / no accounts** at present (premium status held in localStorage
  only). Future direction: backend + auth.

## 2. Top Issues to Validate

These are the items where I want explicit lawyer sign-off before publication.

### 2.1 Operator legal status — 個人事業主 vs 任意団体
- 屋号「Mark Baker Studio」として 任意団体 扱いで有料サービスを提供することの
  リスクは？ 開業届 を先に出すべきか？
- 規約上の表記「Mark Baker Studio（屋号、運営：Mark Baker）」で足りるか？
- "Studio" の語が会社法第7条の「会社であると誤認されるおそれのある文字」に
  該当するリスクはないと整理できるか？（一般的には問題なしと考えられるが
  念のため確認）

### 2.2 Tokushoho 表記
- 規約とは別に作成する「特定商取引法に基づく表記」ページの内容も合わせて
  レビュー対象に含めたい（住所はバーチャルオフィス契約後に確定）。
- 個人連絡先の電話番号開示が消費者庁ガイドラインに照らして必須か、メール
  対応のみで足りるか。

### 2.3 第三者AIサービスへの送信（第6条3〜4項）
- 改正個人情報保護法における越境移転の同意要件を、本規約の文言で満たして
  いるか。
- 第27条・28条との関係で、移転先国（米国）の個人情報保護制度に関する情報
  提供を、規約またはプライバシーポリシーに別途記載する必要があるか。
- 「PDFには個人情報が含まれうる」前提で、明示の同意取得画面（チェック
  ボックス等）が必要か、規約の包括同意で足りるか。

### 2.4 AI生成物に関する免責（第7条）
- 学術不正に関する免責条項（第7条＋第8条）の組み合わせで、剽窃などに
  使われた場合の運営者責任は十分に切り離せているか。
- 教育機関とのトラブル（学生が本サービスを使って懲戒対象になった等）に
  対応するための追加文言は必要か。

### 2.5 18歳未満の利用（第3条3項）
- 民法第5条の未成年者保護との関係で、本規約の親権者同意条項は、有料契約
  （プレミアムプラン）も含めて十分か。
- 同意取得方法を「親権者の同意を得たうえで」とする規約上の記載のみで
  足りるか、それとも実装側（チェックボックス、年齢ゲート等）での対応が
  求められるか。

### 2.6 自動更新・返金規定（第5条）
- 特商法第11条・15条の3との関係で、自動更新と返金不可の表示は十分か。
- Stripe Checkout 画面、決済前モーダル、規約のいずれかで「最終確認画面」
  に関する要件を満たす必要があるか。

### 2.7 免責の上限（第12条5項）
- 直近1ヶ月の支払額を上限とする条項は、消費者契約法第10条の不当条項規制
  に照らして有効か。
- 無料プラン利用者については「直近1ヶ月の支払額」が0円になるが、その点の
  明示や別建ての処理が必要か。

### 2.8 定型約款としての位置づけ（第14条）
- 民法第548条の4の要件（変更の必要性・相当性、周知方法）を本条文で
  満たしているか。
- 周知方法として「ウェブサイト掲示」のみで足りるか、メール通知等の追加が
  必要か（現状はアカウント／メアド未取得のため、サイト掲示しか手段がない）。

## 3. Pre-Publication Action Items (after lawyer feedback)

- [ ] Insert Tokushoho address (post virtual office contract)
- [ ] Insert specific contact email or contact form URL in 第16条
- [ ] Insert effective date in 附則
- [ ] Reflect lawyer's redlines into v2
- [ ] Cross-check Privacy Policy v1 (drafted next) against final ToS terminology
- [ ] Publish at /terms with link from landing page footer + premium signup flow
- [ ] Verification: open /terms on mobile + desktop, confirm rendering and
      that all internal links work

## 4. Privacy Policy v1 — Additional Review Points

The Privacy Policy draft (`privacy-policy-ja.md`) is in scope for the same
review session. Specific items to validate:

### 4.1 第5条 越境移転の同意取得
- 本人同意の取得方法として「本サービスを利用することにより同意したものと
  みなす」というみなし同意で、改正個人情報保護法第28条の要件を満たすか。
- 米国の個人情報保護制度に関する情報提供の記述レベルは十分か（PPC公表
  資料への参照のみで足りるか、より詳細な記述を求められるか）。
- 4つの移転先（Anthropic / Stripe / Vercel / Google）それぞれの記載粒度
  にバラつきがある点、修正が必要か。

### 4.2 第6条 安全管理措置
- 「個人情報取扱責任者：Mark Baker」と単独記載することのリスク（個人名
  の継続的公開）。屋号での代替表記が認められるか。
- 個人運営での「組織的安全管理措置」記載は、PPC ガイドラインの想定する
  水準と整合しているか。

### 4.3 第7条 開示請求対応
- 手数料に関する記載（「合理的な範囲で」）の具体額を事前に定めるべきか。
- 本人確認方法を本ポリシー内で具体的に定める必要があるか。

### 4.4 第8条 Cookie 同意
- 改正個人情報保護法および電気通信事業法（外部送信規律）との関係で、
  Cookie バナー表示の要否。
- GA4 利用は2026年現在、外部送信規律の対象事業者に該当するか
  （対象は「電気通信事業者及び第三号事業を営む者」）。

## 5. 特定商取引法に基づく表記 — Additional Review Points

The Tokushoho display draft (`tokushoho-ja.md`) is in scope for the
same review session. Specific items to validate:

### 5.1 開示方法（請求があった場合に開示する旨）
- 「請求があった場合に開示する」という記載は、消費者庁2023年ガイドライン
  に照らして本サービスの態様で許容されるか。許容される場合、その開示
  方法（メール返信のみで足りるか）も合わせて確認。
- 個人事業主・任意団体が虚偽でない正確な住所・電話を記載していれば
  「請求があった場合に開示」の運用は、現状ガイドライン上は限定的。
  事前公開を求められる可能性が高いが、ご見解を伺いたい。

### 5.2 返金不可の記載と消費者契約法
- 「返金は原則として承っておりません」の記載が、消費者契約法第10条
  （消費者の利益を一方的に害する条項の無効）に抵触しないか。
- 自動更新型サブスクリプションでの「日割り返金なし」運用は、現状
  日本の SaaS で一般的だが、本サービスでの記載で十分か。

### 5.3 動作環境記載の十分性
- 対応ブラウザの記載は「最新版」のみ。具体バージョン明記が必要か、
  または現状の表現で足りるか。
- スマホ「推奨外」の記載の法的リスク（推奨環境外で動作不良の場合の
  責任範囲）。

### 5.4 自動更新の表示位置
- 特商法第11条・第12条の3との関係で、自動更新の事実は本ページだけ
  でなく Stripe 決済画面、利用規約、申込フローのどこに表示が必要か。

### 5.5 屋号表記での販売事業者表示
- 「Mark Baker Studio（屋号）/ 運営責任者：Mark Baker」の併記方式
  で、特商法第11条第1号の販売事業者氏名要件を満たすか。
- 法人格（株式会社等）でない屋号のみで「販売事業者」と称することの
  リスク。

## 6. Out-of-Scope for This Review (handled separately)

- Stripe Checkout / Payment Link UX (separate compliance check at activation)
- Cookie consent banner implementation (after lawyer's view on Section 4.4)
