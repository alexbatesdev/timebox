import { toMin, parseTimeStr } from "../utils/time.js";

const VALID_TYPES = new Set(["work", "flex-work", "break", "meeting", "wrapup"]);

const DEFAULT_SCHEDULES = {
  standup: {
    label: "M-day",
    emoji: "🟣",
    blocks: [
      { id: "plan", label: "Plan the day", start: toMin(9, 0), end: toMin(9, 30), type: "work" },
      { id: "sdup", label: "Standup", start: toMin(9, 30), end: toMin(10, 0), type: "meeting" },
      { id: "A", label: "Block A", start: toMin(10, 0), end: toMin(11, 0), type: "work" },
      { id: "brk1", label: "Break", start: toMin(11, 0), end: toMin(11, 15), type: "break" },
      { id: "B", label: "Block B", start: toMin(11, 15), end: toMin(12, 45), type: "work" },
      { id: "lunch", label: "Lunch", start: toMin(12, 45), end: toMin(13, 15), type: "break" },
      { id: "C", label: "Block C", start: toMin(13, 15), end: toMin(14, 45), type: "work" },
      { id: "brk2", label: "Break", start: toMin(14, 45), end: toMin(15, 0), type: "break" },
      { id: "D", label: "Block D — Flex", start: toMin(15, 0), end: toMin(16, 45), type: "flex-work" },
      { id: "wrap", label: "Wrap up", start: toMin(16, 45), end: toMin(17, 0), type: "wrapup" },
    ],
  },
  noStandup: {
    label: "T-day",
    emoji: "🟡",
    blocks: [
      { id: "plan", label: "Plan the day", start: toMin(9, 0), end: toMin(9, 15), type: "work" },
      { id: "A", label: "Block A", start: toMin(9, 15), end: toMin(11, 0), type: "work" },
      { id: "brk1", label: "Break", start: toMin(11, 0), end: toMin(11, 15), type: "break" },
      { id: "B", label: "Block B", start: toMin(11, 15), end: toMin(12, 45), type: "work" },
      { id: "lunch", label: "Lunch", start: toMin(12, 45), end: toMin(13, 15), type: "break" },
      { id: "C", label: "Block C", start: toMin(13, 15), end: toMin(14, 45), type: "work" },
      { id: "brk2", label: "Break", start: toMin(14, 45), end: toMin(15, 0), type: "break" },
      { id: "D", label: "Block D — Flex", start: toMin(15, 0), end: toMin(16, 45), type: "flex-work" },
      { id: "wrap", label: "Wrap up", start: toMin(16, 45), end: toMin(17, 0), type: "wrapup" },
    ],
  },
};

const SCHEDULE_CONFIG = {
  defaultType: "noStandup",
  days: {
    monday: "standup",
    tuesday: "noStandup",
    wednesday: "standup",
    thursday: "noStandup",
    friday: "noStandup",
    saturday: "noStandup",
    sunday: "noStandup",
  },
  schedules: DEFAULT_SCHEDULES,
};

const parseBlockDef = (b) => ({
  id: b.id,
  label: b.label,
  start: typeof b.start === "string" ? parseTimeStr(b.start) : b.start,
  end: typeof b.end === "string" ? parseTimeStr(b.end) : b.end,
  type: VALID_TYPES.has(b.type) ? b.type : "work",
});

const parseSchedules = (raw) => {
  if (!raw || typeof raw !== "object") return DEFAULT_SCHEDULES;
  const result = {};
  for (const [key, sched] of Object.entries(raw)) {
    if (!sched.blocks || !Array.isArray(sched.blocks)) continue;
    result[key] = {
      label: sched.label || key,
      emoji: sched.emoji || "",
      blocks: sched.blocks.map(parseBlockDef),
    };
  }
  return Object.keys(result).length > 0 ? result : DEFAULT_SCHEDULES;
};

export const loadScheduleConfig = async () => {
  try {
    const res = await fetch("/schedule-config.json", { cache: "no-store" });
    if (!res.ok) return SCHEDULE_CONFIG;
    const data = await res.json();
    const schedules = parseSchedules(data.schedules);
    const scheduleTypes = Object.keys(schedules);
    return {
      defaultType: scheduleTypes.includes(data.defaultType) ? data.defaultType : scheduleTypes[0],
      days: { ...SCHEDULE_CONFIG.days, ...(data.days || {}) },
      schedules,
    };
  } catch {
    return SCHEDULE_CONFIG;
  }
};
