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

export const fetchSecondaryNotifications = async (reasons) => {
  const reasonSet = new Set(reasons);
  if (reasonSet.size === 0) return [];
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

const mapSearchResult = (item) => ({
  id: item.id,
  number: item.number,
  title: item.title,
  url: item.html_url,
  author: item.user?.login,
  repo: item.repository_url?.replace("https://api.github.com/repos/", ""),
  updatedAt: item.updated_at,
  draft: item.draft,
});

export const fetchSearchResults = async (query) => {
  const q = encodeURIComponent(query);
  const data = await ghFetch(`/search/issues?q=${q}&per_page=50`);
  return (data.items || []).map(mapSearchResult);
};

let currentUserPromise = null;
export const fetchCurrentUser = () => {
  if (!currentUserPromise) {
    currentUserPromise = ghFetch("/user").catch((err) => {
      currentUserPromise = null;
      throw err;
    });
  }
  return currentUserPromise;
};

const mapDependabotAlert = (a) => ({
  id: `dependabot-${a.number}`,
  number: a.number,
  title: a.security_advisory?.summary || a.security_vulnerability?.package?.name || `Alert #${a.number}`,
  url: a.html_url,
  severity: a.security_advisory?.severity || a.security_vulnerability?.severity || null,
  package: a.dependency?.package?.name || a.security_vulnerability?.package?.name || null,
  ecosystem: a.dependency?.package?.ecosystem || a.security_vulnerability?.package?.ecosystem || null,
  manifestPath: a.dependency?.manifest_path || null,
  scope: a.dependency?.scope || null,
  state: a.state,
  ghsaId: a.security_advisory?.ghsa_id || null,
  cveId: a.security_advisory?.cve_id || null,
  description: a.security_advisory?.description || null,
  vulnerableRange: a.security_vulnerability?.vulnerable_version_range || null,
  firstPatchedVersion: a.security_vulnerability?.first_patched_version?.identifier || null,
  assignees: (a.assignees || []).map((u) => u.login),
  createdAt: a.created_at,
  updatedAt: a.updated_at,
});

const ghGraphQL = async (query, variables = {}) => {
  const res = await fetch("/api/github/graphql", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL error (${res.status})`);
  const body = await res.json();
  if (body.errors) {
    const msg = body.errors.map((e) => e.message).join("; ");
    throw new Error(`GitHub GraphQL: ${msg}`);
  }
  return body.data;
};

const ROLLUP_STATE_MAP = {
  SUCCESS: "success",
  FAILURE: "failure",
  ERROR: "failure",
  PENDING: "pending",
  EXPECTED: "pending",
};

// Given an array of { repo: "owner/name", number }, returns a Map keyed by
// "owner/name#number" => { ciState, failingChecks: [{ name, url }] }.
// One GraphQL request covers every PR via aliased repository(...).pullRequest(...) fields.
export const fetchPullRequestChecks = async (prs) => {
  const out = new Map();
  if (!prs.length) return out;
  const aliases = [];
  const variables = {};
  prs.forEach((pr, i) => {
    const [owner, name] = pr.repo.split("/");
    if (!owner || !name) return;
    const a = `pr${i}`;
    aliases.push(`${a}: repository(owner: $${a}o, name: $${a}n) {
      pullRequest(number: $${a}num) {
        commits(last: 1) { nodes { commit { statusCheckRollup {
          state
          contexts(first: 50) { nodes {
            __typename
            ... on CheckRun { name conclusion permalink }
            ... on StatusContext { context state targetUrl }
          } }
        } } } }
      }
    }`);
    variables[`${a}o`] = owner;
    variables[`${a}n`] = name;
    variables[`${a}num`] = pr.number;
  });
  if (!aliases.length) return out;
  const varDecls = prs
    .map((_, i) => `$pr${i}o: String!, $pr${i}n: String!, $pr${i}num: Int!`)
    .join(", ");
  const query = `query Checks(${varDecls}) { ${aliases.join("\n")} }`;
  const data = await ghGraphQL(query, variables);
  prs.forEach((pr, i) => {
    const rollup =
      data?.[`pr${i}`]?.pullRequest?.commits?.nodes?.[0]?.commit
        ?.statusCheckRollup;
    if (!rollup) {
      out.set(`${pr.repo}#${pr.number}`, { ciState: null, failingChecks: [] });
      return;
    }
    const ciState = ROLLUP_STATE_MAP[rollup.state] || null;
    const failingChecks = [];
    for (const ctx of rollup.contexts?.nodes || []) {
      if (ctx.__typename === "CheckRun") {
        if (ctx.conclusion === "FAILURE" || ctx.conclusion === "TIMED_OUT" || ctx.conclusion === "ACTION_REQUIRED" || ctx.conclusion === "STALE") {
          failingChecks.push({ name: ctx.name, url: ctx.permalink });
        }
      } else if (ctx.__typename === "StatusContext") {
        if (ctx.state === "FAILURE" || ctx.state === "ERROR") {
          failingChecks.push({ name: ctx.context, url: ctx.targetUrl });
        }
      }
    }
    out.set(`${pr.repo}#${pr.number}`, { ciState, failingChecks });
  });
  return out;
};

export const fetchDependabotAlerts = async (repo, filters = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  if (!params.has("per_page")) params.set("per_page", "100");
  const data = await ghFetch(`/repos/${repo}/dependabot/alerts?${params.toString()}`);
  return Array.isArray(data) ? data.map(mapDependabotAlert) : [];
};
