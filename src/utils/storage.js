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

export const loadPreviousWrapup = (maxDaysBack = 7) => {
  try {
    for (let i = 1; i <= maxDaysBack; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateISO = d.toISOString().slice(0, 10);
      const raw = localStorage.getItem(`timebox-${dateISO}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const wrapup = parsed?.wrapup;
      if (wrapup && (wrapup.left || wrapup.next)) {
        return { wrapup, dateISO };
      }
    }
    return null;
  } catch {
    return null;
  }
};

export const loadPreviousWrapups = (maxDaysBack = 90) => {
  const entries = [];
  try {
    for (let i = 1; i <= maxDaysBack; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateISO = d.toISOString().slice(0, 10);
      const raw = localStorage.getItem(`timebox-${dateISO}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const wrapup = parsed?.wrapup;
      if (wrapup && (wrapup.left || wrapup.next)) {
        entries.push({ wrapup, dateISO });
      }
    }
  } catch {
    /* ignore parse errors and return what we have */
  }
  return entries;
};
