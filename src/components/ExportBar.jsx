export default function ExportBar({ exportStatus, exportStatusMsg, onCopyMarkdown, onSendToNotion }) {
  return (
    <>
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
          disabled={exportStatus === "sending"}
          style={{
            flex: 1,
            padding: "10px",
            background: "#161616",
            border: "1px solid #252525",
            borderRadius: "10px",
            color: "#9ca3af",
            fontSize: "13px",
            cursor: exportStatus === "sending" ? "wait" : "pointer",
            opacity: exportStatus === "sending" ? 0.6 : 1,
          }}
        >
          📤 Send to Notion
        </button>
      </div>
      {exportStatus && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color:
              exportStatus.startsWith("⚠") || exportStatus.startsWith("error")
                ? "#fca5a5"
                : "#86efac",
            textAlign: "center",
          }}
        >
          {exportStatusMsg[exportStatus] || exportStatus}
        </div>
      )}
    </>
  );
}
