export default function MeetingForm({
  show,
  hasFlexTime,
  startHour,
  endHour,
  mtgLabel,
  mtgHour,
  mtgMinute,
  mtgDuration,
  mtgIncludesLunch,
  onLabelChange,
  onHourChange,
  onMinuteChange,
  onDurationChange,
  onIncludesLunchChange,
  onAdd,
  onToggle,
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {!show ? (
        <button
          onClick={() => onToggle(true)}
          style={{
            width: "100%",
            padding: "10px",
            background: "#161616",
            border: "1px solid #252525",
            borderRadius: "10px",
            color: "#6b7280",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span style={{ color: "#a855f7" }}>+</span> Add Meeting
          {!hasFlexTime && (
            <span
              style={{
                color: "#ef4444",
                fontSize: "11px",
                marginLeft: "4px",
              }}
            >
              (no flex time left)
            </span>
          )}
        </button>
      ) : (
        <div
          style={{
            background: "#1e0f3a",
            border: "1px solid #a855f740",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#d8b4fe",
              }}
            >
              Add Meeting
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
          <input
            value={mtgLabel}
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
              marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginBottom: "3px",
                }}
              >
                Start time
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <select
                  value={mtgHour}
                  onChange={(e) => onHourChange(Number(e.target.value))}
                  style={{
                    background: "#ffffff0e",
                    border: "1px solid #a855f730",
                    borderRadius: "6px",
                    padding: "6px",
                    color: "#f9fafb",
                    fontSize: "13px",
                    outline: "none",
                    flex: 1,
                  }}
                >
                  {Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour).map((h) => (
                    <option key={h} value={h}>
                      {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
                    </option>
                  ))}
                </select>
                <select
                  value={mtgMinute}
                  onChange={(e) => onMinuteChange(Number(e.target.value))}
                  style={{
                    background: "#ffffff0e",
                    border: "1px solid #a855f730",
                    borderRadius: "6px",
                    padding: "6px",
                    color: "#f9fafb",
                    fontSize: "13px",
                    outline: "none",
                    width: "60px",
                  }}
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      :{String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ minWidth: "100px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginBottom: "3px",
                }}
              >
                Duration
              </div>
              <select
                value={mtgDuration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                style={{
                  width: "100%",
                  background: "#ffffff0e",
                  border: "1px solid #a855f730",
                  borderRadius: "6px",
                  padding: "6px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                {[15, 30, 45, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "10px",
              fontSize: "12px",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={mtgIncludesLunch}
              onChange={(e) => onIncludesLunchChange(e.target.checked)}
              style={{ accentColor: "#a855f7" }}
            />
            Includes lunch
          </label>
          <button
            onClick={onAdd}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "8px",
              background: "#a855f7",
              border: "none",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Add Meeting
          </button>
        </div>
      )}
    </div>
  );
}
