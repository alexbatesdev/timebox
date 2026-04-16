import { useState, useRef, useEffect } from "react";
import { notificationUrl } from "../github/api.js";

const GITHUB_SVG = (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="#9ca3af">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const isLightColor = (hex) => {
  if (!hex) return false;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function reasonLabel(reason) {
  const labels = {
    mention: "Mentioned",
    review_requested: "Review",
    assign: "Assigned",
    team_mention: "Team",
    comment: "Comment",
    author: "Author",
    state_change: "Changed",
    subscribed: "Watching",
    ci_activity: "CI",
  };
  return labels[reason] || reason;
}

function reasonColor(reason) {
  const colors = {
    mention: "#f59e0b",
    review_requested: "#a855f7",
    assign: "#3b82f6",
    team_mention: "#f59e0b",
    comment: "#6b7280",
    author: "#6b7280",
    state_change: "#22c55e",
    subscribed: "#4b5563",
    ci_activity: "#4b5563",
  };
  return colors[reason] || "#4b5563";
}

function NotificationItem({ n, onMarkRead, confirmDeleteId, onConfirmDelete }) {
  const url = notificationUrl(n);

  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      {/* Row 1: title */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <a
          href={url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "12px",
            color: n.unread ? "#d1d5db" : "#9ba0ab",
            fontWeight: n.unread ? "600" : "400",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "none",
            textAlign: "left",
          }}
          title={n.subject?.title}
        >
          {n.subject?.title}
        </a>
      </div>
      {/* Row 2: metadata + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "2px",
        }}
      >
        <span
          style={{
            fontSize: "9px",
            padding: "1px 5px",
            borderRadius: "9999px",
            background: reasonColor(n.reason),
            color: isLightColor(reasonColor(n.reason)) ? "#1a1a1a" : "#fff",
            fontFamily: "inherit",
            minWidth: "44px",
            textAlign: "center",
            display: "inline-block",
          }}
        >
          {reasonLabel(n.reason)}
        </span>
        <span
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: n.unread ? "#e5e7eb" : "#a8afbd",
          }}
        >
          {relativeTime(n.updated_at)}
        </span>
        <span
          style={{
            fontSize: "1px",
            color: "#6b7280",
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {n.repository?.full_name}
        </span>
        <div
          style={{
            display: "flex",
            gap: "4px",
            flexShrink: 0,
            alignItems: "center",
            justifySelf: "flex-end",
            marginLeft: "auto",
          }}
        >
          {n.unread && (
            <button
              onClick={() => onMarkRead(n.id)}
              title="Mark as read"
              style={{
                background: "none",
                border: "1px solid #333",
                borderRadius: "4px",
                color: "#22c55e",
                cursor: "pointer",
                fontSize: "10px",
                padding: "2px 5px",
                fontFamily: "inherit",
              }}
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onConfirmDelete(n.id)}
            title="Mark as done"
            style={{
              background: confirmDeleteId === n.id ? "#dc2626" : "none",
              border:
                confirmDeleteId === n.id
                  ? "1px solid #dc2626"
                  : "1px solid #333",
              borderRadius: "4px",
              color: confirmDeleteId === n.id ? "#fff" : "#dc2626",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 5px",
              fontFamily: "inherit",
              transition: "0.15s ease",
            }}
          >
            {confirmDeleteId === n.id ? "Sure?" : "✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TierSection({
  title,
  items,
  defaultExpanded = true,
  onMarkRead,
  confirmDeleteId,
  onConfirmDelete,
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const unread = items.filter((n) => n.unread).length;
  const read = items.length - unread;
  return (
    <div style={{ marginBottom: "4px" }}>
      <button
        onClick={() => items.length > 0 && setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "6px 16px",
          background: "none",
          border: "none",
          cursor: items.length > 0 ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "9px", color: "#6b7280" }}>
          {items.length === 0 ? "◦" : collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600" }}>
          {title}
        </span>
        <span style={{ fontSize: "9px", color: "#4b5563" }}>
          {unread > 0 && (
            <span
              style={{
                color: "#e5e7eb",
                padding: "0 4px",
                borderRadius: "9999px",
                background: "#333",
              }}
            >
              {unread}
            </span>
          )}
          {unread > 0 && read > 0 && " "}
          {read > 0 && <span style={{ color: "#6b7280" }}>{read} read</span>}
          {items.length === 0 && (
            <span style={{ color: "#4b5563" }}>empty</span>
          )}
        </span>
      </button>
      {!collapsed && (
        <div style={{ padding: "0 16px" }}>
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={onMarkRead}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={onConfirmDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const HIDDEN_REPOS_KEY = "timebox-gh-hidden-repos";
const loadHiddenRepos = () => {
  const raw = localStorage.getItem(HIDDEN_REPOS_KEY);
  return raw ? new Set(JSON.parse(raw)) : new Set();
};
const saveHiddenRepos = (set) => {
  localStorage.setItem(HIDDEN_REPOS_KEY, JSON.stringify([...set]));
};

function PRItem({ pr }) {
  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "12px",
            color: "#d1d5db",
            fontWeight: "600",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "none",
            textAlign: "left",
          }}
          title={pr.title}
        >
          {pr.title}
        </a>
        {pr.draft && (
          <span
            style={{
              fontSize: "9px",
              padding: "1px 5px",
              borderRadius: "9999px",
              background: "#4b5563",
              color: "#d1d5db",
              flexShrink: 0,
            }}
          >
            Draft
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
        <span style={{ fontSize: "10px", color: "#6b7280" }}>#{pr.number}</span>
        <span style={{ fontSize: "10px", color: "#4b5563" }}>{pr.author}</span>
        <span style={{ fontSize: "10px", color: "#4b5563" }}>{pr.repo}</span>
        <span style={{ fontSize: "10px", fontWeight: "700", color: "#6b7280", marginLeft: "auto" }}>
          {relativeTime(pr.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function RepoGroup({ repo, prs, onHide }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0", marginTop: "4px" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: "8px",
            padding: "0 2px",
            flexShrink: 0,
          }}
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>{repo}</span>
        <span style={{ fontSize: "9px", color: "#4b5563" }}>
          {prs.length}
        </span>
        <button
          onClick={onHide}
          title={`Hide ${repo}`}
          style={{
            background: "none",
            border: "none",
            color: "#4b5563",
            cursor: "pointer",
            fontSize: "9px",
            padding: "0 2px",
            fontFamily: "inherit",
            marginLeft: "auto",
          }}
        >
          hide
        </button>
      </div>
      {!collapsed && prs.map((pr) => (
        <PRItem key={pr.id} pr={pr} />
      ))}
    </div>
  );
}

function PRSection({ title, items, hiddenRepos, onToggleRepo, defaultExpanded = true }) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const visible = items.filter((pr) => !hiddenRepos.has(pr.repo));
  const hiddenCount = items.length - visible.length;

  // Group by repo
  const byRepo = {};
  for (const pr of visible) {
    (byRepo[pr.repo] || (byRepo[pr.repo] = [])).push(pr);
  }
  const repos = Object.keys(byRepo).sort();

  return (
    <div style={{ marginBottom: "4px" }}>
      <button
        onClick={() => items.length > 0 && setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "6px 16px",
          background: "none",
          border: "none",
          cursor: items.length > 0 ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "9px", color: "#6b7280" }}>
          {items.length === 0 ? "◦" : collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600" }}>{title}</span>
        <span style={{ fontSize: "9px", color: "#4b5563" }}>
          {visible.length > 0 && (
            <span style={{ color: "#e5e7eb", padding: "0 4px", borderRadius: "9999px", background: "#333" }}>
              {visible.length}
            </span>
          )}
          {hiddenCount > 0 && (
            <span style={{ color: "#4b5563", marginLeft: "4px" }}>
              {hiddenCount} hidden
            </span>
          )}
          {items.length === 0 && <span style={{ color: "#4b5563" }}>empty</span>}
        </span>
      </button>
      {!collapsed && visible.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          {repos.map((repo) => (
            <RepoGroup key={repo} repo={repo} prs={byRepo[repo]} onHide={() => onToggleRepo(repo)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, detail, children, defaultExpanded = true }) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  return (
    <div style={{ borderBottom: "1px solid #252525" }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "10px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "10px", color: "#6b7280" }}>
          {collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontSize: "13px", color: "#e5e7eb", fontWeight: "700" }}>{title}</span>
        {detail && <span style={{ fontSize: "10px", color: "#6b7280" }}>{detail}</span>}
      </button>
      {!collapsed && children}
    </div>
  );
}

export default function GitHubPanel({
  open,
  onToggle,
  grouped,
  unreadCount,
  loading,
  onMarkRead,
  onMarkDone,
  onLoadNoise,
  prs,
  onLoadPRs,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [hiddenRepos, setHiddenRepos] = useState(loadHiddenRepos);
  const confirmTimeoutRef = useRef(null);

  const toggleHiddenRepo = (repo) => {
    setHiddenRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repo)) next.delete(repo);
      else next.add(repo);
      saveHiddenRepos(next);
      return next;
    });
  };

  const unhideAllRepos = () => {
    setHiddenRepos(new Set());
    saveHiddenRepos(new Set());
  };

  useEffect(() => {
    return () => clearTimeout(confirmTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (open) {
      onLoadNoise();
      onLoadPRs();
    }
  }, [open, onLoadNoise, onLoadPRs]);

  const handleConfirmDelete = (threadId) => {
    if (confirmDeleteId === threadId) {
      clearTimeout(confirmTimeoutRef.current);
      setConfirmDeleteId(null);
      onMarkDone(threadId);
    } else {
      setConfirmDeleteId(threadId);
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(
        () => setConfirmDeleteId(null),
        3000,
      );
    }
  };

  return (
    <>
      {/* Tab */}
      <button
        onClick={() => onToggle(!open)}
        style={{
          position: "absolute",
          left: 0,
          top: "136px",
          width: "32px",
          height: "48px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRight: "none",
          borderRadius: "8px 0 0 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: 0,
        }}
        title="GitHub Notifications"
      >
        {unreadCount > 0 ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#fff",
              color: "#000",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            {unreadCount}
          </span>
        ) : (
          GITHUB_SVG
        )}
      </button>

      {/* Panel content */}
      <div
        style={{
          position: "absolute",
          left: open ? "30px" : "32px",
          top: "16px",
          bottom: "16px",
          width: "450px",
          background: "#111",
          border: "1px solid #252525",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          transition: "0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #252525",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {GITHUB_SVG} GitHub
          </div>
          <button
            onClick={() => onToggle(false)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "16px", color: "#6b7280", fontSize: "13px", textAlign: "center" }}>
              Loading...
            </div>
          )}
          <CollapsibleSection
            title="Notifications"
            detail={(() => {
              const all = [...grouped.newStuff, ...grouped.updates, ...grouped.noise];
              const unread = all.filter((n) => n.unread).length;
              const read = all.length - unread;
              const parts = [];
              if (unread > 0) parts.push(`${unread} unread`);
              if (read > 0) parts.push(`${read} read`);
              return parts.join(", ") || null;
            })()}
          >
            <TierSection
              title="New Stuff"
              items={grouped.newStuff}
              defaultExpanded
              onMarkRead={onMarkRead}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={handleConfirmDelete}
            />
            <TierSection
              title="Updates"
              items={grouped.updates}
              defaultExpanded
              onMarkRead={onMarkRead}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={handleConfirmDelete}
            />
            <TierSection
              title="Noise"
              items={grouped.noise}
              defaultExpanded={false}
              onMarkRead={onMarkRead}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={handleConfirmDelete}
            />
          </CollapsibleSection>
          <CollapsibleSection
            title="Pull Requests"
            detail={(() => {
              const parts = [];
              if (prs.reviewRequests.length > 0) parts.push(`${prs.reviewRequests.length} awaiting review`);
              if (prs.mine.length > 0) parts.push(`${prs.mine.length} open`);
              return parts.join(", ") || null;
            })()}
          >
            <PRSection title="Awaiting My Review" items={prs.reviewRequests} hiddenRepos={hiddenRepos} onToggleRepo={toggleHiddenRepo} />
            <PRSection title="My Open PRs" items={prs.mine} hiddenRepos={hiddenRepos} onToggleRepo={toggleHiddenRepo} />
            {hiddenRepos.size > 0 && (
              <button
                onClick={unhideAllRepos}
                style={{
                  display: "block",
                  margin: "4px 16px 8px",
                  background: "none",
                  border: "none",
                  color: "#4b5563",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontFamily: "inherit",
                }}
              >
                Show {hiddenRepos.size} hidden repo{hiddenRepos.size > 1 ? "s" : ""}
              </button>
            )}
          </CollapsibleSection>
        </div>
      </div>
    </>
  );
}
