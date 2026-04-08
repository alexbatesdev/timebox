import { fmtTime } from "../utils/time.js";
import { TC, isWorkType } from "../data/theme.js";

export default function CurrentBlock({ block, now, tasks, onTaskChange, onResize, onShift, onStepAway }) {
  const tc = TC[block?.type] || TC.work;
  const minsLeft = Math.max(0, block.end - now);
  const progress = Math.min(
    100,
    Math.max(0, ((now - block.start) / (block.end - block.start)) * 100),
  );

  return (
    <div
      style={{
        background: tc.bg,
        border: `2px solid ${tc.border}`,
        borderRadius: "16px",
        padding: "18px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "11px",
              color: tc.accent,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "3px",
            }}
          >
            Now
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#f9fafb",
            }}
          >
            {block.label}
          </div>
          <div
            style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}
          >
            {fmtTime(block.start)} – {fmtTime(block.end)}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: "30px",
              fontWeight: "800",
              color: tc.accent,
              lineHeight: 1,
            }}
          >
            {minsLeft}
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>min left</div>
        </div>
      </div>

      <div
        style={{
          background: "#ffffff12",
          borderRadius: "99px",
          height: "5px",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            background: tc.border,
            borderRadius: "99px",
            height: "5px",
            width: `${progress}%`,
            transition: "width 1s linear",
          }}
        />
      </div>

      {(isWorkType(block.type) || block.type === "meeting") && (
        <textarea
          value={tasks[block.id] || ""}
          onChange={(e) => onTaskChange(block.id, e.target.value)}
          placeholder={block.type === "meeting" ? "Notes..." : "What are you working on?"}
          rows={2}
          style={{
            width: "100%",
            background: "#ffffff0e",
            border: `1px solid ${tc.border}40`,
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#f9fafb",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          marginTop: "12px",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{ fontSize: "11px", color: "#4b5563", marginRight: "2px" }}
        >
          Resize:
        </span>
        <span>
          {[-15, -10, -5].map((d) => (
            <button
              key={d}
              onClick={() => onResize(d)}
              style={{
                padding: "4px 9px",
                margin: "0 3px",
                background: "#ffffff0a",
                border: "1px solid #22c55e40",
                color: "#86efac",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {d}m
            </button>
          ))}
          {[5, 10, 15].map((d) => (
            <button
              key={d}
              onClick={() => onResize(d)}
              style={{
                padding: "4px 9px",
                margin: "0 3px",
                background: "#ffffff0a",
                border: "1px solid #ef444440",
                color: "#fca5a5",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              +{d}m
            </button>
          ))}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          marginTop: "6px",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{ fontSize: "11px", color: "#4b5563", marginRight: "2px" }}
        >
          Shift:
        </span>
        <span>
          {[-15, -10, -5].map((d) => (
            <button
              key={d}
              onClick={() => onShift(d)}
              style={{
                padding: "4px 9px",
                margin: "0 3px",
                background: "#ffffff0a",
                border: "1px solid #22c55e40",
                color: "#86efac",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {d}m
            </button>
          ))}
          {[5, 10, 15].map((d) => (
            <button
              key={d}
              onClick={() => onShift(d)}
              style={{
                padding: "4px 9px",
                margin: "0 3px",
                background: "#ffffff0a",
                border: "1px solid #ef444440",
                color: "#fca5a5",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              +{d}m
            </button>
          ))}
        </span>
      </div>

      <button
        onClick={onStepAway}
        style={{
          marginTop: "10px",
          width: "100%",
          padding: "8px",
          background: "#2a220010",
          border: "1px solid #eab30840",
          color: "#fde047",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        ⏸️ Step Away
      </button>
    </div>
  );
}
