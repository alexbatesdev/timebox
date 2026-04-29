import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isGitHubConfigured,
  fetchNotifications,
  fetchNoiseNotifications,
  fetchMyPRs,
  fetchReviewRequests,
  markThreadRead,
  markThreadDone,
} from "../github/api.js";
import {
  classifyTier,
  loadNotificationRules,
  DEFAULT_NOTIFICATION_RULES,
} from "../github/rules.js";
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
  const [notifications, setNotifications] = useState([]);
  const [noiseNotifications, setNoiseNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState(DEFAULT_NOTIFICATION_RULES);
  const pollTimeoutRef = useRef(null);
  const dismissedRef = useRef(loadDismissed());

  useEffect(() => {
    let cancelled = false;
    loadNotificationRules().then((loaded) => {
      if (!cancelled) setRules(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const doFetch = useCallback(async () => {
    if (!configured) return;
    const data = await fetchNotifications();
    setNotifications(data.filter((n) => !dismissedRef.current.has(n.id)));
  }, [configured]);

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    await doFetch();
    setLoading(false);
  }, [configured, doFetch]);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // Polling with recursive setTimeout
  useEffect(() => {
    if (!configured) return;
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
  }, [configured, doFetch]);

  const markRead = useCallback(
    async (threadId) => {
      const mark = (n) => (n.id === threadId ? { ...n, unread: false } : n);
      setNotifications((prev) => prev.map(mark));
      setNoiseNotifications((prev) => prev.map(mark));
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
      setNoiseNotifications((prev) => prev.map(markUnread));
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
      setNoiseNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      try {
        await Promise.all(threadIds.map(markThreadDone));
      } catch {
        reload();
      }
    },
    [reload],
  );

  const [prs, setPrs] = useState({ mine: [], reviewRequests: [] });

  const loadPRs = useCallback(async () => {
    if (!configured) return;
    try {
      const [mine, reviewRequests] = await Promise.all([
        fetchMyPRs(),
        fetchReviewRequests(),
      ]);
      setPrs({ mine, reviewRequests });
    } catch (err) {
      console.error("GitHub PR fetch error:", err);
    }
  }, [configured]);

  const loadNoise = useCallback(async () => {
    if (!configured) return;
    try {
      const data = await fetchNoiseNotifications(rules.noiseFilter);
      setNoiseNotifications(
        data.filter((n) => !dismissedRef.current.has(n.id)),
      );
    } catch (err) {
      console.error("GitHub noise fetch error:", err);
    }
  }, [configured, rules.noiseFilter]);

  const grouped = useMemo(() => {
    const buckets = new Map(rules.categories.map((c) => [c.id, []]));
    const seenIds = new Set();
    for (const n of notifications) {
      seenIds.add(n.id);
      const tierId = classifyTier(n.reason, rules);
      const bucket = buckets.get(tierId);
      if (bucket) bucket.push(n);
    }
    const fallbackCategory = rules.categories.find((c) => c.fallback);
    const fallbackBucket = fallbackCategory
      ? buckets.get(fallbackCategory.id)
      : null;
    if (fallbackBucket) {
      for (const n of noiseNotifications) {
        if (!seenIds.has(n.id)) fallbackBucket.push(n);
      }
    }
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
  }, [notifications, noiseNotifications, pinnedIds, rules]);

  const sortedPrs = useMemo(() => {
    const byPinned = (a, b) => {
      const ap = pinnedIds.has(String(a.id)) ? 0 : 1;
      const bp = pinnedIds.has(String(b.id)) ? 0 : 1;
      return ap - bp;
    };
    return {
      mine: [...prs.mine].sort(byPinned),
      reviewRequests: [...prs.reviewRequests].sort(byPinned),
    };
  }, [prs, pinnedIds]);

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
    loadNoise,
    prs: sortedPrs,
    loadPRs,
  };
};
