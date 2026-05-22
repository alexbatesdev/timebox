export const TIME_FORMATS = ["lazyOpinionated", "12h", "24h"];
export const DEFAULT_TIME_FORMAT = "lazyOpinionated";

export const toMin = (h, m) => h * 60 + m;

const padded = (n) => String(n).padStart(2, "0");

export const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${padded(m)} ${ap}`;
};

export const getNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const fmtDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const localDateISO = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayKey = () => `timebox-${localDateISO()}`;

// Schedule keys are intentionally English (matching the keys in schedule-config.json).
// This is not a display string, so it does not vary by user locale.
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
export const getWeekdayKey = () => WEEKDAY_KEYS[new Date().getDay()];

const parseLazy = (str) => {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const hour = h >= 1 && h <= 8 ? h + 12 : h;
  return hour * 60 + min;
};

const parse12h = (str) => {
  const m = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  if (h === 12) h = 0;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + min;
};

const parse24h = (str) => {
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

export const parseTimeStr = (str, format = DEFAULT_TIME_FORMAT) => {
  const trimmed = String(str).trim();
  let mins = null;
  if (format === "lazyOpinionated") mins = parseLazy(trimmed);
  else if (format === "12h") mins = parse12h(trimmed);
  else if (format === "24h") mins = parse24h(trimmed);
  else throw new Error(`Unknown timeFormat: ${format}`);
  if (mins === null) {
    throw new Error(`Invalid time string for ${format}: "${str}"`);
  }
  return mins;
};

const formatLazy = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${padded(m)}`;
};

const format12h = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${padded(m)} ${ap}`;
};

const format24h = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${padded(h)}:${padded(m)}`;
};

export const fmtTimeShort = (mins, format = DEFAULT_TIME_FORMAT) => {
  if (format === "lazyOpinionated") return formatLazy(mins);
  if (format === "12h") return format12h(mins);
  if (format === "24h") return format24h(mins);
  throw new Error(`Unknown timeFormat: ${format}`);
};

// Regex fragment matching a time string in the given format.
// Used to build the legacy Notion block-title parser regex.
export const timePatternFor = (format) => {
  if (format === "12h") return "\\d{1,2}:\\d{2}\\s*(?:AM|PM)";
  return "\\d{1,2}:\\d{2}";
};
