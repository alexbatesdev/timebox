export default function ExportBar({ isSending, onCopyMarkdown, onSendToNotion }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={onCopyMarkdown}
        style={{
          flex: 1,
          padding: "10px",
          background: "#161616",
          border: "1px solid #252525",
          borderRadius: "10px",
          color: "#9ca3af",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        📋 Copy as Markdown
      </button>
      <button
        onClick={onSendToNotion}
        disabled={isSending}
        style={{
          flex: 1,
          padding: "10px",
          background: "#161616",
          border: "1px solid #252525",
          borderRadius: "10px",
          color: "#9ca3af",
          fontSize: "13px",
          cursor: isSending ? "wait" : "pointer",
          opacity: isSending ? 0.6 : 1,
        }}
      >
        📤 Send to Notion
      </button>
    </div>
  );
}
