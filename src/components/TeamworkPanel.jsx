import { useState } from "react";
import { taskUrl } from "../teamwork/api.js";
import { useNotes } from "../hooks/useNotes.js";
import NotesSection from "./NotesSection.jsx";

const renderDescription = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = [];
    let remaining = line;
    let key = 0;
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={key++}>{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={key++}>{match[3]}</em>);
      } else if (match[4] && match[5]) {
        parts.push(
          <a
            key={key++}
            href={match[5]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#a855f7" }}
          >
            {match[4]}
          </a>,
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }

    const isList = line.match(/^[-*]\s/);
    return (
      <div
        key={i}
        style={{
          paddingLeft: isList ? "12px" : 0,
          textIndent: isList ? "-8px" : 0,
        }}
      >
        {isList ? "• " : ""}
        {parts.length > 0 ? parts : line}
      </div>
    );
  });
};

function DescriptionCard({ task, onToggle }) {
  if (!task.description) return null;
  return (
    <div style={{ marginBottom: "6px" }}>
      <button
        onClick={() => onToggle(task.id)}
        style={{
          background: "none",
          border: "none",
          color: "#6b7280",
          cursor: "pointer",
          fontSize: "11px",
          padding: "2px 0",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: "9px" }}>{task.descExpanded ? "▼" : "▶"}</span>
        Description
      </button>
      {task.descExpanded && (
        <div
          style={{
            marginTop: "4px",
            padding: "8px 10px",
            background: "#ffffff06",
            border: "1px solid #252525",
            borderRadius: "6px",
            fontSize: "11px",
            color: "#9ca3af",
            wordBreak: "break-word",
            textAlign: "left",
            lineHeight: "1.5",
          }}
        >
          {renderDescription(task.description)}
        </div>
      )}
    </div>
  );
}

const isLightColor = (hex) => {
  if (!hex) return false;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

function StageMenu({ task, stages, onSelect, onClose }) {
  if (!stages.length) {
    return (
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "100%",
          marginTop: "4px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "6px",
          padding: "8px 12px",
          zIndex: 100,
          fontSize: "11px",
          color: "#6b7280",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          whiteSpace: "nowrap",
        }}
      >
        Loading…
      </div>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: "100%",
        marginTop: "4px",
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "6px",
        padding: "4px 0",
        zIndex: 100,
        minWidth: "140px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      {stages.map((stage) => (
        <button
          key={stage.id}
          onClick={() => {
            onSelect(stage.id);
            onClose();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: "100%",
            padding: "6px 10px",
            background:
              String(task.stage?.id) === String(stage.id) ? "#252525" : "none",
            border: "none",
            color: "#d1d5db",
            fontSize: "11px",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#252525";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              String(task.stage?.id) === String(stage.id)
                ? "#252525"
                : "transparent";
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: stage.color || "#555",
              flexShrink: 0,
            }}
          />
          {stage.name}
        </button>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  fontSize = "12px",
  menuTaskId,
  onBadgeClick,
  stages,
  onSelectStage,
  onCloseMenu,
  pinned,
}) {
  const hasKids = task.hasSubtasks || task.subtasks?.length > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 0",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          color: pinned ? "#fde047" : hasKids ? "#d1d5db" : "#6b7280",
          cursor: "pointer",
          fontSize: "10px",
          padding: "0 4px",
          flexShrink: 0,
          width: "16px",
          textAlign: "center",
        }}
      >
        {task.expanded ? "▼" : "▶"}
      </button>
      <span
        style={{
          flex: 1,
          fontSize,
          color: "#d1d5db",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textAlign: "left",
        }}
        title={task.name}
      >
        {task.isPromotedSubtask && (
          <span style={{ color: "#4b5563", marginRight: "3px", fontSize: "10px" }}>↳</span>
        )}
        {task.name}
      </span>
      {task.workflowId && (
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBadgeClick(task);
            }}
            style={{
              fontSize: "9px",
              padding: "1px 6px",
              borderRadius: "9999px",
              background: task.stage?.color || "#333",
              color: isLightColor(task.stage?.color) ? "#1a1a1a" : "#fff",
              whiteSpace: "nowrap",
              flexShrink: 0,
              border: task.stage ? "none" : "1px solid #555",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: "600",
            }}
          >
            {task.stage?.name || "—"}
          </button>
          {menuTaskId === task.id && (
            <StageMenu
              task={task}
              stages={stages}
              onSelect={(stageId) =>
                onSelectStage(task.id, task.workflowId, stageId)
              }
              onClose={onCloseMenu}
            />
          )}
        </div>
      )}
      <a
        href={taskUrl(task.id)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "#a855f7",
          fontSize,
          textDecoration: "none",
          flexShrink: 0,
        }}
        title="Open in Teamwork"
      >
        ↗
      </a>
    </div>
  );
}

function TaskNode({
  task,
  onToggleExpanded,
  onToggleDescExpanded,
  menuTaskId,
  onBadgeClick,
  stages,
  onSelectStage,
  onCloseMenu,
  pinnedIds,
  onTogglePin,
  getNote,
  setNote,
}) {
  const pinned = pinnedIds?.has(String(task.id));
  return (
    <div>
      <TaskRow
        task={task}
        onToggle={() => onToggleExpanded(task.id)}
        menuTaskId={menuTaskId}
        onBadgeClick={onBadgeClick}
        stages={stages}
        onSelectStage={onSelectStage}
        onCloseMenu={onCloseMenu}
        pinned={pinned}
      />
      {task.expanded && (
        <div style={{ paddingLeft: 16 }}>
          <button
            onClick={() => onTogglePin(task.id)}
            style={{
              background: "none",
              border: "none",
              color: pinned ? "#fde047" : "#4b5563",
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 0",
              fontFamily: "inherit",
            }}
          >
            {pinned ? "★ Unpin" : "☆ Pin"}
          </button>
          <NotesSection
            noteText={getNote(task.id)}
            onNoteChange={(text) => setNote(task.id, text)}
          />
          <DescriptionCard task={task} onToggle={onToggleDescExpanded} />
          {task.hasSubtasks && !task.subtasks && (
            <div
              style={{
                padding: "4px 0",
                fontSize: "11px",
                color: "#4b5563",
                fontStyle: "italic",
              }}
            >
              Loading subtasks…
            </div>
          )}
          {task.subtasks?.map((sub) => (
            <TaskNode
              key={sub.id}
              task={sub}
              onToggleExpanded={onToggleExpanded}
              onToggleDescExpanded={onToggleDescExpanded}
              menuTaskId={menuTaskId}
              onBadgeClick={onBadgeClick}
              stages={stages}
              onSelectStage={onSelectStage}
              onCloseMenu={onCloseMenu}
              pinnedIds={pinnedIds}
              onTogglePin={onTogglePin}
              getNote={getNote}
              setNote={setNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamworkPanel({
  open,
  onToggle,
  tasks,
  projects,
  loading,
  selectedProjectId,
  workflowData,
  onProjectChange,
  onToggleExpanded,
  onToggleDescExpanded,
  onLoadWorkflowStages,
  onChangeStage,
  pinnedIds,
  onTogglePin,
  panelLeft = 30,
}) {
  const { getNote, setNote } = useNotes("timebox-tw-notes");
  const [menuTaskId, setMenuTaskId] = useState(null);
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
  const menuTask = menuTaskId ? findTask(tasks) : null;
  const stages = menuTask
    ? workflowData[menuTask.workflowId]?.stages || []
    : [];

  const handleBadgeClick = (task) => {
    setMenuTaskId(task.id);
    onLoadWorkflowStages(task.workflowId);
  };

  return (
    <>
      {/* Tab */}
      <button
        onClick={() => onToggle(!open)}
        style={{
          position: "absolute",
          left: 0,
          top: "80px",
          width: "32px",
          height: "48px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRight: "none",
          borderRadius: "8px 0 0 8px",
          color: "#a855f7",
          fontSize: "14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
        title="Teamwork Tasks"
      >
        {tasks.length > 0 ? (
          <span style={{ fontSize: "11px", fontWeight: "700" }}>
            {tasks.length}
          </span>
        ) : (
          "📋"
        )}
      </button>

      {/* Panel content */}
      <div
        style={{
          position: "absolute",
          left: open ? `${panelLeft}px` : "32px",
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
            📋 Teamwork
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

        {/* Project filter */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #1f1f1f",
          }}
        >
          <select
            value={selectedProjectId || ""}
            onChange={(e) => onProjectChange(e.target.value || null)}
            style={{
              width: "100%",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "7px 10px",
              color: "#f9fafb",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Task list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {loading && tasks.length === 0 && (
            <div
              style={{
                padding: "16px",
                color: "#6b7280",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              Loading tasks...
            </div>
          )}
          {!loading && tasks.length === 0 && (
            <div
              style={{
                padding: "16px",
                color: "#4b5563",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No tasks
            </div>
          )}
          {menuTaskId && (
            <div
              onClick={() => setMenuTaskId(null)}
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
            />
          )}
          {tasks.map((task) => (
            <div key={task.id} style={{ padding: "0 16px" }}>
              <TaskNode
                task={task}
                onToggleExpanded={onToggleExpanded}
                onToggleDescExpanded={onToggleDescExpanded}
                menuTaskId={menuTaskId}
                onBadgeClick={handleBadgeClick}
                stages={stages}
                onSelectStage={onChangeStage}
                onCloseMenu={() => setMenuTaskId(null)}
                pinnedIds={pinnedIds}
                onTogglePin={onTogglePin}
                getNote={getNote}
                setNote={setNote}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
