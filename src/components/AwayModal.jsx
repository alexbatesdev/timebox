import { fmtTime } from "../utils/time.js";

export default function AwayModal({
  show,
  awayStart,
  now,
  awayAbsorbFlex,
  awayManualMins,
  onAbsorbChange,
  onManualMinsChange,
  onStartPause,
  onEndPause,
  onManualPause,
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
        if (e.target === e.currentTarget && !awayStart)
          onClose();
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #eab30840",
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
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#fde047",
            }}
          >
            ⏸️ Step Away
          </div>
          {!awayStart && (
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

        {/* Absorb toggle */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "16px",
          }}
        >
          {[
            { label: "Use flex time", value: true },
            { label: "Extend day", value: false },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => onAbsorbChange(opt.value)}
              style={{
                flex: 1,
                padding: "6px",
                background:
                  awayAbsorbFlex === opt.value ? "#eab30820" : "#ffffff08",
                border: `1px solid ${awayAbsorbFlex === opt.value ? "#eab308" : "#333"}`,
                color: awayAbsorbFlex === opt.value ? "#fde047" : "#6b7280",
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

        {awayStart === null ? (
          <>
            {/* Live timer */}
            <button
              onClick={onStartPause}
              style={{
                width: "100%",
                padding: "10px",
                background: "#eab30820",
                border: "1px solid #eab308",
                color: "#fde047",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Start Timer
            </button>

            {/* Manual input */}
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
                value={awayManualMins}
                onChange={(e) =>
                  onManualMinsChange(Math.max(1, Number(e.target.value)))
                }
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
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                min
              </span>
              <button
                onClick={onManualPause}
                style={{
                  flex: 1,
                  padding: "7px",
                  background: "#ffffff0a",
                  border: "1px solid #eab30840",
                  color: "#fde047",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Add break
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: "800",
                color: "#fde047",
                marginBottom: "4px",
              }}
            >
              {Math.max(0, now - awayStart)} min
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "16px",
              }}
            >
              away since {fmtTime(awayStart)}
            </div>
            <button
              onClick={onEndPause}
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
              I'm Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
