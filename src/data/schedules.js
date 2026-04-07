import { toMin } from "../utils/time.js";
import { loadState } from "../utils/storage.js";

export const SCHEDULES = {
  standup: [
    {
      id: "plan",
      label: "Plan the day",
      start: toMin(9, 0),
      end: toMin(9, 30),
      type: "work",
    },
    {
      id: "sdup",
      label: "Standup",
      start: toMin(9, 30),
      end: toMin(10, 0),
      type: "meeting",
    },
    {
      id: "A",
      label: "Block A",
      start: toMin(10, 0),
      end: toMin(11, 0),
      type: "work",
    },
    {
      id: "brk1",
      label: "Break",
      start: toMin(11, 0),
      end: toMin(11, 15),
      type: "break",
    },
    {
      id: "B",
      label: "Block B",
      start: toMin(11, 15),
      end: toMin(12, 45),
      type: "work",
    },
    {
      id: "lunch",
      label: "Lunch",
      start: toMin(12, 45),
      end: toMin(13, 15),
      type: "break",
    },
    {
      id: "C",
      label: "Block C",
      start: toMin(13, 15),
      end: toMin(14, 45),
      type: "work",
    },
    {
      id: "brk2",
      label: "Break",
      start: toMin(14, 45),
      end: toMin(15, 0),
      type: "break",
    },
    {
      id: "D",
      label: "Block D — Flex",
      start: toMin(15, 0),
      end: toMin(16, 45),
      type: "flex-work",
    },
    {
      id: "wrap",
      label: "Wrap up",
      start: toMin(16, 45),
      end: toMin(17, 0),
      type: "wrapup",
    },
  ],
  noStandup: [
    {
      id: "plan",
      label: "Plan the day",
      start: toMin(9, 0),
      end: toMin(9, 15),
      type: "work",
    },
    {
      id: "A",
      label: "Block A",
      start: toMin(9, 15),
      end: toMin(11, 0),
      type: "work",
    },
    {
      id: "brk1",
      label: "Break",
      start: toMin(11, 0),
      end: toMin(11, 15),
      type: "break",
    },
    {
      id: "B",
      label: "Block B",
      start: toMin(11, 15),
      end: toMin(12, 45),
      type: "work",
    },
    {
      id: "lunch",
      label: "Lunch",
      start: toMin(12, 45),
      end: toMin(13, 15),
      type: "break",
    },
    {
      id: "C",
      label: "Block C",
      start: toMin(13, 15),
      end: toMin(14, 45),
      type: "work",
    },
    {
      id: "brk2",
      label: "Break",
      start: toMin(14, 45),
      end: toMin(15, 0),
      type: "break",
    },
    {
      id: "D",
      label: "Block D — Flex",
      start: toMin(15, 0),
      end: toMin(16, 45),
      type: "flex-work",
    },
    {
      id: "wrap",
      label: "Wrap up",
      start: toMin(16, 45),
      end: toMin(17, 0),
      type: "wrapup",
    },
  ],
};

export const createScheduleState = (type) => {
  const blocks = SCHEDULES[type].map((b) => ({ ...b }));
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

export const resolveInitialState = (type) => {
  const saved = loadState();
  if (saved?.schedType === type) {
    return {
      schedType: saved.schedType,
      blocks: saved.blocks ?? [],
      tasks: saved.tasks ?? {},
      wrapup: saved.wrapup ?? { left: "", next: "" },
    };
  }
  return createScheduleState(type);
};
