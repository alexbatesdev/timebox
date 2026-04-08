import { fmtDate, fmtTime } from "../utils/time.js";

export default function Header({
  scheduleLabel,
  scheduleEmoji,
  now,
  notifPerm,
  onRequestNotif,
  onTestNotif,
  onReload,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}
    >
      <div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>{fmtDate()}</div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
          {scheduleEmoji} {scheduleLabel}
          <button
            onClick={onReload}
            style={{
              marginLeft: "8px",
              fontSize: "11px",
              color: "#4b5563",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            reload config
          </button>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: "800",
            color: "#f9fafb",
            letterSpacing: "-0.5px",
          }}
        >
          {fmtTime(now)}
        </div>
        {!notifPerm && (
          <button
            onClick={onRequestNotif}
            style={{
              fontSize: "11px",
              color: "#f97316",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔔 Enable alerts
          </button>
        )}
        {notifPerm && (
          <button
            onClick={onTestNotif}
            style={{
              fontSize: "11px",
              color: "#22c55e",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            🔔 Alerts on
          </button>
        )}
      </div>
    </div>
  );
}
