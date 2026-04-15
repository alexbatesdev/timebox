import { useState, useRef, useEffect } from "react";
import { notificationUrl } from "../github/api.js";

const GITHUB_SVG = (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="#9ca3af">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

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

function subjectTypeLabel(type) {
  if (type === "PullRequest") return "PR";
  if (type === "Issue") return "Issue";
  if (type === "Commit") return "Commit";
  if (type === "CheckSuite") return "CI";
  return type || "";
}

function NotificationItem({ n, onMarkRead, expandedId, onToggleExpand, confirmDeleteId, onConfirmDelete }) {
  const url = notificationUrl(n);
  const isMention = n.reason === "mention" || n.reason === "team_mention";
  const isExpanded = expandedId === n.id;

  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {isMention && (
          <button
            onClick={() => onToggleExpand(n.id)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "10px",
              padding: "0 2px",
              flexShrink: 0,
              width: "14px",
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        {!isMention && <span style={{ width: "14px", flexShrink: 0 }} />}
        <span
          style={{
            fontSize: "9px",
            padding: "1px 4px",
            borderRadius: "3px",
            background: "#252525",
            color: "#9ca3af",
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          {subjectTypeLabel(n.subject?.type)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              color: n.unread ? "#e5e7eb" : "#6b7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontWeight: n.unread ? "600" : "400",
            }}
            title={n.subject?.title}
          >
            {n.subject?.title}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#4b5563",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {n.repository?.full_name}
            <span style={{ marginLeft: "6px" }}>{relativeTime(n.updated_at)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0, alignItems: "center" }}>
          {n.unread && (
            <button
              onClick={() => onMarkRead(n.id)}
              title="Mark as read"
              style={{
                background: "none",
                border: "1px solid #333",
                borderRadius: "4px",
                color: "#6b7280",
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
              border: confirmDeleteId === n.id ? "1px solid #dc2626" : "1px solid #333",
              borderRadius: "4px",
              color: confirmDeleteId === n.id ? "#fff" : "#6b7280",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 5px",
              fontFamily: "inherit",
              transition: "0.15s ease",
            }}
          >
            {confirmDeleteId === n.id ? "Sure?" : "✕"}
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#a855f7", fontSize: "12px", textDecoration: "none" }}
              title="Open in GitHub"
            >
              ↗
            </a>
          )}
        </div>
      </div>
      {isExpanded && isMention && (
        <div
          style={{
            marginTop: "4px",
            marginLeft: "20px",
            padding: "8px 10px",
            background: "#ffffff06",
            border: "1px solid #252525",
            borderRadius: "6px",
            fontSize: "11px",
            color: "#9ca3af",
            wordBreak: "break-word",
            lineHeight: "1.5",
            whiteSpace: "pre-wrap",
          }}
        >
          {n.commentLoading && (
            <span style={{ fontStyle: "italic", color: "#4b5563" }}>Loading comment…</span>
          )}
          {!n.commentLoading && n.commentBody && n.commentBody}
          {!n.commentLoading && !n.commentBody && (
            <span style={{ fontStyle: "italic", color: "#4b5563" }}>No comment available</span>
          )}
        </div>
      )}
    </div>
  );
}

function TierSection({ title, items, defaultExpanded = true, onMarkRead, expandedId, onToggleExpand, confirmDeleteId, onConfirmDelete }) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  if (!items.length) return null;
  const unread = items.filter((n) => n.unread).length;
  return (
    <div style={{ marginBottom: "4px" }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: "6px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "9px", color: "#6b7280" }}>{collapsed ? "▶" : "▼"}</span>
        <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600" }}>{title}</span>
        {unread > 0 && (
          <span
            style={{
              fontSize: "9px",
              padding: "0 5px",
              borderRadius: "9999px",
              background: "#333",
              color: "#e5e7eb",
            }}
          >
            {unread}
          </span>
        )}
      </button>
      {!collapsed && (
        <div style={{ padding: "0 16px" }}>
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={onMarkRead}
              expandedId={expandedId}
              onToggleExpand={onToggleExpand}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={onConfirmDelete}
            />
          ))}
        </div>
      )}
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
  onFetchComment,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirmTimeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(confirmTimeoutRef.current);
  }, []);

  const handleToggleExpand = (threadId) => {
    if (expandedId === threadId) {
      setExpandedId(null);
    } else {
      setExpandedId(threadId);
      onFetchComment(threadId);
    }
  };

  const handleConfirmDelete = (threadId) => {
    if (confirmDeleteId === threadId) {
      clearTimeout(confirmTimeoutRef.current);
      setConfirmDeleteId(null);
      onMarkDone(threadId);
    } else {
      setConfirmDeleteId(threadId);
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
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
              fontSize: "10px",
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

        {/* Notification list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading && !grouped.action.length && !grouped.fyi.length && !grouped.noise.length && (
            <div style={{ padding: "16px", color: "#6b7280", fontSize: "13px", textAlign: "center" }}>
              Loading notifications...
            </div>
          )}
          {!loading && !grouped.action.length && !grouped.fyi.length && !grouped.noise.length && (
            <div style={{ padding: "16px", color: "#4b5563", fontSize: "13px", textAlign: "center" }}>
              No notifications
            </div>
          )}
          <TierSection
            title="Needs Action"
            items={grouped.action}
            defaultExpanded
            onMarkRead={onMarkRead}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            confirmDeleteId={confirmDeleteId}
            onConfirmDelete={handleConfirmDelete}
          />
          <TierSection
            title="FYI"
            items={grouped.fyi}
            defaultExpanded
            onMarkRead={onMarkRead}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            confirmDeleteId={confirmDeleteId}
            onConfirmDelete={handleConfirmDelete}
          />
          <TierSection
            title="Noise"
            items={grouped.noise}
            defaultExpanded={false}
            onMarkRead={onMarkRead}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            confirmDeleteId={confirmDeleteId}
            onConfirmDelete={handleConfirmDelete}
          />
        </div>
      </div>
    </>
  );
}
