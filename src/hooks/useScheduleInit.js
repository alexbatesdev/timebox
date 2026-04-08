import { useEffect } from "react";
import { getWeekdayKey } from "../utils/time.js";
import { loadState } from "../utils/storage.js";
import { loadScheduleConfig } from "../data/scheduleConfig.js";
import { resolveInitialState } from "../data/schedules.js";
import { loadTodayFromNotion } from "../notion/api.js";

export const useScheduleInit = ({
  setSchedType,
  setBlocks,
  setTasks,
  setWrapup,
  setNotionPageId,
  setConfigStatus,
  setConfig,
  clearNotified,
}) => {
  useEffect(() => {
    let cancelled = false;

    const applyConfig = async () => {
      const saved = loadState();
      if (saved?.schedType) {
        setSchedType(saved.schedType);
        setBlocks(saved.blocks ?? []);
        setTasks(saved.tasks ?? {});
        setWrapup(saved.wrapup ?? { left: "", next: "" });
        setNotionPageId(saved.notionPageId ?? null);
        clearNotified();
        // Still load config for labels/emoji/schedule templates
        const config = await loadScheduleConfig();
        if (!cancelled) setConfig(config);
        setConfigStatus("ready");
        return;
      }

      const token = import.meta.env.VITE_NOTION_TOKEN;
      let notionState = null;
      try {
        notionState = await loadTodayFromNotion(token);
      } catch {
        notionState = null;
      }
      if (cancelled) return;

      if (notionState?.snapshot) {
        setSchedType(notionState.snapshot.schedType);
        setBlocks(notionState.snapshot.blocks);
        setTasks(notionState.snapshot.tasks);
        setWrapup(notionState.snapshot.wrapup);
        setNotionPageId(notionState.pageId);
        clearNotified();
        const config = await loadScheduleConfig();
        if (!cancelled) setConfig(config);
        setConfigStatus("ready");
        return;
      }

      const config = await loadScheduleConfig();
      if (cancelled) return;

      setConfig(config);

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
