import { useState } from "react";
import { fmtTime } from "../utils/time.js";
import { TC, isWorkType } from "../data/theme.js";
import { loadYesterdayWrapup } from "../utils/storage.js";
import AutoTextarea from "./AutoTextarea.jsx";

export default function CurrentBlock({
  block,
  now,
  tasks,
  onTaskChange,
  onResize,
  onShift,
  onStepAway,
  onQuickMeeting,
}) {
  const [yesterdayWrapup] = useState(() => loadYesterdayWrapup());
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
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
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

      {block.id === "plan" &&
        yesterdayWrapup &&
        (yesterdayWrapup.left || yesterdayWrapup.next) && (
          <div
            style={{
              background: "#ffffff08",
              border: "1px solid #ffffff12",
              borderRadius: "8px",
              padding: "10px 12px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                color: "#6b7280",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Yesterday's wrap-up
            </div>
            {yesterdayWrapup.left && (
              <div style={{ marginBottom: "6px" }}>
                <div style={{ color: "#6b7280", fontSize: "11px" }}>
                  Where I left off
                </div>
                <div style={{ color: "#9ca3af", whiteSpace: "pre-wrap" }}>
                  {yesterdayWrapup.left}
                </div>
              </div>
            )}
            {yesterdayWrapup.next && (
              <div>
                <div style={{ color: "#6b7280", fontSize: "11px" }}>
                  What's next
                </div>
                <div style={{ color: "#9ca3af", whiteSpace: "pre-wrap" }}>
                  {yesterdayWrapup.next}
                </div>
              </div>
            )}
          </div>
        )}

      {(isWorkType(block.type) || block.type === "meeting") && (
        <AutoTextarea
          value={tasks[block.id] || ""}
          onChange={(e) => onTaskChange(block.id, e.target.value)}
          placeholder={
            block.type === "meeting" ? "Notes..." : "What are you working on?"
          }
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

      <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
        <button
          onClick={onStepAway}
          style={{
            flex: 1,
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
        <button
          onClick={onQuickMeeting}
          style={{
            flex: 1,
            padding: "8px",
            background: "#1e0f3a10",
            border: "1px solid #a855f740",
            color: "#d8b4fe",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          📅 Step Into Meeting
        </button>
      </div>
    </div>
  );
}
