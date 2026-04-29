import { useState } from "react";
import { useNotes } from "../hooks/useNotes.js";
import NotesSection from "./NotesSection.jsx";

export function LooseEndItem({
  item,
  pinnedIds,
  activeIds,
  activeColor,
  onComplete,
  onDelete,
  onTogglePin,
  onToggleActive,
}) {
  const { getNote, setNote } = useNotes("timebox-le-notes");
  const pinned = pinnedIds?.has(item.id);
  const active = activeIds?.has(item.id) ?? false;
  return (
    <div
      style={{
        padding: "10px 16px",
        borderBottom: "1px solid #1f1f1f",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
        }}
      >
        <button
          onClick={() => onComplete(item.id)}
          title="Mark done"
          style={{
            background: "none",
            border: "1px solid #333",
            borderRadius: "4px",
            width: "20px",
            height: "20px",
            cursor: "pointer",
            color: "#6b7280",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "1px",
            padding: 0,
          }}
        >
          ✓
        </button>
        <span
          style={{
            flex: 1,
            fontSize: "13px",
            color: active ? activeColor : pinned ? "#fde047" : "#d1d5db",
            fontWeight: active ? 700 : 400,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            textAlign: "left",
          }}
        >
          {item.title}
        </span>
        <button
          onClick={() => onTogglePin(item.id)}
          title={pinned ? "Unpin" : "Pin"}
          style={{
            background: "none",
            border: "none",
            color: pinned ? "#fde047" : "#4b5563",
            cursor: "pointer",
            fontSize: "13px",
            padding: "0 2px",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {pinned ? "★" : "☆"}
        </button>
        <button
          onClick={() => onToggleActive(item.id)}
          title={active ? "Stop active" : "Mark active"}
          style={{
            background: "none",
            border: "none",
            color: active ? activeColor : "#4b5563",
            cursor: "pointer",
            fontSize: "13px",
            padding: "0 2px",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          {active ? "●" : "○"}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          title="Delete"
          style={{
            background: "none",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "13px",
            padding: "0 2px",
            flexShrink: 0,
            marginTop: "1px",
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ marginLeft: "28px", marginTop: "4px" }}>
        <NotesSection
          noteText={getNote(item.id)}
          onNoteChange={(text) => setNote(item.id, text)}
        />
      </div>
    </div>
  );
}

export default function LooseEndsPanel({
  open,
  onToggle,
  items,
  loading,
  onAdd,
  onComplete,
  onDelete,
  pinnedIds,
  onTogglePin,
  activeIds,
  onToggleActive,
  activeColor,
  panelRight = 30,
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  };

  return (
    <>
      {/* Tab */}
      <button
        onClick={() => onToggle(!open)}
        style={{
          position: "absolute",
          right: 0,
          top: "80px",
          width: "32px",
          height: "48px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          color: "#9ca3af",
          fontSize: "14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
        title="Loose Ends"
      >
        {items.length > 0 ? (
          <span style={{ fontSize: "11px", fontWeight: "700" }}>
            {items.length}
          </span>
        ) : (
          "📋"
        )}
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
            style={{ fontSize: "14px", fontWeight: "700", color: "#e5e7eb" }}
          >
            📋 Loose Ends
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

        {/* Add input */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid #1f1f1f",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Add a loose end..."
            rows={2}
            style={{
              width: "100%",
              background: "#ffffff0a",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "7px 10px",
              color: "#f9fafb",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </form>

        {/* Items */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {loading && items.length === 0 && (
            <div
              style={{
                padding: "16px",
                color: "#6b7280",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              Loading…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div
              style={{
                padding: "16px",
                color: "#4b5563",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No loose ends
            </div>
          )}
          {items.map((item) => (
            <LooseEndItem
              key={item.id}
              item={item}
              pinnedIds={pinnedIds}
              activeIds={activeIds}
              activeColor={activeColor}
              onComplete={onComplete}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              onToggleActive={onToggleActive}
            />
          ))}
        </div>
      </div>
    </>
  );
}
