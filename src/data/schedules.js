import { loadState } from "../utils/storage.js";

export const createScheduleState = (type, schedules) => {
  const template = schedules[type];
  if (!template) return null;
  const blocks = template.blocks.map((b) => ({ ...b }));
  const tasks = {};
  blocks.forEach((b) => {
    tasks[b.id] = "";
  });
  return {
    schedType: type,
    blocks,
    tasks,
    wrapup: { left: "", next: "" },
  };
};

export const resolveInitialState = (type, schedules) => {
  const saved = loadState();
  if (saved?.schedType === type) {
    return {
      schedType: saved.schedType,
      blocks: saved.blocks ?? [],
      tasks: saved.tasks ?? {},
      wrapup: saved.wrapup ?? { left: "", next: "" },
    };
  }
  return createScheduleState(type, schedules);
};
