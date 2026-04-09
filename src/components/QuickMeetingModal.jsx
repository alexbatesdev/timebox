import { fmtTime } from "../utils/time.js";

export default function QuickMeetingModal({
  show,
  meetingStart,
  now,
  label,
  manualMins,
  consumeFrom,
  onLabelChange,
  onManualMinsChange,
  onConsumeFromChange,
  onStartTimer,
  onEndTimer,
  onManualAdd,
  onClose,
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000aa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !meetingStart) onClose();
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #a855f740",
          borderRadius: "12px",
          padding: "20px",
          width: "340px",
          maxWidth: "90vw",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#d8b4fe" }}>
            📅 Quick Meeting
          </div>
          {!meetingStart && (
            <button
              onClick={onClose}
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
          )}
        </div>

        {/* Meeting name */}
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Meeting name"
          style={{
            width: "100%",
            background: "#ffffff0e",
            border: "1px solid #a855f730",
            borderRadius: "6px",
            padding: "7px 10px",
            color: "#f9fafb",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "12px",
          }}
        />

        {/* Consume toggle */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "Current block", value: "current" },
            { label: "Flex time", value: "flex" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onConsumeFromChange(opt.value)}
              style={{
                flex: 1,
                padding: "6px",
                background: consumeFrom === opt.value ? "#a855f720" : "#ffffff08",
                border: `1px solid ${consumeFrom === opt.value ? "#a855f7" : "#333"}`,
                color: consumeFrom === opt.value ? "#d8b4fe" : "#6b7280",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {meetingStart === null ? (
          <>
            <button
              onClick={onStartTimer}
              style={{
                width: "100%",
                padding: "10px",
                background: "#a855f720",
                border: "1px solid #a855f7",
                color: "#d8b4fe",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Start Timer
            </button>

            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#6b7280" }}>or</span>
              <input
                type="number"
                min="1"
                max="240"
                value={manualMins}
                onChange={(e) => onManualMinsChange(Math.max(1, Number(e.target.value)))}
                style={{
                  width: "60px",
                  background: "#ffffff0e",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>min</span>
              <button
                onClick={onManualAdd}
                style={{
                  flex: 1,
                  padding: "7px",
                  background: "#ffffff0a",
                  border: "1px solid #a855f740",
                  color: "#d8b4fe",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Add meeting
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "800",
                color: "#d8b4fe",
                marginBottom: "4px",
              }}
            >
              {Math.max(0, now - meetingStart)} min
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "16px",
              }}
            >
              in meeting since {fmtTime(meetingStart)}
            </div>
            <button
              onClick={onEndTimer}
              style={{
                width: "100%",
                padding: "10px",
                background: "#22c55e20",
                border: "1px solid #22c55e",
                color: "#86efac",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700",
              }}
            >
              End Meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
