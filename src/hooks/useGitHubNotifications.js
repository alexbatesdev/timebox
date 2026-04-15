import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isGitHubConfigured,
  fetchNotifications,
  markThreadRead,
  markThreadDone,
  classifyTier,
} from "../github/api.js";

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
  const [notifications, setNotifications] = useState([]);
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === threadId ? { ...n, unread: false } : n)),
      );
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

  const grouped = useMemo(() => {
    const newStuff = [],
      updates = [],
      noise = [];
    for (const n of notifications) {
      const tier = classifyTier(n.reason);
      if (tier === "new") newStuff.push(n);
      else if (tier === "updates") updates.push(n);
      else noise.push(n);
    }
    return { newStuff, updates, noise };
  }, [notifications]);

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
  };
};
