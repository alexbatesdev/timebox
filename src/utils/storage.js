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
