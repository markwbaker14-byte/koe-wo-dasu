import {
  STORAGE_KEY,
  USAGE_KEY,
  ONBOARD_KEY,
  FREE_LIMIT_FIRED_KEY,
  PREMIUM_KEY,
} from "./constants";

export const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const loadSubjects = async () => {
  try {
    const r = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return r ? r : [];
  } catch { return []; }
};

export const saveSubjects = async (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

export const loadUsage = async () => {
  try {
    const r = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
    if (!r) return { count: 0, yearMonth: currentYearMonth() };
    if (r.yearMonth !== currentYearMonth()) return { count: 0, yearMonth: currentYearMonth() };
    return r;
  } catch { return { count: 0, yearMonth: currentYearMonth() }; }
};

export const incrementUsage = async (current) => {
  const next = { count: current.count + 1, yearMonth: currentYearMonth() };
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
};

export const loadOnboarded = async () => {
  try { return !!JSON.parse(localStorage.getItem(ONBOARD_KEY) || "null"); }
  catch { return false; }
};

export const markOnboarded = async () => {
  try { localStorage.setItem(ONBOARD_KEY, "true"); } catch { /* ignore */ }
};

export async function loadPremium() {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "true";
  } catch {
    return false;
  }
}

export async function savePremium(value) {
  try {
    if (value) {
      localStorage.setItem(PREMIUM_KEY, "true");
    } else {
      localStorage.removeItem(PREMIUM_KEY);
    }
  } catch {
    /* ignore quota / privacy mode */
  }
}

export const hasFiredFreeLimitThisMonth = () => {
  try {
    const r = JSON.parse(localStorage.getItem(FREE_LIMIT_FIRED_KEY) || "null");
    return r?.yearMonth === currentYearMonth();
  } catch { return false; }
};

export const markFreeLimitFired = () => {
  try {
    localStorage.setItem(
      FREE_LIMIT_FIRED_KEY,
      JSON.stringify({ yearMonth: currentYearMonth() }),
    );
  } catch { /* ignore */ }
};
