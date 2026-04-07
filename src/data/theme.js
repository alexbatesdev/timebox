export const TC = {
  work: { bg: "#0f2040", border: "#3b82f6", accent: "#93c5fd", dot: "#3b82f6" },
  "flex-work": {
    bg: "#0f2040",
    border: "#60a5fa",
    accent: "#bfdbfe",
    dot: "#60a5fa",
  },
  break: {
    bg: "#0d2a1a",
    border: "#22c55e",
    accent: "#86efac",
    dot: "#22c55e",
  },
  meeting: {
    bg: "#1e0f3a",
    border: "#a855f7",
    accent: "#d8b4fe",
    dot: "#a855f7",
  },
  wrapup: {
    bg: "#2a1500",
    border: "#f97316",
    accent: "#fdba74",
    dot: "#f97316",
  },
  away: {
    bg: "#2a2200",
    border: "#eab308",
    accent: "#fde047",
    dot: "#eab308",
  },
};

export const isWorkType = (t) => t === "work" || t === "flex-work";
