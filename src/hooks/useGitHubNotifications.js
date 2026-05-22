import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isGitHubConfigured,
  fetchNotifications,
  fetchSecondaryNotifications,
  fetchSearchResults,
  fetchPullRequestChecks,
  fetchDependabotAlerts,
  fetchCurrentUser,
  markThreadRead,
  markThreadDone,
} from "../github/api.js";
import { classifyTier, getSecondaryReasons } from "../github/rules.js";
import {
  loadPanelSections,
  collectSearchSections,
  collectDependabotSections,
  getNotificationRules,
  DEFAULT_PANEL_SECTIONS,
} from "../github/panelSections.js";
import { usePinned } from "./usePinned.js";

const POLL_INTERVAL = 60_000;
const DISMISSED_KEY = "timebox-gh-dismissed";

const loadDismissed = () => {
  const raw = localStorage.getItem(DISMISSED_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
};

const saveDismissed = (set) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
};

export const useGitHubNotifications = () => {
  const configured = isGitHubConfigured();
  const { pinnedIds, togglePin } = usePinned("timebox-gh-pinned");
  const { pinnedIds: activeIds, togglePin: toggleActive } = usePinned(
    "timebox-gh-active",
  );
  const [notifications, setNotifications] = useState([]);
  const [secondaryNotifications, setSecondaryNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelSections, setPanelSections] = useState(DEFAULT_PANEL_SECTIONS);
  const pollTimeoutRef = useRef(null);
  const dismissedRef = useRef(loadDismissed());

  useEffect(() => {
    let cancelled = false;
    loadPanelSections().then((loaded) => {
      if (!cancelled) setPanelSections(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rules = useMemo(() => getNotificationRules(panelSections), [panelSections]);
  const notificationsEnabled = rules !== null;

  const doFetch = useCallback(async () => {
    if (!configured || !notificationsEnabled) return;
    const data = await fetchNotifications();
    setNotifications(data.filter((n) => !dismissedRef.current.has(n.id)));
  }, [configured, notificationsEnabled]);

  const reload = useCallback(async () => {
    if (!configured || !notificationsEnabled) return;
    setLoading(true);
    await doFetch();
    setLoading(false);
  }, [configured, notificationsEnabled, doFetch]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // Polling with recursive setTimeout
  useEffect(() => {
    if (!configured || !notificationsEnabled) return;
    const schedulePoll = () => {
      pollTimeoutRef.current = setTimeout(async () => {
        try {
          await doFetch();
        } catch (err) {
          console.error("GitHub poll error:", err);
        }
        schedulePoll();
      }, POLL_INTERVAL);
    };
    schedulePoll();
    return () => clearTimeout(pollTimeoutRef.current);
  }, [configured, notificationsEnabled, doFetch]);

  const markRead = useCallback(
    async (threadId) => {
      const mark = (n) => (n.id === threadId ? { ...n, unread: false } : n);
      setNotifications((prev) => prev.map(mark));
      setSecondaryNotifications((prev) => prev.map(mark));
      try {
        await markThreadRead(threadId);
      } catch {
        reload();
      }
    },
    [reload],
  );

  const markDone = useCallback(
    async (threadId) => {
      dismissedRef.current.add(threadId);
      saveDismissed(dismissedRef.current);
      setNotifications((prev) => prev.filter((n) => n.id !== threadId));
      try {
        await markThreadDone(threadId);
      } catch {
        reload();
      }
    },
    [reload],
  );

  const markAllRead = useCallback(
    async (threadIds) => {
      const idSet = new Set(threadIds.map(String));
      const markUnread = (n) =>
        idSet.has(String(n.id)) ? { ...n, unread: false } : n;
      setNotifications((prev) => prev.map(markUnread));
      setSecondaryNotifications((prev) => prev.map(markUnread));
      try {
        await Promise.all(threadIds.map(markThreadRead));
      } catch {
        reload();
      }
    },
    [reload],
  );

  const deleteAll = useCallback(
    async (threadIds) => {
      const idSet = new Set(threadIds);
      idSet.forEach((id) => dismissedRef.current.add(id));
      saveDismissed(dismissedRef.current);
      setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      setSecondaryNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      try {
        await Promise.all(threadIds.map(markThreadDone));
      } catch {
        reload();
      }
    },
    [reload],
  );

  const [searchResults, setSearchResults] = useState({});
  const [prChecks, setPrChecks] = useState({});

  const loadSearchResults = useCallback(async () => {
    if (!configured) return;
    try {
      const searchSections = collectSearchSections(panelSections);
      const results = await Promise.all(
        searchSections.map(async (section) => {
          try {
            const items = await fetchSearchResults(section.query);
            return [section.id, items];
          } catch (err) {
            console.error(
              `GitHub search fetch failed for section "${section.id}":`,
              err,
            );
            return [section.id, []];
          }
        }),
      );
      const resultMap = Object.fromEntries(results);
      setSearchResults(resultMap);
      const seen = new Set();
      const prs = [];
      for (const items of Object.values(resultMap)) {
        for (const item of items) {
          if (!item.url || !item.url.includes("/pull/")) continue;
          if (!item.repo || typeof item.number !== "number") continue;
          const key = `${item.repo}#${item.number}`;
          if (seen.has(key)) continue;
          seen.add(key);
          prs.push({ repo: item.repo, number: item.number });
        }
      }
      if (prs.length === 0) {
        setPrChecks({});
        return;
      }
      try {
        const checks = await fetchPullRequestChecks(prs);
        setPrChecks(Object.fromEntries(checks));
      } catch (err) {
        console.error("GitHub PR checks fetch failed:", err);
        setPrChecks({});
      }
    } catch (err) {
      console.error("GitHub search fetch error:", err);
    }
  }, [configured, panelSections]);

  const [dependabotAlerts, setDependabotAlerts] = useState({});

  const loadDependabotAlerts = useCallback(async () => {
    if (!configured) return;
    const sections = collectDependabotSections(panelSections);
    if (sections.length === 0) {
      setDependabotAlerts({});
      return;
    }
    const needsMe = sections.some(
      (s) => s.filters && Object.values(s.filters).some((v) => typeof v === "string" && v.includes("@me")),
    );
    let meLogin = null;
    if (needsMe) {
      try {
        const me = await fetchCurrentUser();
        meLogin = me?.login || null;
      } catch (err) {
        console.error("GitHub /user fetch failed (needed for @me):", err);
      }
    }
    const results = await Promise.all(
      sections.map(async (section) => {
        try {
          const filters = {};
          for (const [key, value] of Object.entries(section.filters || {})) {
            if (typeof value === "string" && value.includes("@me")) {
              if (!meLogin) continue;
              filters[key] = value.replace(/@me/g, meLogin);
            } else {
              filters[key] = value;
            }
          }
          const items = await fetchDependabotAlerts(section.repo, filters);
          return [section.id, items];
        } catch (err) {
          console.error(
            `GitHub dependabot fetch failed for section "${section.id}":`,
            err,
          );
          return [section.id, []];
        }
      }),
    );
    setDependabotAlerts(Object.fromEntries(results));
  }, [configured, panelSections]);

  const secondaryReasons = useMemo(
    () => (rules ? getSecondaryReasons(rules) : []),
    [rules],
  );

  const loadSecondary = useCallback(async () => {
    if (!configured || !notificationsEnabled) return;
    try {
      const data = await fetchSecondaryNotifications(secondaryReasons);
      setSecondaryNotifications(
        data.filter((n) => !dismissedRef.current.has(n.id)),
      );
    } catch (err) {
      console.error("GitHub secondary fetch error:", err);
    }
  }, [configured, notificationsEnabled, secondaryReasons]);

  const grouped = useMemo(() => {
    if (!rules) return [];
    const buckets = new Map(rules.categories.map((c) => [c.id, []]));
    const seenIds = new Set();
    const place = (n) => {
      if (seenIds.has(n.id)) return;
      seenIds.add(n.id);
      const tierId = classifyTier(n.reason, rules);
      const bucket = buckets.get(tierId);
      if (bucket) bucket.push(n);
    };
    for (const n of notifications) place(n);
    for (const n of secondaryNotifications) place(n);
    const byPinnedThenRecent = (a, b) => {
      const ap = pinnedIds.has(String(a.id)) ? 0 : 1;
      const bp = pinnedIds.has(String(b.id)) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.updated_at) - new Date(a.updated_at);
    };
    return rules.categories.map((c) => {
      const items = buckets.get(c.id) || [];
      items.sort(byPinnedThenRecent);
      return {
        id: c.id,
        label: c.label,
        defaultExpanded: c.defaultExpanded !== false,
        items,
      };
    });
  }, [notifications, secondaryNotifications, pinnedIds, rules]);

  const sortedSearchResults = useMemo(() => {
    const byPinned = (a, b) => {
      const ap = pinnedIds.has(String(a.id)) ? 0 : 1;
      const bp = pinnedIds.has(String(b.id)) ? 0 : 1;
      return ap - bp;
    };
    const out = {};
    for (const [id, items] of Object.entries(searchResults)) {
      out[id] = items
        .map((item) => {
          const checks = prChecks[`${item.repo}#${item.number}`];
          return checks ? { ...item, ...checks } : item;
        })
        .sort(byPinned);
    }
    return out;
  }, [searchResults, prChecks, pinnedIds]);

  const sortedDependabotAlerts = useMemo(() => {
    const byPinned = (a, b) => {
      const ap = pinnedIds.has(String(a.id)) ? 0 : 1;
      const bp = pinnedIds.has(String(b.id)) ? 0 : 1;
      return ap - bp;
    };
    const out = {};
    for (const [id, items] of Object.entries(dependabotAlerts)) {
      out[id] = [...items].sort(byPinned);
    }
    return out;
  }, [dependabotAlerts, pinnedIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications],
  );

  return {
    configured,
    notifications,
    grouped,
    unreadCount,
    loading,
    reload,
    markRead,
    markDone,
    markAllRead,
    deleteAll,
    pinnedIds,
    togglePin,
    activeIds,
    toggleActive,
    loadSecondary,
    searchResults: sortedSearchResults,
    panelSections,
    loadSearchResults,
    dependabotAlerts: sortedDependabotAlerts,
    loadDependabotAlerts,
  };
};
