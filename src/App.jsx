import { useState, useEffect, useRef, useCallback } from "react";

/* ── helpers ─────────────────────────────────────────────── */
const toMin = (h, m) => h * 60 + m;
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
};
const getNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const fmtDate = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
const todayKey = () => `timebox-${new Date().toISOString().slice(0, 10)}`;

/* ── localStorage ────────────────────────────────────────── */
const loadState = () => {
  try {
    const raw = localStorage.getItem(todayKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (state) => {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(state));
  } catch {
    /* quota exceeded — silently ignore */
  }
};
const clearState = () => localStorage.removeItem(todayKey());

/* ── schedules ───────────────────────────────────────────── */
const SCHEDULES = {
  standup: [
    { id: "plan", label: "Plan the day", start: toMin(9, 0), end: toMin(9, 30), type: "work" },
    { id: "sdup", label: "Standup", start: toMin(9, 30), end: toMin(9, 45), type: "meeting" },
    { id: "A", label: "Block A", start: toMin(9, 45), end: toMin(11, 0), type: "work" },
    { id: "brk1", label: "Break", start: toMin(11, 0), end: toMin(11, 15), type: "break" },
    { id: "B", label: "Block B", start: toMin(11, 15), end: toMin(12, 45), type: "work" },
    { id: "lunch", label: "Lunch", start: toMin(12, 45), end: toMin(13, 15), type: "break" },
    { id: "C", label: "Block C", start: toMin(13, 15), end: toMin(14, 45), type: "work" },
    { id: "brk2", label: "Break", start: toMin(14, 45), end: toMin(15, 0), type: "break" },
    { id: "D", label: "Block D — Flex", start: toMin(15, 0), end: toMin(16, 45), type: "flex-work" },
    { id: "wrap", label: "Wrap up", start: toMin(16, 45), end: toMin(17, 0), type: "wrapup" },
  ],
  noStandup: [
    { id: "plan", label: "Plan the day", start: toMin(9, 0), end: toMin(9, 15), type: "work" },
    { id: "A", label: "Block A", start: toMin(9, 15), end: toMin(11, 0), type: "work" },
    { id: "brk1", label: "Break", start: toMin(11, 0), end: toMin(11, 15), type: "break" },
    { id: "B", label: "Block B", start: toMin(11, 15), end: toMin(12, 45), type: "work" },
    { id: "lunch", label: "Lunch", start: toMin(12, 45), end: toMin(13, 15), type: "break" },
    { id: "C", label: "Block C", start: toMin(13, 15), end: toMin(14, 45), type: "work" },
    { id: "brk2", label: "Break", start: toMin(14, 45), end: toMin(15, 0), type: "break" },
    { id: "D", label: "Block D — Flex", start: toMin(15, 0), end: toMin(16, 45), type: "flex-work" },
    { id: "wrap", label: "Wrap up", start: toMin(16, 45), end: toMin(17, 0), type: "wrapup" },
  ],
};

/* ── colors ───────────────────────────────────────────────── */
const TC = {
  work: { bg: "#0f2040", border: "#3b82f6", accent: "#93c5fd", dot: "#3b82f6" },
  "flex-work": { bg: "#0f2040", border: "#60a5fa", accent: "#bfdbfe", dot: "#60a5fa" },
  break: { bg: "#0d2a1a", border: "#22c55e", accent: "#86efac", dot: "#22c55e" },
  meeting: { bg: "#1e0f3a", border: "#a855f7", accent: "#d8b4fe", dot: "#a855f7" },
  wrapup: { bg: "#2a1500", border: "#f97316", accent: "#fdba74", dot: "#f97316" },
};

/* ── notion export helpers ────────────────────────────────── */
const buildMarkdown = (schedType, blocks, tasks, wrapup) => {
  const schedLabel = schedType === "standup" ? "Standup Day" : "No Standup";
  let md = `# Daily Timebox — ${fmtDate()}\n${schedLabel}\n\n`;
  md += `| Time | Block | Task |\n|------|-------|------|\n`;
  for (const b of blocks) {
    const task = tasks[b.id] || "";
    md += `| ${fmtTime(b.start)} – ${fmtTime(b.end)} | ${b.label} | ${task} |\n`;
  }
  if (wrapup.left || wrapup.next) {
    md += `\n## Wrap-up\n`;
    if (wrapup.left) md += `**Where I left off:** ${wrapup.left}\n\n`;
    if (wrapup.next) md += `**What's next:** ${wrapup.next}\n`;
  }
  return md;
};

const buildNotionPayload = (parentPageId, schedType, blocks, tasks, wrapup) => {
  const schedLabel = schedType === "standup" ? "Standup Day" : "No Standup";
  const children = [];

  children.push({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: schedLabel } }],
    },
  });
  children.push({ object: "block", type: "divider", divider: {} });

  for (const b of blocks) {
    const task = tasks[b.id] ? ` — ${tasks[b.id]}` : "";
    children.push({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: `${fmtTime(b.start)} – ${fmtTime(b.end)}` },
            annotations: { bold: true },
          },
          { type: "text", text: { content: `  ${b.label}${task}` } },
        ],
      },
    });
  }

  if (wrapup.left || wrapup.next) {
    children.push({ object: "block", type: "divider", divider: {} });
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "Wrap-up" } }] },
    });
    if (wrapup.left) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "Where I left off: " }, annotations: { bold: true } },
            { type: "text", text: { content: wrapup.left } },
          ],
        },
      });
    }
    if (wrapup.next) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "What's next: " }, annotations: { bold: true } },
            { type: "text", text: { content: wrapup.next } },
          ],
        },
      });
    }
  }

  return {
    parent: { page_id: parentPageId },
    properties: {
      title: [{ text: { content: `Daily Timebox — ${fmtDate()}` } }],
    },
    children,
  };
};

/* ── app ──────────────────────────────────────────────────── */
export default function App() {
  const [schedType, setSchedType] = useState(() => loadState()?.schedType ?? null);
  const [blocks, setBlocks] = useState(() => loadState()?.blocks ?? []);
  const [tasks, setTasks] = useState(() => loadState()?.tasks ?? {});
  const [wrapup, setWrapup] = useState(() => loadState()?.wrapup ?? { left: "", next: "" });
  const [now, setNow] = useState(getNow());
  const [notifPerm, setNotifPerm] = useState(() => {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  });
  const notified = useRef(new Set());

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mtgLabel, setMtgLabel] = useState("");
  const [mtgHour, setMtgHour] = useState(14);
  const [mtgMinute, setMtgMinute] = useState(0);
  const [mtgDuration, setMtgDuration] = useState(30);
  const [exportStatus, setExportStatus] = useState(null);

  /* persist to localStorage */
  useEffect(() => {
    if (schedType === null) return;
    saveState({ schedType, blocks, tasks, wrapup });
  }, [schedType, blocks, tasks, wrapup]);

  /* clock tick */
  useEffect(() => {
    const t = setInterval(() => setNow(getNow()), 30000);
    return () => clearInterval(t);
  }, []);

  /* notifications */
  useEffect(() => {
    if (!notifPerm || !blocks.length) return;
    blocks.forEach((b) => {
      if (now >= b.start && now < b.start + 2 && !notified.current.has(b.id)) {
        notified.current.add(b.id);
        const task = tasks[b.id] ? ` — ${tasks[b.id]}` : "";
        new Notification(`⏰ ${b.label}${task}`, {
          body: `${fmtTime(b.start)} – ${fmtTime(b.end)}`,
          requireInteraction: true,
        });
      }
    });
  }, [now, blocks, tasks, notifPerm]);

  const initSchedule = (type) => {
    setSchedType(type);
    setBlocks(SCHEDULES[type].map((b) => ({ ...b })));
    const t = {};
    SCHEDULES[type].forEach((b) => {
      t[b.id] = "";
    });
    setTasks(t);
    setWrapup({ left: "", next: "" });
    notified.current.clear();
  };

  const changeSchedule = () => {
    clearState();
    setSchedType(null);
    setBlocks([]);
    setTasks({});
    setWrapup({ left: "", next: "" });
  };

  const requestNotif = async () => {
    if ("Notification" in window) {
      const p = await Notification.requestPermission();
      setNotifPerm(p === "granted");
    }
  };

  const getCurIdx = () => {
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
      if (now >= blocks[i].start) idx = i;
    }
    return idx;
  };

  const shiftFuture = (delta) => {
    const ci = getCurIdx();
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i === ci) {
          // Breaks shift the whole block (starting late); work blocks grow/shrink
          if (b.type === "break")
            return { ...b, start: b.start + delta, end: b.end + delta };
          return { ...b, end: b.end + delta };
        }
        if (i > ci) return { ...b, start: b.start + delta, end: b.end + delta };
        return b;
      }),
    );
  };

  /* ── add meeting ─────────────────────────────────────── */
  const addMeeting = useCallback(() => {
    const meetStart = mtgHour * 60 + mtgMinute;
    const meetEnd = meetStart + mtgDuration;
    const meetingId = `mtg_${Date.now()}`;

    setBlocks((prev) => {
      let newBlocks = prev.map((b) => ({ ...b }));

      newBlocks.push({
        id: meetingId,
        label: mtgLabel || "Meeting",
        start: meetStart,
        end: meetEnd,
        type: "meeting",
      });
      newBlocks.sort((a, b) => a.start - b.start);

      const pinned = new Set(["lunch"]);
      newBlocks.forEach((b) => {
        if (b.type === "meeting") pinned.add(b.id);
      });

      let changed = true;
      let iterations = 0;
      while (changed && iterations < 50) {
        changed = false;
        iterations++;
        for (let i = 0; i < newBlocks.length - 1; i++) {
          const curr = newBlocks[i];
          const next = newBlocks[i + 1];
          if (next.start < curr.end && !pinned.has(next.id)) {
            if (next.type === "flex-work") {
              newBlocks[i + 1] = { ...next, start: curr.end };
            } else {
              const dur = next.end - next.start;
              newBlocks[i + 1] = { ...next, start: curr.end, end: curr.end + dur };
            }
            changed = true;
          }
        }
        newBlocks.sort((a, b) => a.start - b.start);
      }

      newBlocks = newBlocks.filter((b) => b.end > b.start);
      return newBlocks;
    });

    setTasks((p) => ({ ...p, [meetingId]: "" }));
    setMtgLabel("");
    setShowMeetingForm(false);
  }, [mtgLabel, mtgHour, mtgMinute, mtgDuration]);

  const removeMeeting = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setTasks((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };

  /* ── notion export ──────────────────────────────────── */
  const copyMarkdown = async () => {
    const md = buildMarkdown(schedType, blocks, tasks, wrapup);
    await navigator.clipboard.writeText(md);
    setExportStatus("copied");
    setTimeout(() => setExportStatus(null), 2000);
  };

  const sendToNotion = async () => {
    const token = import.meta.env.VITE_NOTION_TOKEN;
    const parentPage = import.meta.env.VITE_NOTION_PARENT_PAGE;
    if (!token || !parentPage) {
      setExportStatus("missing-env");
      setTimeout(() => setExportStatus(null), 4000);
      return;
    }
    setExportStatus("sending");
    try {
      const payload = buildNotionPayload(parentPage, schedType, blocks, tasks, wrapup);
      const res = await fetch("/api/notion/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) setExportStatus("bad-token");
        else if (res.status === 404) setExportStatus("bad-parent");
        else setExportStatus(`error: ${err.message || res.status}`);
      } else {
        setExportStatus("sent");
      }
    } catch {
      setExportStatus("network-error");
    }
    setTimeout(() => setExportStatus(null), 4000);
  };

  /* ── render: schedule picker ────────────────────────── */
  if (!schedType) {
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
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "6px" }}>
            Daily Timebox
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: "36px" }}>
            {fmtDate()}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "16px" }}>
            What kind of day is it?
          </div>
          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => initSchedule("standup")}
              style={{
                padding: "16px 28px",
                background: "#0f2040",
                border: "2px solid #3b82f6",
                color: "#93c5fd",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                transition: "opacity .15s",
              }}
            >
              📢 Standup Day
            </button>
            <button
              onClick={() => initSchedule("noStandup")}
              style={{
                padding: "16px 28px",
                background: "#0d2a1a",
                border: "2px solid #22c55e",
                color: "#86efac",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              🤫 No Standup
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── render: main view ─────────────────────────────── */
  const ci = getCurIdx();
  const cur = blocks[ci];
  const tc = TC[cur?.type] || TC.work;
  const minsLeft = cur ? Math.max(0, cur.end - now) : 0;
  const progress = cur
    ? Math.min(100, Math.max(0, ((now - cur.start) / (cur.end - cur.start)) * 100))
    : 0;
  const wrapBlock = blocks.find((b) => b.type === "wrapup");
  const hasFlexTime = blocks.some((b) => b.type === "flex-work");
  const isWorkType = (t) => t === "work" || t === "flex-work";

  const exportStatusMsg = {
    copied: "✅ Copied to clipboard!",
    sent: "✅ Sent to Notion!",
    sending: "⏳ Sending…",
    "missing-env": "⚠️ Set VITE_NOTION_TOKEN and VITE_NOTION_PARENT_PAGE env vars",
    "bad-token": "⚠️ Invalid Notion token",
    "bad-parent": "⚠️ Parent page not found",
    "network-error": "⚠️ Network error — is the dev server running?",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        fontFamily: "system-ui,sans-serif",
        color: "#e5e7eb",
        padding: "16px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
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
            {schedType === "standup" ? "📢 Standup" : "🤫 No Standup"}
            <button
              onClick={changeSchedule}
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
              change
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
              onClick={requestNotif}
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
            <div style={{ fontSize: "11px", color: "#22c55e" }}>🔔 Alerts on</div>
          )}
        </div>
      </div>

      {/* Current Block */}
      {cur && (
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
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#f9fafb" }}>
                {cur.label}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                {fmtTime(cur.start)} – {fmtTime(cur.end)}
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

          {isWorkType(cur.type) && (
            <input
              value={tasks[cur.id] || ""}
              onChange={(e) => setTasks((p) => ({ ...p, [cur.id]: e.target.value }))}
              placeholder="What are you working on?"
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
            }}
          >
            <span style={{ fontSize: "11px", color: "#4b5563", marginRight: "2px" }}>
              Shift rest of day:
            </span>
            {[-15, -10, -5].map((d) => (
              <button
                key={d}
                onClick={() => shiftFuture(d)}
                style={{
                  padding: "4px 9px",
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
                onClick={() => shiftFuture(d)}
                style={{
                  padding: "4px 9px",
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
          </div>
        </div>
      )}

      {/* Add Meeting */}
      <div style={{ marginBottom: "12px" }}>
        {!showMeetingForm ? (
          <button
            onClick={() => setShowMeetingForm(true)}
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
              <span style={{ color: "#ef4444", fontSize: "11px", marginLeft: "4px" }}>
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
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#d8b4fe" }}>
                Add Meeting
              </div>
              <button
                onClick={() => setShowMeetingForm(false)}
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
              onChange={(e) => setMtgLabel(e.target.value)}
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
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px" }}>
                  Start time
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <select
                    value={mtgHour}
                    onChange={(e) => setMtgHour(Number(e.target.value))}
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
                    {Array.from({ length: 10 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={h}>
                        {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
                      </option>
                    ))}
                  </select>
                  <select
                    value={mtgMinute}
                    onChange={(e) => setMtgMinute(Number(e.target.value))}
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
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px" }}>
                  Duration
                </div>
                <select
                  value={mtgDuration}
                  onChange={(e) => setMtgDuration(Number(e.target.value))}
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
            <button
              onClick={addMeeting}
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

      {/* Block List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
        {blocks.map((b, i) => {
          if (i === ci) return null;
          const isPast = now >= b.end;
          const btc = TC[b.type] || TC.work;
          const showTask = isWorkType(b.type);
          const isAddedMeeting = b.id.startsWith("mtg_");
          return (
            <div
              key={b.id}
              style={{
                background: isPast ? "#111" : "#161616",
                border: `1px solid ${isPast ? "#1f1f1f" : "#252525"}`,
                borderRadius: "10px",
                padding: "10px 14px",
                opacity: isPast ? 0.45 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: isPast ? "#333" : btc.dot,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: isPast ? "#4b5563" : "#d1d5db",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.label}
                  </span>
                  {tasks[b.id] && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#4b5563",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      — {tasks[b.id]}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#4b5563" }}>
                    {fmtTime(b.start)}–{fmtTime(b.end)}
                  </div>
                  {isAddedMeeting && !isPast && (
                    <button
                      onClick={() => removeMeeting(b.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: "0 2px",
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {!isPast && showTask && (
                <input
                  value={tasks[b.id] || ""}
                  onChange={(e) =>
                    setTasks((p) => ({ ...p, [b.id]: e.target.value }))
                  }
                  placeholder="Task for this block..."
                  style={{
                    width: "100%",
                    background: "#ffffff07",
                    border: "1px solid #2a2a2a",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    color: "#9ca3af",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                    marginTop: "8px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Wrap-up */}
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
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#f97316" }}>
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
            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
              {label}
            </div>
            <textarea
              value={wrapup[k]}
              onChange={(e) =>
                setWrapup((p) => ({ ...p, [k]: e.target.value }))
              }
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

      {/* Export */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={copyMarkdown}
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
          onClick={sendToNotion}
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
            color: exportStatus.startsWith("⚠") || exportStatus.startsWith("error")
              ? "#fca5a5"
              : "#86efac",
            textAlign: "center",
          }}
        >
          {exportStatusMsg[exportStatus] || exportStatus}
        </div>
      )}
    </div>
  );
}
