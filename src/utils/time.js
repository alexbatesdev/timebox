export const toMin = (h, m) => h * 60 + m;
export const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
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
export const todayKey = () => `timebox-${new Date().toISOString().slice(0, 10)}`;
export const getWeekdayKey = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
export const fmtTimeShort = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")}`;
};
export const workdayHour = (h) => (h >= 1 && h <= 8 ? h + 12 : h);
export const parseTimeStr = (str) => {
  const [h, m] = str.split(":").map(Number);
  return workdayHour(h) * 60 + (m || 0);
};
