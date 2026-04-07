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
        setConfigStatus("ready");
        return;
      }

      const config = await loadScheduleConfig();
      if (cancelled) return;

      const weekday = getWeekdayKey();
      const nextType =
        config.days[weekday] === "standup" ||
        config.days[weekday] === "noStandup"
          ? config.days[weekday]
          : config.defaultType;
      const nextState = resolveInitialState(nextType);

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
