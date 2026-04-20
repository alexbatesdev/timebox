import { useState } from "react";
import AutoTextarea from "./AutoTextarea.jsx";

export default function NotesSection({ noteText, onNoteChange }) {
  const [expanded, setExpanded] = useState(Boolean(noteText));

  return (
    <div style={{ marginBottom: "6px" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: noteText ? "#9ca3af" : "#4b5563",
          cursor: "pointer",
          fontSize: "11px",
          padding: "2px 0",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "inherit",
        }}
      >
        <span style={{ fontSize: "9px" }}>{expanded ? "▼" : "▶"}</span>
        Notes
      </button>
      {expanded && (
        <div style={{ marginTop: "4px" }}>
          <AutoTextarea
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={3}
            placeholder="Add a note..."
            style={{
              width: "100%",
              background: "#ffffff06",
              border: "1px solid #252525",
              borderRadius: "6px",
              padding: "8px 10px",
              color: "#d1d5db",
              fontSize: "11px",
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: "1.5",
            }}
          />
        </div>
      )}
    </div>
  );
}
