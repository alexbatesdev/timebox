export const DEFAULT_NOTIFICATION_RULES = {
  categories: [
    {
      id: "newStuff",
      label: "New Stuff",
      reasons: ["review_requested", "assign"],
      frequent: true,
      defaultExpanded: true,
    },
    {
      id: "updates",
      label: "Updates",
      reasons: ["mention", "team_mention", "comment", "author", "state_change"],
      frequent: true,
      defaultExpanded: true,
    },
    {
      id: "noise",
      label: "Noise",
      fallback: true,
      frequent: false,
      defaultExpanded: false,
    },
  ],
};

export const validateNotificationRules = (data) => {
  if (!data || !Array.isArray(data.categories) || data.categories.length === 0) {
    return "categories must be a non-empty array";
  }
  const fallbackCount = data.categories.filter((c) => c.fallback === true).length;
  if (fallbackCount !== 1) {
    return `exactly one category must have "fallback": true (found ${fallbackCount})`;
  }
  for (const c of data.categories) {
    if (!c.id || typeof c.id !== "string") {
      return "each category needs a string id";
    }
    if (!c.label || typeof c.label !== "string") {
      return `category "${c.id}" needs a string label`;
    }
    if (!c.fallback && !Array.isArray(c.reasons)) {
      return `category "${c.id}" needs a reasons array (or fallback: true)`;
    }
    if (c.frequent !== undefined && typeof c.frequent !== "boolean") {
      return `category "${c.id}" frequent must be a boolean`;
    }
  }
  return null;
};

export const normalizeNotificationRules = (data) => ({
  categories: data.categories.map((c) => ({
    id: c.id,
    label: c.label,
    reasons: c.reasons || [],
    fallback: !!c.fallback,
    frequent: c.frequent !== undefined ? !!c.frequent : !c.fallback,
    defaultExpanded: c.defaultExpanded !== false,
  })),
});

export const getSecondaryReasons = (rules) => {
  const out = new Set();
  for (const c of rules.categories) {
    if (c.fallback || c.frequent) continue;
    for (const r of c.reasons) out.add(r);
  }
  return [...out];
};

export const classifyTier = (reason, rules) => {
  for (const c of rules.categories) {
    if (c.fallback) continue;
    if (c.reasons.includes(reason)) return c.id;
  }
  const fallback = rules.categories.find((c) => c.fallback);
  return fallback ? fallback.id : null;
};
