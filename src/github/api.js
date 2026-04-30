const token = () => import.meta.env.VITE_GITHUB_TOKEN;
export const isGitHubConfigured = () => Boolean(token());

const ghFetch = async (path, options = {}) => {
  const res = await fetch(`/api/github${path}`, {
    cache: "no-store",
    ...options,
  });
  if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
  return res.json();
};

export const fetchNotifications = async () => {
  const data = await ghFetch("/notifications?participating=true&all=true");
  return Array.isArray(data) ? data : [];
};

export const fetchNoiseNotifications = async (noiseReasons) => {
  const reasonSet = new Set(noiseReasons);
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  let all = [];
  let page = 1;
  while (true) {
    const data = await ghFetch(`/notifications?all=true&since=${since}&per_page=50&page=${page}`);
    const items = Array.isArray(data) ? data : [];
    all = all.concat(items.filter((n) => reasonSet.has(n.reason)));
    if (items.length < 50) break;
    page++;
  }
  return all;
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
  if (!res.ok && res.status !== 205)
    throw new Error(`Failed to mark thread done (${res.status})`);
};

export const notificationUrl = (notification) => {
  const apiUrl = notification.subject?.url;
  const repoUrl = notification.repository?.html_url;
  if (!apiUrl) return repoUrl ? `${repoUrl}/actions` : null;
  if (!apiUrl.startsWith("https://api.github.com/repos")) {
    return repoUrl ? `${repoUrl}/actions` : null;
  }
  if (notification.subject?.type === "CheckSuite") {
    return repoUrl ? `${repoUrl}/actions` : null;
  }
  return apiUrl
    .replace("https://api.github.com/repos", "https://github.com")
    .replace("/pulls/", "/pull/")
    .replace("/commits/", "/commit/");
};

const mapPR = (item) => ({
  id: item.id,
  number: item.number,
  title: item.title,
  url: item.html_url,
  author: item.user?.login,
  repo: item.repository_url?.replace("https://api.github.com/repos/", ""),
  updatedAt: item.updated_at,
  draft: item.draft,
});

export const fetchPRsByQuery = async (query) => {
  const q = encodeURIComponent(query);
  const data = await ghFetch(`/search/issues?q=${q}&per_page=50`);
  return (data.items || []).map(mapPR);
};
