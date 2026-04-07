import { fmtDate } from "../utils/time.js";

export default function LoadingScreen({ onInitSchedule }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui,sans-serif",
      }}
    >
      <div style={{ textAlign: "center", color: "#e5e7eb", padding: "24px" }}>
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📅</div>
        <div
          style={{ fontSize: "24px", fontWeight: "700", marginBottom: "6px" }}
        >
          Daily Timebox
        </div>
        <div
          style={{ color: "#6b7280", fontSize: "14px", marginBottom: "36px" }}
        >
          {fmtDate()}
        </div>
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>
          Loading today&apos;s schedule…
        </div>
      </div>
    </div>
  );
}
