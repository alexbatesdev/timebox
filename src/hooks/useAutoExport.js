import { useEffect, useRef } from "react";

const WRAPUP_DEBOUNCE_MS = 30000;

const available = (exporter) => exporter.isAvailable?.() ?? true;

// Generic auto-export driver. Knows nothing about Notion — it reads each
// exporter's `auto` metadata and fires the snapshot through `run`, surfacing only
// errors (auto-runs are silent on success).
//
// - `auto.dailyAt` (minutes since midnight): once-per-day send when `now` reaches it.
// - `auto.onWrapupChange`: send 30s after the last `notifyWrapupEdited()` call.
export const useAutoExport = ({ exporters, snapshot, schedType, now, showToast }) => {
  // Keep the latest snapshot in a ref so timers/effects don't fire on stale data.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const runAuto = (predicate) => {
    for (const exporter of exporters) {
      if (!available(exporter) || !predicate(exporter)) continue;
      Promise.resolve()
        .then(() => exporter.run(snapshotRef.current))
        .catch((err) => {
          console.error(`Auto-export "${exporter.id}" failed:`, err);
          showToast?.(`⚠️ ${exporter.label} failed: ${err.message}`, "warn");
        });
    }
  };

  // ── daily send (e.g. 5 PM) — once per mount/day ──
  const dailySent = useRef(false);
  useEffect(() => {
    if (!schedType || dailySent.current) return;
    const isDue = (e) => e.auto?.dailyAt != null && now >= e.auto.dailyAt;
    if (!exporters.some((e) => available(e) && isDue(e))) return;
    dailySent.current = true;
    runAuto(isDue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, schedType]);

  // ── wrap-up edit sync (debounced, user-edits only) ──
  const wrapupTimer = useRef(null);
  useEffect(
    () => () => {
      if (wrapupTimer.current) clearTimeout(wrapupTimer.current);
    },
    [],
  );

  const notifyWrapupEdited = () => {
    if (wrapupTimer.current) clearTimeout(wrapupTimer.current);
    wrapupTimer.current = setTimeout(() => {
      wrapupTimer.current = null;
      runAuto((e) => e.auto?.onWrapupChange);
    }, WRAPUP_DEBOUNCE_MS);
  };

  return { notifyWrapupEdited };
};
