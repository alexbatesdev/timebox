import { fmtTime } from "../utils/time.js";
import AutoTextarea from "./AutoTextarea.jsx";

export default function WrapupSection({ wrapup, wrapBlock, onWrapupChange }) {
  return (
    <div
      style={{
        background: "#130d00",
        border: "1px solid #f9731630",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div
          style={{ fontSize: "13px", fontWeight: "600", color: "#f97316" }}
        >
          📝 Wrap-up
        </div>
        {wrapBlock && (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {fmtTime(wrapBlock.start)} – {fmtTime(wrapBlock.end)}
          </div>
        )}
      </div>
      {[
        ["left", "Where I left off", "Current state of things..."],
        ["next", "What's next", "First thing tomorrow..."],
      ].map(([k, label, ph]) => (
        <div key={k} style={{ marginBottom: k === "left" ? "10px" : 0 }}>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "4px",
            }}
          >
            {label}
          </div>
          <AutoTextarea
            value={wrapup[k]}
            onChange={(e) => onWrapupChange(k, e.target.value)}
            placeholder={ph}
            style={{
              width: "100%",
              background: "#0a0a0a",
              border: "1px solid #1f1f1f",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#e5e7eb",
              fontSize: "13px",
              outline: "none",
              resize: "vertical",
              minHeight: "56px",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>
      ))}
    </div>
  );
}
