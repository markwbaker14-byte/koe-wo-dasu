import { DEPTHS, GRADES } from "./constants";

export const depthLabel = (v) => DEPTHS.find((d) => d.value === v)?.label || v;
export const depthDesc  = (v) => DEPTHS.find((d) => d.value === v)?.desc  || "";
export const gradeLabel = (v) => GRADES.find((g) => g.value === v)?.label || v;
export const gradeDesc  = (v) => GRADES.find((g) => g.value === v)?.desc  || "";

export const memoLengthBucket = (n) => (n < 50 ? "<50" : n <= 200 ? "50-200" : ">200");

export const relativeDate = (savedAt) => {
  if (!savedAt) return "";
  const parsed = new Date(savedAt.replace(/\//g, "-"));
  if (isNaN(parsed.getTime())) return savedAt;
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.floor((now.setHours(0,0,0,0) - parsed.setHours(0,0,0,0)) / dayMs);
  if (diff <= 0) return "今日";
  if (diff === 1) return "昨日";
  if (diff < 7)  return `${diff}日前`;
  if (diff < 30) return `${Math.floor(diff / 7)}週間前`;
  return savedAt;
};
