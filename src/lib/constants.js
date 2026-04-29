export const STORAGE_KEY = "lecture-voice:subjects-v2";
export const USAGE_KEY = "lecture-voice:usage";
export const ONBOARD_KEY = "lecture-voice:onboarded";
export const FREE_LIMIT_FIRED_KEY = "lecture-voice:freeLimitFired";
export const PREMIUM_KEY = "lecture-voice:premium";
export const FREE_LIMIT = 5;

export const PAYMENT_LINK = "https://buy.stripe.com/test_8x2cMY7VzfEIc1D4aP18c00";

export const DEPTHS = [
  { value: "surface",  label: "授業内",     desc: "資料の内容だけに絞った、安全でシンプルな問いを生成します。" },
  { value: "applied",  label: "応用・社会", desc: "時事問題・他分野・実社会との接続を含む問いを生成します。" },
  { value: "personal", label: "個人的",     desc: "先生の経験・研究背景・個人的見解を引き出す問いを生成します。" },
];

export const GRADES = [
  { value: "freshman", label: "学部1・2年", desc: "基礎的な語彙と表現で、入門レベルの問いを生成します。" },
  { value: "senior",   label: "学部3・4年", desc: "専門知識を前提とした、やや踏み込んだ表現で生成します。" },
  { value: "grad",     label: "大学院生",   desc: "研究・方法論的な視点から、専門的な問いを生成します。" },
];

export const HINT_TYPES = [
  { key: "question", short: "q", icon: "❓", label: "質問する"   },
  { key: "comment",  short: "c", icon: "◎",  label: "発言する"   },
  { key: "deepdive", short: "d", icon: "↓",  label: "深掘りする" },
];

export const ONBOARDING_SLUGS = ["pdf_upload_intro", "hint_types_intro", "depth_and_history"];
