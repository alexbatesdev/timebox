import { useEffect } from "react";
import { getWeekdayKey } from "../utils/time.js";
import { loadState, loadPreviousWrapup } from "../utils/storage.js";
import { loadScheduleConfig } from "../data/scheduleConfig.js";
import { resolveInitialState } from "../data/schedules.js";
import { loadPreviousWrapupFromNotion } from "../notion/api.js";

export const useScheduleInit = ({
  setSchedType,
  setBlocks,
  setTasks,
  setWrapup,
  setPreviousWrapup,
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
        clearNotified();
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
      clearNotified();
      setConfigStatus("ready");
    };

    applyConfig();

    return () => {
      cancelled = true;
    };
  }, []);
};
