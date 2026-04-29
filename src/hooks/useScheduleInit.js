import { useEffect } from "react";
import { getWeekdayKey } from "../utils/time.js";
import { loadState, loadPreviousWrapup } from "../utils/storage.js";
import { loadScheduleConfig } from "../data/scheduleConfig.js";
import { resolveInitialState } from "../data/schedules.js";
import {
  loadTodayFromNotion,
  loadPreviousWrapupFromNotion,
} from "../notion/api.js";

export const useScheduleInit = ({
  setSchedType,
  setBlocks,
  setTasks,
  setWrapup,
  setPreviousWrapup,
  setNotionPageId,
  setConfigStatus,
  setConfig,
  clearNotified,
  showToast,
}) => {
  useEffect(() => {
    let cancelled = false;

    const applyConfig = async () => {
      const token = import.meta.env.VITE_NOTION_TOKEN;

      const config = await loadScheduleConfig();
      if (cancelled) return;
      setConfig(config);
      const { timeFormat } = config;

      let previous = null;
      try {
        previous = await loadPreviousWrapupFromNotion(token, timeFormat);
      } catch (err) {
        showToast?.(
          `Notion previous-wrap-up load failed: ${err.message}`,
          "warn",
        );
      }
      if (cancelled) return;
      if (!previous) previous = loadPreviousWrapup();
      setPreviousWrapup?.(previous);

      const saved = loadState();
      if (saved?.schedType) {
        setSchedType(saved.schedType);
        setBlocks(saved.blocks ?? []);
        setTasks(saved.tasks ?? {});
        setWrapup(saved.wrapup ?? { left: "", next: "" });
        setNotionPageId(saved.notionPageId ?? null);
        clearNotified();
        setConfigStatus("ready");
        return;
      }

      let notionState = null;
      try {
        notionState = await loadTodayFromNotion(token, timeFormat);
      } catch (err) {
        showToast?.(`Notion load failed: ${err.message}`, "warn");
      }
      if (cancelled) return;

      if (notionState?.snapshot) {
        setSchedType(notionState.snapshot.schedType);
        setBlocks(notionState.snapshot.blocks);
        setTasks(notionState.snapshot.tasks);
        setWrapup(notionState.snapshot.wrapup);
        setNotionPageId(notionState.pageId);
        clearNotified();
        if (notionState.warnings?.length) {
          const lines = notionState.warnings.map((w) => `"${w}"`).join(", ");
          showToast?.(
            `Notion: skipped ${notionState.warnings.length} malformed line(s): ${lines}`,
            "warn",
          );
        }
        setConfigStatus("ready");
        return;
      }

      const weekday = getWeekdayKey();
      const nextType =
        config.days[weekday] === undefined
          ? config.defaultType
          : config.days[weekday];
      const nextState = resolveInitialState(nextType, config.schedules);

      setSchedType(nextState.schedType);
      setBlocks(nextState.blocks);
      setTasks(nextState.tasks);
      setWrapup(nextState.wrapup);
      setNotionPageId(null);
      clearNotified();
      setConfigStatus("ready");
    };

    applyConfig();

    return () => {
      cancelled = true;
    };
  }, []);
};
