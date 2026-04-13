import { taskUrl } from "../teamwork/api.js";

const renderDescription = (text) => {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Convert markdown inline: **bold**, *italic*, [text](url)
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

function SubtaskNode({ task, depth, onToggleExpanded, onToggleDescExpanded }) {
  const hasChildren = task.subtasks?.length > 0;
  const hasContent = task.description || hasChildren || task.hasSubtasks;
  return (
    <div>
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
          onClick={() => onToggleExpanded(task.id)}
          style={{
            background: "none",
            border: "none",
            color:
              hasChildren || task.hasSubtasks
                ? "#d1d5db"
                : hasContent
                  ? "#6b7280"
                  : "#333",
            cursor: hasContent ? "pointer" : "default",
            fontSize: "10px",
            padding: "0 4px",
            flexShrink: 0,
            width: "16px",
            textAlign: "center",
          }}
        >
          {task.expanded ? "▼" : hasContent ? "▶" : "◦"}
        </button>
        <span
          style={{
            flex: 1,
            fontSize: "12px",
            color: "#d1d5db",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "left",
          }}
          title={task.name}
        >
          {task.name}
        </span>
        <a
          href={taskUrl(task.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#a855f7",
            fontSize: "12px",
            textDecoration: "none",
            flexShrink: 0,
          }}
          title="Open in Teamwork"
        >
          ↗
        </a>
      </div>
      {task.expanded && (
        <div style={{ paddingLeft: 16 }}>
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
            <SubtaskNode
              key={sub.id}
              task={sub}
              depth={depth + 1}
              onToggleExpanded={onToggleExpanded}
              onToggleDescExpanded={onToggleDescExpanded}
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
  onProjectChange,
  onToggleExpanded,
  onToggleDescExpanded,
}) {
  return (
    <div
      style={{
        width: open ? "calc(450px + 32px)" : "32px",
        flexShrink: 0,
        transition: "width 0.25s ease",
        position: "relative",
        alignSelf: "stretch",
        zIndex: 1,
      }}
    >
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
          {tasks.map((task) => (
            <div key={task.id}>
              {/* Task row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderBottom: "1px solid #1f1f1f",
                }}
              >
                <button
                  onClick={() => onToggleExpanded(task.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: task.hasSubtasks ? "#d1d5db" : "#6b7280",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "0 4px",
                    flexShrink: 0,
                    width: "20px",
                    textAlign: "center",
                  }}
                >
                  {task.expanded ? "▼" : "▶"}
                </button>
                <span
                  style={{
                    flex: 1,
                    fontSize: "13px",
                    color: "#d1d5db",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "left",
                  }}
                  title={task.name}
                >
                  {task.name}
                </span>
                <a
                  href={taskUrl(task.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#a855f7",
                    fontSize: "13px",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                  title="Open in Teamwork"
                >
                  ↗
                </a>
              </div>

              {/* Expanded details */}
              {task.expanded && (
                <div
                  style={{
                    padding: "8px 16px 8px 46px",
                    borderBottom: "1px solid #1f1f1f",
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                >
                  <DescriptionCard
                    task={task}
                    onToggle={onToggleDescExpanded}
                  />

                  {/* Tags */}
                  {task.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "4px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: tag.color || "#333",
                            color: "#fff",
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Subtasks */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div>
                      {task.subtasks.map((sub) => (
                        <SubtaskNode
                          key={sub.id}
                          task={sub}
                          depth={0}
                          onToggleExpanded={onToggleExpanded}
                          onToggleDescExpanded={onToggleDescExpanded}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
