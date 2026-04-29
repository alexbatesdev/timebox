import { useState, useEffect, useRef } from "react";
import { useNotes } from "../hooks/useNotes.js";
import { LooseEndItem } from "./LooseEndsPanel.jsx";
import { TaskNode } from "./TeamworkPanel.jsx";
import { NotificationItem, PRItem } from "./GitHubPanel.jsx";
import { DEFAULT_AGE_THRESHOLDS } from "../github/format.js";

function Section({ title, count, children }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        style={{
          padding: "12px 16px 6px",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span>{title}</span>
        <span style={{ color: "#4b5563" }}>{count}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function FavoritesPanel({
  open,
  onToggle,
  totalCount,
  panelRight = 30,
  // loose ends
  favoriteLooseEnds,
  loosePinnedIds,
  onCompleteLoose,
  onDeleteLoose,
  onTogglePinLoose,
  // teamwork
  favoriteTeamworkTasks,
  twPinnedIds,
  workflowData,
  onTogglePinTask,
  onToggleExpanded,
  onToggleDescExpanded,
  onLoadWorkflowStages,
  onChangeStage,
  // github
  ghPinnedIds,
  favoriteGithubNotifs,
  favoriteMyPRs,
  favoriteReviewRequestPRs,
  onMarkRead,
  onMarkDone,
  onTogglePinGh,
  onLoadNoise,
  onLoadPRs,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedNotifId, setExpandedNotifId] = useState(null);
  const [expandedPrId, setExpandedPrId] = useState(null);
  const [menuTaskId, setMenuTaskId] = useState(null);
  const { getNote: getGhNote, setNote: setGhNote } =
    useNotes("timebox-gh-notes");
  const { getNote: getTwNote, setNote: setTwNote } =
    useNotes("timebox-tw-notes");
  const confirmTimeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(confirmTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (open && onLoadNoise) onLoadNoise();
    if (open && onLoadPRs) onLoadPRs();
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

  const toggleNotifExpand = (id) =>
    setExpandedNotifId((prev) => (prev === id ? null : id));
  const togglePrExpand = (id) =>
    setExpandedPrId((prev) => (prev === id ? null : id));

  const findTask = (list) => {
    for (const t of list) {
      if (t.id === menuTaskId) return t;
      if (t.subtasks?.length) {
        const f = findTask(t.subtasks);
        if (f) return f;
      }
    }
    return null;
  };
  const menuTask = menuTaskId ? findTask(favoriteTeamworkTasks) : null;
  const twStages = menuTask
    ? workflowData?.[menuTask.workflowId]?.stages || []
    : [];

  const handleBadgeClick = (task) => {
    setMenuTaskId(task.id);
    onLoadWorkflowStages(task.workflowId);
  };

  const hasLoose = favoriteLooseEnds.length > 0;
  const hasTeamwork = favoriteTeamworkTasks.length > 0;
  const hasNotifs = favoriteGithubNotifs.length > 0;
  const hasMyPRs = favoriteMyPRs.length > 0;
  const hasReviewPRs = favoriteReviewRequestPRs.length > 0;
  const isEmpty =
    !hasLoose && !hasTeamwork && !hasNotifs && !hasMyPRs && !hasReviewPRs;

  return (
    <>
      {/* Tab */}
      <button
        onClick={() => onToggle(!open)}
        style={{
          position: "absolute",
          right: 0,
          top: "140px",
          width: "32px",
          height: "48px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: 0,
        }}
        title="Favorites"
      >
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "26px",
            height: "26px",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill="#fde047"
            style={{ position: "absolute", inset: 0 }}
          >
            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 18.896l-7.416 4.517 1.48-8.279L0 9.306l8.332-1.151z" />
          </svg>
          {totalCount > 0 && (
            <span
              style={{
                position: "relative",
                color: "#1a1a1a",
                fontSize: "11px",
                fontWeight: "800",
                lineHeight: 1,
                marginTop: "2px",
              }}
            >
              {totalCount}
            </span>
          )}
        </span>
      </button>

      {/* Panel content */}
      <div
        style={{
          position: "absolute",
          right: open ? `${panelRight}px` : "32px",
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
            style={{ fontSize: "14px", fontWeight: "700", color: "#e5e7eb" }}
          >
            ★ Favorites
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {isEmpty && (
            <div
              style={{
                padding: "24px 16px",
                color: "#4b5563",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No favorites yet — pin (★) any item to add it here
            </div>
          )}

          {hasLoose && (
            <Section title="📋 Loose Ends" count={favoriteLooseEnds.length}>
              {favoriteLooseEnds.map((item) => (
                <LooseEndItem
                  key={item.id}
                  item={item}
                  pinnedIds={loosePinnedIds}
                  onComplete={onCompleteLoose}
                  onDelete={onDeleteLoose}
                  onTogglePin={onTogglePinLoose}
                />
              ))}
            </Section>
          )}

          {hasTeamwork && (
            <Section title="✅ Teamwork" count={favoriteTeamworkTasks.length}>
              {menuTaskId && (
                <div
                  onClick={() => setMenuTaskId(null)}
                  style={{ position: "fixed", inset: 0, zIndex: 99 }}
                />
              )}
              {favoriteTeamworkTasks.map((task) => (
                <div key={task.id} style={{ padding: "0 16px" }}>
                  <TaskNode
                    task={task}
                    onToggleExpanded={onToggleExpanded}
                    onToggleDescExpanded={onToggleDescExpanded}
                    menuTaskId={menuTaskId}
                    onBadgeClick={handleBadgeClick}
                    stages={twStages}
                    onSelectStage={onChangeStage}
                    onCloseMenu={() => setMenuTaskId(null)}
                    pinnedIds={twPinnedIds}
                    onTogglePin={onTogglePinTask}
                    getNote={getTwNote}
                    setNote={setTwNote}
                  />
                </div>
              ))}
            </Section>
          )}

          {hasNotifs && (
            <Section
              title="🔔 GitHub Notifications"
              count={favoriteGithubNotifs.length}
            >
              <div style={{ padding: "0 16px" }}>
                {favoriteGithubNotifs.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    pinned={ghPinnedIds.has(String(n.id))}
                    onTogglePin={onTogglePinGh}
                    onMarkRead={onMarkRead}
                    confirmDeleteId={confirmDeleteId}
                    onConfirmDelete={handleConfirmDelete}
                    expanded={expandedNotifId === n.id}
                    onToggleExpand={toggleNotifExpand}
                    noteText={getGhNote(n.id)}
                    onNoteChange={(text) => setGhNote(n.id, text)}
                  />
                ))}
              </div>
            </Section>
          )}

          {hasMyPRs && (
            <Section title="🔀 My GitHub PRs" count={favoriteMyPRs.length}>
              <div style={{ padding: "0 16px" }}>
                {favoriteMyPRs.map((pr) => (
                  <PRItem
                    key={pr.id}
                    pr={pr}
                    pinned={ghPinnedIds.has(String(pr.id))}
                    onTogglePin={onTogglePinGh}
                    expanded={expandedPrId === pr.id}
                    onToggleExpand={togglePrExpand}
                    noteText={getGhNote(pr.id)}
                    onNoteChange={(text) => setGhNote(pr.id, text)}
                    thresholds={DEFAULT_AGE_THRESHOLDS.mine}
                  />
                ))}
              </div>
            </Section>
          )}

          {hasReviewPRs && (
            <Section
              title="👀 Review Requests"
              count={favoriteReviewRequestPRs.length}
            >
              <div style={{ padding: "0 16px" }}>
                {favoriteReviewRequestPRs.map((pr) => (
                  <PRItem
                    key={pr.id}
                    pr={pr}
                    pinned={ghPinnedIds.has(String(pr.id))}
                    onTogglePin={onTogglePinGh}
                    expanded={expandedPrId === pr.id}
                    onToggleExpand={togglePrExpand}
                    noteText={getGhNote(pr.id)}
                    onNoteChange={(text) => setGhNote(pr.id, text)}
                    thresholds={DEFAULT_AGE_THRESHOLDS.reviewRequests}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
