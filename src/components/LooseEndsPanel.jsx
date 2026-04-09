import { useState } from "react";

export default function LooseEndsPanel({
  open,
  onToggle,
  items,
  loading,
  onAdd,
  onComplete,
  onDelete,
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  };

  return (
    <div
      style={{
        width: open ? "calc(450px + 32px)" : "32px",
        flexShrink: 0,
        transition: "width 0.25s ease",
        position: "relative",
        alignSelf: "stretch",
      }}
    >
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
          right: "32px",
          top: "16px",
          bottom: "16px",
          width: "450px",
          background: "#111",
          border: "1px solid #252525",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
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
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 16px",
                borderBottom: "1px solid #1f1f1f",
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
                  color: "#d1d5db",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  textAlign: "left",
                }}
              >
                {item.title}
              </span>
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
          ))}
        </div>
      </div>
    </div>
  );
}
