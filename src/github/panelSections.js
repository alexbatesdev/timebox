import { DEFAULT_AGE_THRESHOLDS } from "./format.js";

export const DEFAULT_PANEL_SECTIONS = [
  { type: "notifications" },
  {
    type: "search",
    id: "review-requests",
    title: "Awaiting My Review",
    query: "is:pr is:open draft:false user-review-requested:@me sort:updated-desc",
    accentColor: "#3b82f6",
    defaultExpanded: true,
    ageThresholds: DEFAULT_AGE_THRESHOLDS.reviewRequests,
  },
  {
    type: "search",
    id: "my-prs",
    title: "My Open PRs",
    query: "is:pr is:open author:@me sort:updated-desc",
    accentColor: "#22c55e",
    defaultExpanded: true,
    ageThresholds: DEFAULT_AGE_THRESHOLDS.mine,
  },
];

const validateThresholds = (thresholds) => {
  if (!Array.isArray(thresholds)) return false;
  return thresholds.every(
    (t) => typeof t.minHours === "number" && typeof t.color === "string",
  );
};

export const validatePanelSections = (data) => {
  if (!data || !Array.isArray(data.sections)) {
    return "sections must be an array";
  }
  let notificationsCount = 0;
  const seenSearchIds = new Set();
  for (const s of data.sections) {
    if (s.type === "notifications") {
      notificationsCount++;
      if (notificationsCount > 1) {
        return "only one section may have type \"notifications\"";
      }
      continue;
    }
    if (s.type !== "search") {
      return `unknown section type "${s.type}"`;
    }
    if (typeof s.id !== "string" || !s.id) return "search section needs a non-empty id";
    if (seenSearchIds.has(s.id)) return `duplicate search section id "${s.id}"`;
    seenSearchIds.add(s.id);
    if (typeof s.title !== "string") return `search section "${s.id}" needs a title`;
    if (typeof s.query !== "string" || !s.query) {
      return `search section "${s.id}" needs a non-empty query`;
    }
    if (s.ageThresholds !== undefined && !validateThresholds(s.ageThresholds)) {
      return `search section "${s.id}" has invalid ageThresholds`;
    }
  }
  return null;
};

const normalizeSection = (s) => {
  if (s.type === "notifications") return { type: "notifications" };
  return {
    type: "search",
    id: s.id,
    title: s.title,
    query: s.query,
    accentColor: typeof s.accentColor === "string" ? s.accentColor : null,
    defaultExpanded: s.defaultExpanded !== false,
    ageThresholds: Array.isArray(s.ageThresholds)
      ? s.ageThresholds
      : DEFAULT_AGE_THRESHOLDS.mine,
  };
};

export const loadPanelSections = async () => {
  try {
    const res = await fetch("/github-panel-sections.json", { cache: "no-store" });
    if (!res.ok) return DEFAULT_PANEL_SECTIONS;
    const data = await res.json();
    const err = validatePanelSections(data);
    if (err) {
      console.warn(
        `Invalid github-panel-sections.json: ${err}. Using defaults.`,
      );
      return DEFAULT_PANEL_SECTIONS;
    }
    return data.sections.map(normalizeSection);
  } catch (err) {
    console.warn("Failed to load github-panel-sections.json:", err);
    return DEFAULT_PANEL_SECTIONS;
  }
};
