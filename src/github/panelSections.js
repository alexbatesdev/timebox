import { DEFAULT_AGE_THRESHOLDS } from "./format.js";
import {
  DEFAULT_NOTIFICATION_RULES,
  validateNotificationRules,
  normalizeNotificationRules,
} from "./rules.js";

export const DEFAULT_PANEL_SECTIONS = [
  {
    type: "group",
    id: "prs",
    title: "PRs",
    defaultExpanded: true,
    sections: [
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
    ],
  },
];

const validateThresholds = (thresholds) => {
  if (!Array.isArray(thresholds)) return false;
  return thresholds.every(
    (t) => typeof t.minHours === "number" && typeof t.color === "string",
  );
};

const validateSectionsArray = (sections, ctx) => {
  if (!Array.isArray(sections)) return "sections must be an array";
  for (const s of sections) {
    if (s.type === "notifications") {
      ctx.notificationsCount++;
      if (ctx.notificationsCount > 1) {
        return "only one section may have type \"notifications\"";
      }
      if (s.settings !== undefined) {
        const settingsErr = validateNotificationRules(s.settings);
        if (settingsErr) {
          return `notifications settings: ${settingsErr}`;
        }
      }
      continue;
    }
    if (s.type === "search") {
      if (typeof s.id !== "string" || !s.id) return "search section needs a non-empty id";
      if (ctx.seenSearchIds.has(s.id)) return `duplicate search section id "${s.id}"`;
      ctx.seenSearchIds.add(s.id);
      if (typeof s.title !== "string") return `search section "${s.id}" needs a title`;
      if (typeof s.query !== "string" || !s.query) {
        return `search section "${s.id}" needs a non-empty query`;
      }
      if (s.ageThresholds !== undefined && !validateThresholds(s.ageThresholds)) {
        return `search section "${s.id}" has invalid ageThresholds`;
      }
      continue;
    }
    if (s.type === "dependabot") {
      if (typeof s.id !== "string" || !s.id) return "dependabot section needs a non-empty id";
      if (ctx.seenDependabotIds.has(s.id)) return `duplicate dependabot section id "${s.id}"`;
      ctx.seenDependabotIds.add(s.id);
      if (typeof s.title !== "string") return `dependabot section "${s.id}" needs a title`;
      if (typeof s.repo !== "string" || !/^[^/\s]+\/[^/\s]+$/.test(s.repo)) {
        return `dependabot section "${s.id}" needs a repo in "owner/repo" form`;
      }
      if (s.filters !== undefined && (typeof s.filters !== "object" || Array.isArray(s.filters))) {
        return `dependabot section "${s.id}" filters must be an object`;
      }
      if (s.ageThresholds !== undefined && !validateThresholds(s.ageThresholds)) {
        return `dependabot section "${s.id}" has invalid ageThresholds`;
      }
      continue;
    }
    if (s.type === "group") {
      if (typeof s.id !== "string" || !s.id) return "group section needs a non-empty id";
      if (ctx.seenGroupIds.has(s.id)) return `duplicate group section id "${s.id}"`;
      ctx.seenGroupIds.add(s.id);
      if (typeof s.title !== "string") return `group section "${s.id}" needs a title`;
      const childErr = validateSectionsArray(s.sections, ctx);
      if (childErr) return childErr;
      continue;
    }
    return `unknown section type "${s.type}"`;
  }
  return null;
};

export const validatePanelSections = (data) => {
  if (!data || !Array.isArray(data.sections)) {
    return "sections must be an array";
  }
  return validateSectionsArray(data.sections, {
    notificationsCount: 0,
    seenSearchIds: new Set(),
    seenGroupIds: new Set(),
    seenDependabotIds: new Set(),
  });
};

const normalizeSection = (s) => {
  if (s.type === "notifications") {
    return {
      type: "notifications",
      settings: s.settings
        ? normalizeNotificationRules(s.settings)
        : DEFAULT_NOTIFICATION_RULES,
    };
  }
  if (s.type === "group") {
    return {
      type: "group",
      id: s.id,
      title: s.title,
      defaultExpanded: s.defaultExpanded !== false,
      sections: s.sections.map(normalizeSection),
    };
  }
  if (s.type === "dependabot") {
    return {
      type: "dependabot",
      id: s.id,
      title: s.title,
      repo: s.repo,
      filters: s.filters && typeof s.filters === "object" ? { ...s.filters } : {},
      accentColor: typeof s.accentColor === "string" ? s.accentColor : null,
      defaultExpanded: s.defaultExpanded !== false,
      ageThresholds: Array.isArray(s.ageThresholds)
        ? s.ageThresholds
        : DEFAULT_AGE_THRESHOLDS.mine,
    };
  }
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

// Recursively collect all "search" sections from a tree of panel sections.
export const collectSearchSections = (sections) => {
  const out = [];
  for (const s of sections) {
    if (s.type === "search") out.push(s);
    else if (s.type === "group") out.push(...collectSearchSections(s.sections));
  }
  return out;
};

// Recursively collect all "dependabot" sections from a tree of panel sections.
export const collectDependabotSections = (sections) => {
  const out = [];
  for (const s of sections) {
    if (s.type === "dependabot") out.push(s);
    else if (s.type === "group") out.push(...collectDependabotSections(s.sections));
  }
  return out;
};

const findNotificationSettings = (sections) => {
  for (const s of sections) {
    if (s.type === "notifications") return s.settings || null;
    if (s.type === "group") {
      const found = findNotificationSettings(s.sections);
      if (found) return found;
    }
  }
  return null;
};

// Walk the tree, find the notifications section (if present), return its settings.
// Returns null if no notifications section exists — callers should treat that as
// "notifications disabled" and skip fetching/polling entirely.
export const getNotificationRules = (sections) =>
  findNotificationSettings(sections);

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
