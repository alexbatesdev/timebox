import { fmtTime } from "../utils/time.js";
import { TC, isWorkType } from "../data/theme.js";

export default function BlockList({
  blocks,
  currentIndex,
  now,
  tasks,
  onTaskChange,
  onRemoveMeeting,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        marginBottom: "12px",
      }}
    >
      {blocks.map((b, i) => {
        if (i === currentIndex) return null;
        const isPast = now >= b.end;
        const btc = TC[b.type] || TC.work;
        const showTask = isWorkType(b.type) || b.type === "meeting";
        const isAddedMeeting = b.id.startsWith("mtg_");
        // hide wrap-up block in list because it has its own section at the end
        // The wrap-up block is still part of the blocks array and is used for notifications and
        // timeline calculations, but it doesn't need to be displayed in the main block list.
        if (b.type == "wrapup") return null;
        return (
          <div
            key={b.id}
            style={{
              background: isPast ? "#111" : "#161616",
              border: `1px solid ${isPast ? "#1f1f1f" : "#252525"}`,
              borderRadius: "10px",
              padding: "10px 14px",
              opacity: isPast ? 0.45 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: isPast ? "#333" : btc.dot,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: isPast ? "#4b5563" : "#d1d5db",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.label}
                </span>
                {tasks[b.id] && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#4b5563",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    — {tasks[b.id]}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  marginLeft: "8px",
                }}
              >
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {fmtTime(b.start)}–{fmtTime(b.end)}
                </div>
                <div style={{ fontSize: "12px", color: "#4b5563" }}>
                  {b.end - b.start}m
                </div>
                {isAddedMeeting && !isPast && (
                  <button
                    onClick={() => onRemoveMeeting(b.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "13px",
                      padding: "0 2px",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {!isPast && showTask && (
              <textarea
                value={tasks[b.id] || ""}
                onChange={(e) => onTaskChange(b.id, e.target.value)}
                placeholder={
                  b.type === "meeting" ? "Notes..." : "Task for this block..."
                }
                rows={2}
                style={{
                  width: "100%",
                  background: "#ffffff07",
                  border: "1px solid #2a2a2a",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  color: "#9ca3af",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                  marginTop: "8px",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
