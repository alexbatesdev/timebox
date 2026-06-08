import { useState } from "react";

export default function ExportBar({ exporters, onRun }) {
  const [runningId, setRunningId] = useState(null);

  const handleClick = async (exporter) => {
    setRunningId(exporter.id);
    try {
      await onRun(exporter);
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      {exporters.map((exporter) => {
        const busy = runningId === exporter.id;
        return (
          <button
            key={exporter.id}
            onClick={() => handleClick(exporter)}
            disabled={busy}
            style={{
              flex: 1,
              padding: "10px",
              background: "#161616",
              border: "1px solid #252525",
              borderRadius: "10px",
              color: "#9ca3af",
              fontSize: "13px",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {exporter.label}
          </button>
        );
      })}
    </div>
  );
}
