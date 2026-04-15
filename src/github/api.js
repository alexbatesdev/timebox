const token = () => import.meta.env.VITE_GITHUB_TOKEN;
export const isGitHubConfigured = () => Boolean(token());

const ghFetch = async (path, options = {}) => {
  const res = await fetch(`/api/github${path}`, options);
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
  return res.json();
};

export const fetchNotifications = async () => {
  const data = await ghFetch("/notifications?participating=true&all=true");
  return Array.isArray(data) ? data : [];
};

export const markThreadRead = async (threadId) => {
  const res = await fetch(`/api/github/notifications/threads/${threadId}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(`Failed to mark thread read (${res.status})`);
};

export const markThreadDone = async (threadId) => {
  const res = await fetch(`/api/github/notifications/threads/${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 205) throw new Error(`Failed to mark thread done (${res.status})`);
};

export const fetchComment = async (apiUrl) => {
  if (!apiUrl) return null;
  const path = apiUrl.replace("https://api.github.com", "");
  const { data } = await ghFetch(path);
  return data?.body || null;
};

export const notificationUrl = (notification) => {
  const apiUrl = notification.subject?.url;
  if (!apiUrl) return null;
  return apiUrl
    .replace("https://api.github.com/repos", "https://github.com")
    .replace("/pulls/", "/pull/")
    .replace("/commits/", "/commit/");
};

const NEEDS_ACTION = new Set(["mention", "review_requested", "assign", "team_mention"]);
const FYI = new Set(["comment", "author", "state_change"]);

export const classifyTier = (reason) => {
  if (NEEDS_ACTION.has(reason)) return "action";
  if (FYI.has(reason)) return "fyi";
  return "noise";
};
