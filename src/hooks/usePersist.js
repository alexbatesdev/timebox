import { useEffect, useRef } from "react";
import { todayKey } from "../utils/time.js";
import { saveState } from "../utils/storage.js";

export const usePersist = (schedType, blocks, tasks, wrapup, notionPageId) => {
  const initKey = useRef(todayKey());

  useEffect(() => {
    if (schedType === null) return;
    if (todayKey() !== initKey.current) return;
    saveState({ schedType, blocks, tasks, wrapup, notionPageId });
  }, [schedType, blocks, tasks, wrapup, notionPageId]);
};
