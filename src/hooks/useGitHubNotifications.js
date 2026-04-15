import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  isGitHubConfigured,
  fetchNotifications,
  markThreadRead,
  markThreadDone,
  fetchComment,
  classifyTier,
} from "../github/api.js";

const POLL_INTERVAL = 60_000;

export const useGitHubNotifications = () => {
  const configured = isGitHubConfigured();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const pollTimeoutRef = useRef(null);

  const doFetch = useCallback(async () => {
    if (!configured) return;
    const data = await fetchNotifications();
    setNotifications(data);
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
      setNotifications((prev) => prev.filter((n) => n.id !== threadId));
      try {
        await markThreadDone(threadId);
      } catch {
        reload();
      }
    },
    [reload],
  );

  const fetchCommentBody = useCallback(async (threadId) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === threadId ? { ...n, commentLoading: true } : n,
      ),
    );
    try {
      const notification = notifications.find((n) => n.id === threadId);
      const body = await fetchComment(notification?.subject?.latest_comment_url);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === threadId ? { ...n, commentBody: body, commentLoading: false } : n,
        ),
      );
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === threadId ? { ...n, commentLoading: false } : n,
        ),
      );
    }
  }, [notifications]);

  const grouped = useMemo(() => {
    const action = [], fyi = [], noise = [];
    for (const n of notifications) {
      const tier = classifyTier(n.reason);
      if (tier === "action") action.push(n);
      else if (tier === "fyi") fyi.push(n);
      else noise.push(n);
    }
    return { action, fyi, noise };
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
    fetchCommentBody,
  };
};
