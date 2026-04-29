export function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export const DEFAULT_AGE_THRESHOLDS = {
  reviewRequests: [
    { minHours: 0, color: "#6b7280" },
    { minHours: 8, color: "#e5e7eb" },
    { minHours: 16, color: "#f59e0b" },
    { minHours: 72, color: "#dc2626", titleColor: "#dc2626" },
  ],
  mine: [
    { minHours: 0, color: "#6b7280" },
    { minHours: 8, color: "#e5e7eb" },
    { minHours: 16, color: "#f59e0b" },
    { minHours: 168, color: "#dc2626", titleColor: "#dc2626" },
  ],
};

export function getAgeColors(dateStr, thresholds) {
  const hours = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  let timeColor = "#6b7280";
  let titleColor = null;
  for (const t of thresholds) {
    if (hours >= t.minHours) {
      timeColor = t.color;
      titleColor = t.titleColor || null;
    }
  }
  return { timeColor, titleColor };
}

export function reasonLabel(reason) {
  const labels = {
    mention: "Mentioned",
    review_requested: "Review",
    assign: "Assigned",
    team_mention: "Team",
    comment: "Comment",
    author: "Author",
    state_change: "Changed",
    subscribed: "Watching",
    ci_activity: "CI",
  };
  return labels[reason] || reason;
}

export function reasonColor(reason) {
  const colors = {
    mention: "#f59e0b",
    review_requested: "#a855f7",
    assign: "#3b82f6",
    team_mention: "#f59e0b",
    comment: "#6b7280",
    author: "#6b7280",
    state_change: "#22c55e",
    subscribed: "#4b5563",
    ci_activity: "#4b5563",
  };
  return colors[reason] || "#4b5563";
}
