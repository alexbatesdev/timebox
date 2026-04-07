import { useEffect } from "react";
import { saveState } from "../utils/storage.js";

export const usePersist = (schedType, blocks, tasks, wrapup, notionPageId) => {
  useEffect(() => {
    if (schedType === null) return;
    saveState({ schedType, blocks, tasks, wrapup, notionPageId });
  }, [schedType, blocks, tasks, wrapup, notionPageId]);
};
