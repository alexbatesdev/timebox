import { DEFAULT_AGE_THRESHOLDS } from "./format.js";

export const DEFAULT_PR_SECTIONS = [
  {
    id: "review-requests",
    title: "Awaiting My Review",
    query: "is:pr is:open draft:false user-review-requested:@me sort:updated-desc",
    accentColor: "#3b82f6",
    defaultExpanded: true,
    ageThresholds: DEFAULT_AGE_THRESHOLDS.reviewRequests,
  },
  {
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

const validatePRSections = (data) => {
  if (!data || !Array.isArray(data.sections)) {
    return "sections must be an array";
  }
  const seenIds = new Set();
  for (const s of data.sections) {
    if (typeof s.id !== "string" || !s.id) return "section needs a non-empty id";
    if (seenIds.has(s.id)) return `duplicate section id "${s.id}"`;
    seenIds.add(s.id);
    if (typeof s.title !== "string") return `section "${s.id}" needs a title`;
    if (typeof s.query !== "string" || !s.query) {
      return `section "${s.id}" needs a non-empty query`;
    }
    if (s.ageThresholds !== undefined && !validateThresholds(s.ageThresholds)) {
      return `section "${s.id}" has invalid ageThresholds`;
    }
  }
  return null;
};

const normalizeSection = (s) => ({
  id: s.id,
  title: s.title,
  query: s.query,
  accentColor: typeof s.accentColor === "string" ? s.accentColor : null,
  defaultExpanded: s.defaultExpanded !== false,
  ageThresholds: Array.isArray(s.ageThresholds)
    ? s.ageThresholds
    : DEFAULT_AGE_THRESHOLDS.mine,
});

export const loadPRSections = async () => {
  try {
    const res = await fetch("/github-pr-sections.json", { cache: "no-store" });
    if (!res.ok) return DEFAULT_PR_SECTIONS;
    const data = await res.json();
    const err = validatePRSections(data);
    if (err) {
      console.warn(
        `Invalid github-pr-sections.json: ${err}. Using defaults.`,
      );
      return DEFAULT_PR_SECTIONS;
    }
    return data.sections.map(normalizeSection);
  } catch (err) {
    console.warn("Failed to load github-pr-sections.json:", err);
    return DEFAULT_PR_SECTIONS;
  }
};
