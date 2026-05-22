import { useState, useRef, useEffect } from "react";
import { notificationUrl } from "../github/api.js";
import {
  relativeTime,
  reasonLabel,
  reasonColor,
  getAgeColors,
} from "../github/format.js";
import { useNotes } from "../hooks/useNotes.js";
import NotesSection from "./NotesSection.jsx";

const GITHUB_SVG = (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="#9ca3af">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const CI_DOT = {
  success: { color: "#22c55e", title: "All checks passing" },
  failure: { color: "#dc2626", title: "Checks failing" },
  pending: { color: "#6b7280", title: "Checks pending" },
};

const SEVERITY_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#f59e0b",
  low: "#6b7280",
};
const severityColor = (sev) => SEVERITY_COLORS[sev] || "#4b5563";

const isLightColor = (hex) => {
  if (!hex) return false;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

export function NotificationItem({ n, onMarkRead, confirmDeleteId, onConfirmDelete, pinned, onTogglePin, active, onToggleActive, activeColor, expanded, onToggleExpand, noteText, onNoteChange }) {
  const url = notificationUrl(n);

  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      {/* Row 1: title */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
          {expanded ? "▼" : "▶"}
        </button>
        <a
          href={url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "12px",
            color: active
              ? activeColor
              : pinned
                ? "#fde047"
                : n.unread
                  ? "#d1d5db"
                  : "#9ba0ab",
            fontWeight: active ? "700" : n.unread ? "600" : "400",
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
          <button
            onClick={() => onTogglePin(n.id)}
            title={pinned ? "Unpin" : "Pin"}
            style={{
              background: "none",
              border: "1px solid #333",
              borderRadius: "4px",
              color: pinned ? "#fde047" : "#4b5563",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 5px",
              fontFamily: "inherit",
            }}
          >
            {pinned ? "★" : "☆"}
          </button>
          <button
            onClick={() => onToggleActive(n.id)}
            title={active ? "Stop active" : "Mark active"}
            style={{
              background: "none",
              border: "1px solid #333",
              borderRadius: "4px",
              color: active ? activeColor : "#4b5563",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 5px",
              fontFamily: "inherit",
            }}
          >
            {active ? "●" : "○"}
          </button>
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
      {expanded && (
        <div style={{ paddingLeft: "20px", marginTop: "4px" }}>
          <NotesSection noteText={noteText} onNoteChange={onNoteChange} />
        </div>
      )}
    </div>
  );
}

function TierSection({
  title,
  items,
  defaultExpanded = true,
  onMarkRead,
  onMarkAllRead,
  onDeleteAll,
  confirmDeleteId,
  onConfirmDelete,
  pinnedIds,
  onTogglePin,
  activeIds,
  onToggleActive,
  activeColor,
  expandedId,
  onToggleExpand,
  getNote,
  setNote,
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const deleteAllTimeoutRef = useRef(null);
  const unread = items.filter((n) => n.unread).length;
  const read = items.length - unread;

  useEffect(() => {
    return () => clearTimeout(deleteAllTimeoutRef.current);
  }, []);

  const handleDeleteAll = () => {
    if (confirmDeleteAll) {
      clearTimeout(deleteAllTimeoutRef.current);
      setConfirmDeleteAll(false);
      onDeleteAll(items.map((n) => n.id));
    } else {
      setConfirmDeleteAll(true);
      deleteAllTimeoutRef.current = setTimeout(
        () => setConfirmDeleteAll(false),
        3000,
      );
    }
  };

  return (
    <div style={{ marginBottom: "4px" }}>
      <div
        style={{ display: "flex", alignItems: "center", padding: "6px 16px" }}
      >
        <button
          onClick={() => items.length > 0 && setCollapsed(!collapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flex: 1,
            background: "none",
            border: "none",
            cursor: items.length > 0 ? "pointer" : "default",
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          <span style={{ fontSize: "9px", color: "#6b7280" }}>
            {items.length === 0 ? "◦" : collapsed ? "▶" : "▼"}
          </span>
          <span
            style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "600" }}
          >
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
        {items.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            {unread > 0 && (
              <button
                onClick={() => {
                  onMarkAllRead(items.filter((n) => n.unread).map((n) => n.id));
                }}
                title="Mark all as read"
                style={{
                  background: "none",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#22c55e",
                  cursor: "pointer",
                  fontSize: "10px",
                  padding: "2px 5px",
                  fontFamily: "inherit",
                  lineHeight: 1,
                  position: "relative",
                  width: "20px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    position: "relative",
                    left: "33%",
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    position: "relative",
                    right: "33%",
                    opacity: 0.75,
                  }}
                >
                  ✓
                </span>
              </button>
            )}
            <button
              onClick={handleDeleteAll}
              title="Delete all"
              style={{
                background: confirmDeleteAll ? "#dc2626" : "none",
                border: confirmDeleteAll
                  ? "1px solid #dc2626"
                  : "1px solid #333",
                borderRadius: "4px",
                color: confirmDeleteAll ? "#fff" : "#dc2626",
                cursor: "pointer",
                fontSize: "10px",
                padding: "2px 5px",
                fontFamily: "inherit",
                transition: "0.15s ease",
                lineHeight: 1,
                position: "relative",
                width: "20px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {confirmDeleteAll ? (
                <span>Sure?</span>
              ) : (
                <>
                  <span
                    style={{
                      position: "relative",
                      left: "33%",
                    }}
                  >
                    ✕
                  </span>
                  <span
                    style={{
                      position: "relative",
                      right: "33%",
                      opacity: 0.75,
                    }}
                  >
                    ✕
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      {!collapsed && (
        <div style={{ padding: "0 16px" }}>
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={onMarkRead}
              confirmDeleteId={confirmDeleteId}
              onConfirmDelete={onConfirmDelete}
              pinned={pinnedIds?.has(String(n.id))}
              onTogglePin={onTogglePin}
              active={activeIds?.has(String(n.id)) ?? false}
              onToggleActive={onToggleActive}
              activeColor={activeColor}
              expanded={expandedId === n.id}
              onToggleExpand={onToggleExpand}
              noteText={getNote(n.id)}
              onNoteChange={(text) => setNote(n.id, text)}
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

export function SearchResultItem({ item, pinned, onTogglePin, active, onToggleActive, activeColor, expanded, onToggleExpand, noteText, onNoteChange, thresholds }) {
  const { timeColor, titleColor } = getAgeColors(item.updatedAt, thresholds);
  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={() => onToggleExpand(item.id)}
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
          {expanded ? "▼" : "▶"}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "12px",
            color: active ? activeColor : pinned ? "#fde047" : titleColor || "#d1d5db",
            fontWeight: active ? "700" : "600",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "none",
            textAlign: "left",
          }}
          title={item.title}
        >
          {item.title}
        </a>
        {item.draft && (
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "2px",
        }}
      >
        {item.ciState && CI_DOT[item.ciState] && (
          <span
            title={CI_DOT[item.ciState].title}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: CI_DOT[item.ciState].color,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
        )}
        <span style={{ fontSize: "10px", color: "#6b7280" }}>#{item.number}</span>
        <span style={{ fontSize: "10px", color: "#4b5563" }}>{item.author}</span>
        <span style={{ fontSize: "10px", color: "#4b5563" }}>{item.repo}</span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: timeColor,
            marginLeft: "auto",
          }}
        >
          {relativeTime(item.updatedAt)}
        </span>
        <button
          onClick={() => onTogglePin(item.id)}
          title={pinned ? "Unpin" : "Pin"}
          style={{
            background: "none",
            border: "1px solid #333",
            borderRadius: "4px",
            color: pinned ? "#fde047" : "#4b5563",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 5px",
            fontFamily: "inherit",
          }}
        >
          {pinned ? "★" : "☆"}
        </button>
        <button
          onClick={() => onToggleActive(item.id)}
          title={active ? "Stop active" : "Mark active"}
          style={{
            background: "none",
            border: "1px solid #333",
            borderRadius: "4px",
            color: active ? activeColor : "#4b5563",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 5px",
            fontFamily: "inherit",
          }}
        >
          {active ? "●" : "○"}
        </button>
      </div>
      {expanded && (
        <div style={{ paddingLeft: "20px", marginTop: "4px" }}>
          {item.failingChecks && item.failingChecks.length > 0 && (
            <div style={{ marginBottom: "6px" }}>
              <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>
                Failing checks
              </div>
              {item.failingChecks.map((check, idx) => (
                <a
                  key={`${check.name}-${idx}`}
                  href={check.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    fontSize: "11px",
                    color: "#dc2626",
                    textDecoration: "none",
                    padding: "1px 0",
                  }}
                  title={check.name}
                >
                  • {check.name}
                </a>
              ))}
            </div>
          )}
          <NotesSection noteText={noteText} onNoteChange={onNoteChange} />
        </div>
      )}
    </div>
  );
}

function RepoGroup({ repo, items, onHide, pinnedIds, onTogglePin, activeIds, onToggleActive, activeColor, expandedId, onToggleExpand, getNote, setNote, thresholds }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 0",
          marginTop: "4px",
        }}
      >
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
        <span style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>
          {repo}
        </span>
        <span style={{ fontSize: "9px", color: "#4b5563" }}>{items.length}</span>
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
      {!collapsed && items.map((item) => (
        <SearchResultItem
          key={item.id}
          item={item}
          pinned={pinnedIds?.has(String(item.id))}
          onTogglePin={onTogglePin}
          active={activeIds?.has(String(item.id)) ?? false}
          onToggleActive={onToggleActive}
          activeColor={activeColor}
          expanded={expandedId === item.id}
          onToggleExpand={onToggleExpand}
          noteText={getNote(item.id)}
          onNoteChange={(text) => setNote(item.id, text)}
          thresholds={thresholds}
        />
      ))}
    </div>
  );
}

function SearchSection({
  title,
  items,
  hiddenRepos,
  onToggleRepo,
  pinnedIds,
  onTogglePin,
  activeIds,
  onToggleActive,
  activeColor,
  expandedId,
  onToggleExpand,
  getNote,
  setNote,
  defaultExpanded = true,
  accentColor,
  thresholds,
  nested = false,
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const visible = items.filter((item) => !hiddenRepos.has(item.repo));
  const hiddenCount = items.length - visible.length;

  // Group by repo
  const byRepo = {};
  for (const item of visible) {
    (byRepo[item.repo] || (byRepo[item.repo] = [])).push(item);
  }
  const repos = Object.keys(byRepo).sort();

  const headerPadding = nested ? "6px 16px" : "10px 16px";
  const caretSize = nested ? "9px" : "10px";
  const titleFontSize = nested ? "11px" : "13px";
  const titleColor = nested ? "#9ca3af" : "#e5e7eb";
  const titleWeight = nested ? "600" : "700";
  const detailFontSize = nested ? "9px" : "10px";
  const wrapperStyle = nested
    ? { marginBottom: "4px" }
    : { borderBottom: "1px solid #252525" };

  return (
    <div style={wrapperStyle}>
      <button
        onClick={() => items.length > 0 && setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: headerPadding,
          background: "none",
          border: "none",
          cursor: items.length > 0 ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: caretSize, color: "#6b7280" }}>
          {items.length === 0 ? "◦" : collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontSize: titleFontSize, color: titleColor, fontWeight: titleWeight }}>
          {title}
        </span>
        <span style={{ fontSize: detailFontSize, color: "#6b7280" }}>
          {visible.length > 0 && (
            <span
              style={{
                color: "#e5e7eb",
                padding: "0 4px",
                borderRadius: "9999px",
                background: "#333",
              }}
            >
              {visible.length}
            </span>
          )}
          {hiddenCount > 0 && (
            <span style={{ color: "#4b5563", marginLeft: "4px" }}>
              {hiddenCount} hidden
            </span>
          )}
          {items.length === 0 && (
            <span style={{ color: "#4b5563" }}>empty</span>
          )}
        </span>
      </button>
      {!collapsed && visible.length > 0 && (
        <div style={{ padding: "0 16px 8px", borderLeft: accentColor ? `2px solid ${accentColor}` : "none", marginLeft: accentColor ? "14px" : "0" }}>
          {repos.map((repo) => (
            <RepoGroup
              key={repo}
              repo={repo}
              items={byRepo[repo]}
              onHide={() => onToggleRepo(repo)}
              pinnedIds={pinnedIds}
              onTogglePin={onTogglePin}
              activeIds={activeIds}
              onToggleActive={onToggleActive}
              activeColor={activeColor}
              expandedId={expandedId}
              onToggleExpand={onToggleExpand}
              getNote={getNote}
              setNote={setNote}
              thresholds={thresholds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DependabotItem({ item, pinned, onTogglePin, active, onToggleActive, activeColor, expanded, onToggleExpand, noteText, onNoteChange, thresholds }) {
  const { timeColor, titleColor } = getAgeColors(item.updatedAt, thresholds);
  const sevColor = severityColor(item.severity);
  return (
    <div style={{ borderBottom: "1px solid #1a1a1a", padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={() => onToggleExpand(item.id)}
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
          {expanded ? "▼" : "▶"}
        </button>
        <span
          style={{
            fontSize: "9px",
            padding: "1px 5px",
            borderRadius: "9999px",
            background: sevColor,
            color: isLightColor(sevColor) ? "#1a1a1a" : "#fff",
            fontFamily: "inherit",
            textTransform: "uppercase",
            fontWeight: "700",
            flexShrink: 0,
          }}
        >
          {item.severity || "?"}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "12px",
            color: active ? activeColor : pinned ? "#fde047" : titleColor || "#d1d5db",
            fontWeight: active ? "700" : "600",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: "none",
            textAlign: "left",
          }}
          title={item.title}
        >
          {item.title}
        </a>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "2px",
        }}
      >
        <span style={{ fontSize: "10px", color: "#6b7280" }}>#{item.number}</span>
        {item.package && (
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>{item.package}</span>
        )}
        {item.ecosystem && (
          <span style={{ fontSize: "10px", color: "#4b5563" }}>{item.ecosystem}</span>
        )}
        {item.scope && (
          <span style={{ fontSize: "10px", color: "#4b5563" }}>{item.scope}</span>
        )}
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: timeColor,
            marginLeft: "auto",
          }}
        >
          {relativeTime(item.updatedAt)}
        </span>
        <button
          onClick={() => onTogglePin(item.id)}
          title={pinned ? "Unpin" : "Pin"}
          style={{
            background: "none",
            border: "1px solid #333",
            borderRadius: "4px",
            color: pinned ? "#fde047" : "#4b5563",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 5px",
            fontFamily: "inherit",
          }}
        >
          {pinned ? "★" : "☆"}
        </button>
        <button
          onClick={() => onToggleActive(item.id)}
          title={active ? "Stop active" : "Mark active"}
          style={{
            background: "none",
            border: "1px solid #333",
            borderRadius: "4px",
            color: active ? activeColor : "#4b5563",
            cursor: "pointer",
            fontSize: "10px",
            padding: "2px 5px",
            fontFamily: "inherit",
          }}
        >
          {active ? "●" : "○"}
        </button>
      </div>
      {expanded && (
        <div style={{ paddingLeft: "20px", marginTop: "4px" }}>
          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {item.ghsaId && <span>{item.ghsaId}</span>}
            {item.cveId && <span>{item.cveId}</span>}
            {item.vulnerableRange && <span>vulnerable: {item.vulnerableRange}</span>}
            {item.firstPatchedVersion && <span>patched: {item.firstPatchedVersion}</span>}
          </div>
          {item.description && (
            <div
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                whiteSpace: "pre-wrap",
                marginBottom: "6px",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {item.description}
            </div>
          )}
          <NotesSection noteText={noteText} onNoteChange={onNoteChange} />
        </div>
      )}
    </div>
  );
}

function DependabotSection({
  title,
  items,
  pinnedIds,
  onTogglePin,
  activeIds,
  onToggleActive,
  activeColor,
  expandedId,
  onToggleExpand,
  getNote,
  setNote,
  defaultExpanded = true,
  accentColor,
  thresholds,
  nested = false,
}) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded);
  const headerPadding = nested ? "6px 16px" : "10px 16px";
  const caretSize = nested ? "9px" : "10px";
  const titleFontSize = nested ? "11px" : "13px";
  const titleColor = nested ? "#9ca3af" : "#e5e7eb";
  const titleWeight = nested ? "600" : "700";
  const detailFontSize = nested ? "9px" : "10px";
  const wrapperStyle = nested
    ? { marginBottom: "4px" }
    : { borderBottom: "1px solid #252525" };

  return (
    <div style={wrapperStyle}>
      <button
        onClick={() => items.length > 0 && setCollapsed(!collapsed)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          width: "100%",
          padding: headerPadding,
          background: "none",
          border: "none",
          cursor: items.length > 0 ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: caretSize, color: "#6b7280" }}>
          {items.length === 0 ? "◦" : collapsed ? "▶" : "▼"}
        </span>
        <span style={{ fontSize: titleFontSize, color: titleColor, fontWeight: titleWeight }}>
          {title}
        </span>
        <span style={{ fontSize: detailFontSize, color: "#6b7280" }}>
          {items.length > 0 ? (
            <span
              style={{
                color: "#e5e7eb",
                padding: "0 4px",
                borderRadius: "9999px",
                background: "#333",
              }}
            >
              {items.length}
            </span>
          ) : (
            <span style={{ color: "#4b5563" }}>empty</span>
          )}
        </span>
      </button>
      {!collapsed && items.length > 0 && (
        <div style={{ padding: "0 16px 8px", borderLeft: accentColor ? `2px solid ${accentColor}` : "none", marginLeft: accentColor ? "14px" : "0" }}>
          {items.map((item) => (
            <DependabotItem
              key={item.id}
              item={item}
              pinned={pinnedIds?.has(String(item.id))}
              onTogglePin={onTogglePin}
              active={activeIds?.has(String(item.id)) ?? false}
              onToggleActive={onToggleActive}
              activeColor={activeColor}
              expanded={expandedId === item.id}
              onToggleExpand={onToggleExpand}
              noteText={getNote(item.id)}
              onNoteChange={(text) => setNote(item.id, text)}
              thresholds={thresholds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  detail,
  children,
  defaultExpanded = true,
}) {
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
        <span style={{ fontSize: "13px", color: "#e5e7eb", fontWeight: "700" }}>
          {title}
        </span>
        {detail && (
          <span style={{ fontSize: "10px", color: "#6b7280" }}>{detail}</span>
        )}
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
  onMarkAllRead,
  onDeleteAll,
  pinnedIds,
  onTogglePin,
  activeIds,
  onToggleActive,
  activeColor,
  onLoadSecondary,
  searchResults,
  panelSections,
  onLoadSearchResults,
  dependabotAlerts,
  onLoadDependabotAlerts,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [hiddenRepos, setHiddenRepos] = useState(loadHiddenRepos);
  const [expandedId, setExpandedId] = useState(null);
  const { getNote, setNote } = useNotes("timebox-gh-notes");
  const confirmTimeoutRef = useRef(null);

  const handleToggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
      onLoadSecondary();
      onLoadSearchResults();
      onLoadDependabotAlerts?.();
    }
  }, [open, onLoadSecondary, onLoadSearchResults, onLoadDependabotAlerts]);

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
          onClick={() => onToggle(false)}
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #252525",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
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
            <div
              style={{
                padding: "16px",
                color: "#6b7280",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              Loading...
            </div>
          )}
          {(() => {
            const renderSection = (section, { nested }) => {
              if (section.type === "notifications") {
                const all = grouped.flatMap((g) => g.items);
                const unread = all.filter((n) => n.unread).length;
                const read = all.length - unread;
                const parts = [];
                if (unread > 0) parts.push(`${unread} unread`);
                if (read > 0) parts.push(`${read} read`);
                const detail = parts.join(", ") || null;
                return (
                  <CollapsibleSection key="notifications" title="Notifications" detail={detail}>
                    {grouped.map((g) => (
                      <TierSection
                        key={g.id}
                        title={g.label}
                        items={g.items}
                        defaultExpanded={g.defaultExpanded}
                        onMarkRead={onMarkRead}
                        onMarkAllRead={onMarkAllRead}
                        onDeleteAll={onDeleteAll}
                        confirmDeleteId={confirmDeleteId}
                        onConfirmDelete={handleConfirmDelete}
                        pinnedIds={pinnedIds}
                        onTogglePin={onTogglePin}
                        activeIds={activeIds}
                        onToggleActive={onToggleActive}
                        activeColor={activeColor}
                        expandedId={expandedId}
                        onToggleExpand={handleToggleExpand}
                        getNote={getNote}
                        setNote={setNote}
                      />
                    ))}
                  </CollapsibleSection>
                );
              }
              if (section.type === "search") {
                return (
                  <SearchSection
                    key={section.id}
                    title={section.title}
                    items={searchResults[section.id] || []}
                    hiddenRepos={hiddenRepos}
                    onToggleRepo={toggleHiddenRepo}
                    pinnedIds={pinnedIds}
                    onTogglePin={onTogglePin}
                    activeIds={activeIds}
                    onToggleActive={onToggleActive}
                    activeColor={activeColor}
                    expandedId={expandedId}
                    onToggleExpand={handleToggleExpand}
                    getNote={getNote}
                    setNote={setNote}
                    accentColor={section.accentColor}
                    defaultExpanded={section.defaultExpanded}
                    thresholds={section.ageThresholds}
                    nested={nested}
                  />
                );
              }
              if (section.type === "dependabot") {
                return (
                  <DependabotSection
                    key={section.id}
                    title={section.title}
                    items={dependabotAlerts?.[section.id] || []}
                    pinnedIds={pinnedIds}
                    onTogglePin={onTogglePin}
                    activeIds={activeIds}
                    onToggleActive={onToggleActive}
                    activeColor={activeColor}
                    expandedId={expandedId}
                    onToggleExpand={handleToggleExpand}
                    getNote={getNote}
                    setNote={setNote}
                    accentColor={section.accentColor}
                    defaultExpanded={section.defaultExpanded}
                    thresholds={section.ageThresholds}
                    nested={nested}
                  />
                );
              }
              if (section.type === "group") {
                return (
                  <CollapsibleSection
                    key={section.id}
                    title={section.title}
                    defaultExpanded={section.defaultExpanded}
                  >
                    {section.sections.map((child) => renderSection(child, { nested: true }))}
                  </CollapsibleSection>
                );
              }
              return null;
            };
            return (panelSections || []).map((section) =>
              renderSection(section, { nested: false }),
            );
          })()}
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
              Show {hiddenRepos.size} hidden repo
              {hiddenRepos.size > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
