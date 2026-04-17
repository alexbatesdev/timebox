import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isGitHubConfigured,
  fetchNotifications,
  fetchNoiseNotifications,
  fetchMyPRs,
  fetchReviewRequests,
  markThreadRead,
  markThreadDone,
  classifyTier,
} from "../github/api.js";
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
  const pollTimeoutRef = useRef(null);
  const dismissedRef = useRef(loadDismissed());

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
      const markUnread = (n) => (idSet.has(String(n.id)) ? { ...n, unread: false } : n);
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
      const [mine, reviewRequests] = await Promise.all([fetchMyPRs(), fetchReviewRequests()]);
      setPrs({ mine, reviewRequests });
    } catch (err) {
      console.error("GitHub PR fetch error:", err);
    }
  }, [configured]);

  const loadNoise = useCallback(async () => {
    if (!configured) return;
    try {
      const data = await fetchNoiseNotifications();
      setNoiseNotifications(data.filter((n) => !dismissedRef.current.has(n.id)));
    } catch (err) {
      console.error("GitHub noise fetch error:", err);
    }
  }, [configured]);

  const grouped = useMemo(() => {
    const newStuff = [],
      updates = [],
      noise = [];
    const seenIds = new Set();
    for (const n of notifications) {
      seenIds.add(n.id);
      const tier = classifyTier(n.reason);
      if (tier === "new") newStuff.push(n);
      else if (tier === "updates") updates.push(n);
      else noise.push(n);
    }
    for (const n of noiseNotifications) {
      if (!seenIds.has(n.id)) noise.push(n);
    }
    const byPinnedThenRecent = (a, b) => {
      const ap = pinnedIds.has(a.id) ? 0 : 1;
      const bp = pinnedIds.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.updated_at) - new Date(a.updated_at);
    };
    newStuff.sort(byPinnedThenRecent);
    updates.sort(byPinnedThenRecent);
    noise.sort(byPinnedThenRecent);
    return { newStuff, updates, noise };
  }, [notifications, noiseNotifications, pinnedIds]);

  const sortedPrs = useMemo(() => {
    const byPinned = (a, b) => {
      const ap = pinnedIds.has(a.id) ? 0 : 1;
      const bp = pinnedIds.has(b.id) ? 0 : 1;
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
