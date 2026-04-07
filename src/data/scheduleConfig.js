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
};

export const loadScheduleConfig = async () => {
  try {
    const res = await fetch("/schedule-config.json", { cache: "no-store" });
    if (!res.ok) return SCHEDULE_CONFIG;
    const data = await res.json();
    return {
      defaultType: data.defaultType === "standup" ? "standup" : "noStandup",
      days: { ...SCHEDULE_CONFIG.days, ...(data.days || {}) },
    };
  } catch {
    return SCHEDULE_CONFIG;
  }
};
