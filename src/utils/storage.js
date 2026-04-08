import { todayKey } from "./time.js";

export const loadState = () => {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const saveState = (state) => {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(state));
  } catch {
    /* quota exceeded — silently ignore */
  }
};
export const clearState = () => localStorage.removeItem(todayKey());

export const loadYesterdayWrapup = () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `timebox-${yesterday.toISOString().slice(0, 10)}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.wrapup || null;
  } catch {
    return null;
  }
};
