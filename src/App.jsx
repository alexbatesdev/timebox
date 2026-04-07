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
const getWeekdayKey = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
const NOTION_VERSION = "2022-06-28";
const TIMEBOX_STATE_LABEL = "_timebox_state";

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

const SCHEDULE_CONFIG = {
  defaultType: "noStandup",
  days: {
    monday: "standup",
    tuesday: "noStandup",
    wednesday: "standup",
    thursday: "noStandup",
    friday: "noStandup",
    saturday: "noStandup",
    sunday: "noStandup",
  },
};

const loadScheduleConfig = async () => {
  try {
    const res = await fetch("/schedule-config.json", { cache: "no-store" });
    if (!res.ok) return SCHEDULE_CONFIG;
    const data = await res.json();
    return {
      defaultType: data.defaultType === "standup" ? "standup" : "noStandup",
      days: { ...SCHEDULE_CONFIG.days, ...(data.days || {}) },
    };
  } catch {
    return SCHEDULE_CONFIG;
  }
};

/* ── schedules ───────────────────────────────────────────── */
const SCHEDULES = {
  standup: [
    {
      id: "plan",
      label: "Plan the day",
      start: toMin(9, 0),
      end: toMin(9, 30),
      type: "work",
    },
    {
      id: "sdup",
      label: "Standup",
      start: toMin(9, 30),
      end: toMin(10, 0),
      type: "meeting",
    },
    {
      id: "A",
      label: "Block A",
      start: toMin(10, 0),
      end: toMin(11, 0),
      type: "work",
    },
    {
      id: "brk1",
      label: "Break",
      start: toMin(11, 0),
      end: toMin(11, 15),
      type: "break",
    },
    {
      id: "B",
      label: "Block B",
      start: toMin(11, 15),
      end: toMin(12, 45),
      type: "work",
    },
    {
      id: "lunch",
      label: "Lunch",
      start: toMin(12, 45),
      end: toMin(13, 15),
      type: "break",
    },
    {
      id: "C",
      label: "Block C",
      start: toMin(13, 15),
      end: toMin(14, 45),
      type: "work",
    },
    {
      id: "brk2",
      label: "Break",
      start: toMin(14, 45),
      end: toMin(15, 0),
      type: "break",
    },
    {
      id: "D",
      label: "Block D — Flex",
      start: toMin(15, 0),
      end: toMin(16, 45),
      type: "flex-work",
    },
    {
      id: "wrap",
      label: "Wrap up",
      start: toMin(16, 45),
      end: toMin(17, 0),
      type: "wrapup",
    },
  ],
  noStandup: [
    {
      id: "plan",
      label: "Plan the day",
      start: toMin(9, 0),
      end: toMin(9, 15),
      type: "work",
    },
    {
      id: "A",
      label: "Block A",
      start: toMin(9, 15),
      end: toMin(11, 0),
      type: "work",
    },
    {
      id: "brk1",
      label: "Break",
      start: toMin(11, 0),
      end: toMin(11, 15),
      type: "break",
    },
    {
      id: "B",
      label: "Block B",
      start: toMin(11, 15),
      end: toMin(12, 45),
      type: "work",
    },
    {
      id: "lunch",
      label: "Lunch",
      start: toMin(12, 45),
      end: toMin(13, 15),
      type: "break",
    },
    {
      id: "C",
      label: "Block C",
      start: toMin(13, 15),
      end: toMin(14, 45),
      type: "work",
    },
    {
      id: "brk2",
      label: "Break",
      start: toMin(14, 45),
      end: toMin(15, 0),
      type: "break",
    },
    {
      id: "D",
      label: "Block D — Flex",
      start: toMin(15, 0),
      end: toMin(16, 45),
      type: "flex-work",
    },
    {
      id: "wrap",
      label: "Wrap up",
      start: toMin(16, 45),
      end: toMin(17, 0),
      type: "wrapup",
    },
  ],
};

/* ── colors ───────────────────────────────────────────────── */
const TC = {
  work: { bg: "#0f2040", border: "#3b82f6", accent: "#93c5fd", dot: "#3b82f6" },
  "flex-work": {
    bg: "#0f2040",
    border: "#60a5fa",
    accent: "#bfdbfe",
    dot: "#60a5fa",
  },
  break: {
    bg: "#0d2a1a",
    border: "#22c55e",
    accent: "#86efac",
    dot: "#22c55e",
  },
  meeting: {
    bg: "#1e0f3a",
    border: "#a855f7",
    accent: "#d8b4fe",
    dot: "#a855f7",
  },
  wrapup: {
    bg: "#2a1500",
    border: "#f97316",
    accent: "#fdba74",
    dot: "#f97316",
  },
  away: {
    bg: "#2a2200",
    border: "#eab308",
    accent: "#fde047",
    dot: "#eab308",
  },
};

/* ── notion export helpers ────────────────────────────────── */
const buildMarkdown = (blocks, tasks, wrapup) => {
  let md = "";
  for (const b of blocks) {
    const timeStr = `${fmtTimeShort(b.start)}-${fmtTimeShort(b.end)}`;
    const task = tasks[b.id] || "";
    md += `- ${timeStr}: ${b.label}\n`;
    if (b.type === "work" || b.type === "flex-work") {
      md += `    > ${task || ""}\n\n`;
    } else if (b.type === "meeting") {
      md += `    > Notes:\n    > ${task || ""}\n\n`;
    } else if (b.type === "wrapup") {
      md += `    > Where I left off:\n    > ${wrapup.left || ""}\n\n`;
      md += `    > What's next:\n    > ${wrapup.next || ""}\n\n`;
    } else {
      md += "\n";
    }
  }
  return md;
};

/* Short time format for Notion (12-hour, no AM/PM): "9:00", "1:15", "4:45" */
const fmtTimeShort = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")}`;
};

const NOTION_CUSTOM_EMOJI_ID =
  import.meta.env.VITE_NOTION_CUSTOM_EMOJI_ID || "";

const toRichText = (content) =>
  (content || "")
    .match(/[\s\S]{1,2000}/g)
    ?.map((chunk) => ({
      type: "text",
      text: { content: chunk },
    })) || [{ type: "text", text: { content: "" } }];

const notionCallout = (icon, text) => ({
  object: "block",
  type: "callout",
  callout: {
    icon,
    color: "gray_background",
    rich_text: toRichText(text),
  },
});

const emojiIcon = (emoji) => ({ type: "emoji", emoji });
const customEmojiIcon = (id) => ({
  type: "custom_emoji",
  custom_emoji: { id },
});
const workIcon = () =>
  NOTION_CUSTOM_EMOJI_ID
    ? customEmojiIcon(NOTION_CUSTOM_EMOJI_ID)
    : emojiIcon("💻");

const buildTimeboxSnapshot = (schedType, blocks, tasks, wrapup) => ({
  schedType,
  blocks,
  tasks,
  wrapup,
});

const notionRichTextToPlain = (richText = []) =>
  richText.map((item) => item.plain_text || item.text?.content || "").join("");

const parseSnapshotText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schedType !== "standup" && parsed.schedType !== "noStandup") {
      return null;
    }
    return {
      schedType: parsed.schedType,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      tasks: parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {},
      wrapup:
        parsed.wrapup && typeof parsed.wrapup === "object"
          ? { left: parsed.wrapup.left || "", next: parsed.wrapup.next || "" }
          : { left: "", next: "" },
    };
  } catch {
    return null;
  }
};

const workdayHour = (h) => (h >= 1 && h <= 8 ? h + 12 : h);

const parseTimeRange = (text) => {
  const match = text.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2}):\s*(.+)$/);
  if (!match) return null;
  const [, sh, sm, eh, em, label] = match;
  return {
    start: workdayHour(Number(sh)) * 60 + Number(sm),
    end: workdayHour(Number(eh)) * 60 + Number(em),
    label: label.trim(),
  };
};

const inferSchedTypeFromBlocks = (parsedBlocks) => {
  const plan = parsedBlocks.find((block) => block.id === "plan");
  return plan && plan.end - plan.start === 30 ? "standup" : "noStandup";
};

const inferBlockType = (label, childText) => {
  if (label === "Wrap up") return "wrapup";
  if (label === "Away") return "away";
  if (label === "Lunch" || label === "Break") return "break";
  if (label.includes("Flex")) return "flex-work";
  if (childText.startsWith("Notes:")) return "meeting";
  return "work";
};

const parseLegacyNotionBlocks = (notionBlocks) => {
  const parsedBlocks = [];
  const tasks = {};
  const wrapup = { left: "", next: "" };

  for (const block of notionBlocks) {
    if (block.type !== "toggle") continue;
    const title = notionRichTextToPlain(block.toggle?.rich_text);
    if (title === TIMEBOX_STATE_LABEL) continue;

    const parsedTitle = parseTimeRange(title);
    if (!parsedTitle) continue;

    const childText = (block.children || [])
      .filter((child) => child.type === "callout")
      .map((child) => notionRichTextToPlain(child.callout?.rich_text))
      .join("\n");
    const type = inferBlockType(parsedTitle.label, childText);
    const idMap = {
      "Plan the day": "plan",
      Standup: "sdup",
      "Block A": "A",
      "Block B": "B",
      "Block C": "C",
      Lunch: "lunch",
      "Wrap up": "wrap",
    };
    const fallbackBreakId = parsedTitle.start < toMin(12, 0) ? "brk1" : "brk2";
    const id =
      type === "meeting" && parsedTitle.label !== "Standup"
        ? `mtg_${parsedTitle.start}_${parsedTitle.end}_${parsedTitle.label}`
        : parsedTitle.label.includes("Block D")
          ? "D"
          : idMap[parsedTitle.label] || fallbackBreakId;

    parsedBlocks.push({
      id,
      label: parsedTitle.label,
      start: parsedTitle.start,
      end: parsedTitle.end,
      type,
    });

    if (type === "work" || type === "flex-work") {
      tasks[id] = childText;
    } else if (type === "meeting") {
      tasks[id] = childText.replace(/^Notes:\n?/, "");
    } else if (type === "wrapup") {
      const leftMatch = childText.match(/Where I left off:\n([\s\S]*?)(?:\nWhat's next:|$)/);
      const nextMatch = childText.match(/What's next:\n([\s\S]*)$/);
      wrapup.left = leftMatch?.[1]?.trim() || "";
      wrapup.next = nextMatch?.[1]?.trim() || "";
    }
  }

  if (!parsedBlocks.length) return null;
  return {
    schedType: inferSchedTypeFromBlocks(parsedBlocks),
    blocks: parsedBlocks,
    tasks,
    wrapup,
  };
};

const buildStateBlock = (snapshot) => ({
  object: "block",
  type: "toggle",
  toggle: {
    rich_text: [{ type: "text", text: { content: TIMEBOX_STATE_LABEL } }],
    children: [
      {
        object: "block",
        type: "code",
        code: {
          rich_text: toRichText(JSON.stringify(snapshot)),
          language: "json",
        },
      },
    ],
  },
});

const extractSnapshotFromBlocks = (notionBlocks) => {
  const stateToggle = notionBlocks.find(
    (block) =>
      block.type === "toggle" &&
      notionRichTextToPlain(block.toggle?.rich_text) === TIMEBOX_STATE_LABEL,
  );
  const codeBlock = stateToggle?.children?.find((child) => child.type === "code");
  const snapshot = codeBlock
    ? parseSnapshotText(notionRichTextToPlain(codeBlock.code?.rich_text))
    : null;
  return snapshot || parseLegacyNotionBlocks(notionBlocks);
};

const notionHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "Notion-Version": NOTION_VERSION,
});

const notionFetch = async (path, token, options = {}) =>
  fetch(`/api/notion${path}`, {
    ...options,
    headers: {
      ...notionHeaders(token),
      ...(options.headers || {}),
    },
  });

const fetchAllBlockChildren = async (blockId, token) => {
  const results = [];
  let cursor = null;

  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : "";
    const res = await notionFetch(`/blocks/${blockId}/children${query}`, token, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch block children (${res.status})`);
    }
    const data = await res.json();
    results.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return results;
};

const fetchBlockChildrenRecursive = async (notionBlocks, token) =>
  Promise.all(
    notionBlocks.map(async (block) => {
      if (!block.has_children) return block;
      const children = await fetchAllBlockChildren(block.id, token);
      return {
        ...block,
        children: await fetchBlockChildrenRecursive(children, token),
      };
    }),
  );

const queryTodayNotionEntry = async (token) => {
  const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
  if (!token || !dbId) return null;

  const dateProp = import.meta.env.VITE_NOTION_DATE_PROP || "date";
  const todayISO = new Date().toISOString().slice(0, 10);
  const res = await notionFetch(`/databases/${dbId}/query`, token, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: dateProp,
        date: { equals: todayISO },
      },
      page_size: 1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to query Notion (${res.status})`);
  }

  const data = await res.json();
  return data.results?.[0] || null;
};

const loadTodayFromNotion = async (token) => {
  const page = await queryTodayNotionEntry(token);
  if (!page) return null;

  const children = await fetchAllBlockChildren(page.id, token);
  const fullChildren = await fetchBlockChildrenRecursive(children, token);
  return {
    pageId: page.id,
    snapshot: extractSnapshotFromBlocks(fullChildren),
  };
};

const replaceNotionPageContent = async (pageId, token, children) => {
  const existingChildren = await fetchAllBlockChildren(pageId, token);
  for (const child of existingChildren) {
    const res = await notionFetch(`/blocks/${child.id}`, token, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to clear page content (${res.status})`);
    }
  }

  const res = await notionFetch(`/blocks/${pageId}/children`, token, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to append page content (${res.status})`);
  }
};

const buildNotionPayload = (parentPageId, schedType, blocks, tasks, wrapup) => {
  const modeLabel = schedType === "standup" ? "M" : "T";
  const children = [buildStateBlock(buildTimeboxSnapshot(schedType, blocks, tasks, wrapup))];

  for (const b of blocks) {
    const timeStr = `${fmtTimeShort(b.start)}-${fmtTimeShort(b.end)}`;
    const task = tasks[b.id] || "";
    const callouts = [];

    if (b.type === "work" || b.type === "flex-work") {
      callouts.push(notionCallout(workIcon(), task || ""));
    } else if (b.type === "meeting") {
      callouts.push(
        notionCallout(emojiIcon("✏️"), task ? `Notes:\n${task}` : "Notes:"),
      );
    } else if (b.type === "wrapup") {
      callouts.push(
        notionCallout(
          emojiIcon("💻"),
          `Where I left off:\n${wrapup.left || ""}`,
        ),
      );
      callouts.push(
        notionCallout(emojiIcon("💾"), `What's next:\n${wrapup.next || ""}`),
      );
    } else if (b.type === "away") {
      callouts.push(notionCallout(emojiIcon("⏸️"), "Away"));
    }
    // break blocks get no callouts

    const item = {
      object: "block",
      type: "toggle",
      toggle: {
        rich_text: [
          { type: "text", text: { content: `${timeStr}: ${b.label}` } },
        ],
      },
    };
    if (callouts.length > 0) {
      item.toggle.children = callouts;
    }
    children.push(item);
  }

  const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
  const todayISO = new Date().toISOString().slice(0, 10);
  const titleRichText = [
    { type: "mention", mention: { type: "date", date: { start: todayISO } } },
    { type: "text", text: { content: `'s Schedule (${modeLabel})` } },
  ];

  if (dbId) {
    const titleProp = import.meta.env.VITE_NOTION_TITLE_PROP || "Name";
    const dateProp = import.meta.env.VITE_NOTION_DATE_PROP || "date";
    return {
      parent: { database_id: dbId },
      properties: {
        [titleProp]: { title: titleRichText },
        [dateProp]: { date: { start: todayISO } },
      },
      children,
    };
  }

  return {
    parent: { page_id: parentPageId },
    properties: {
      title: titleRichText,
    },
    children,
  };
};

const createScheduleState = (type) => {
  const blocks = SCHEDULES[type].map((b) => ({ ...b }));
  const tasks = {};
  blocks.forEach((b) => {
    tasks[b.id] = "";
  });
  return {
    schedType: type,
    blocks,
    tasks,
    wrapup: { left: "", next: "" },
  };
};

const resolveInitialState = (type) => {
  const saved = loadState();
  if (saved?.schedType === type) {
    return {
      schedType: saved.schedType,
      blocks: saved.blocks ?? [],
      tasks: saved.tasks ?? {},
      wrapup: saved.wrapup ?? { left: "", next: "" },
    };
  }
  return createScheduleState(type);
};

/* ── app ──────────────────────────────────────────────────── */
export default function App() {
  const [schedType, setSchedType] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState({});
  const [wrapup, setWrapup] = useState({ left: "", next: "" });
  const [notionPageId, setNotionPageId] = useState(null);
  const [now, setNow] = useState(getNow());
  const [notifPerm, setNotifPerm] = useState(() => {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  });
  const notified = useRef(new Set());
  const [configStatus, setConfigStatus] = useState("loading");

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [mtgLabel, setMtgLabel] = useState("");
  const [mtgHour, setMtgHour] = useState(14);
  const [mtgMinute, setMtgMinute] = useState(0);
  const [mtgDuration, setMtgDuration] = useState(30);
  const [exportStatus, setExportStatus] = useState(null);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [awayStart, setAwayStart] = useState(null);
  const [awayAbsorbFlex, setAwayAbsorbFlex] = useState(true);
  const [awayManualMins, setAwayManualMins] = useState(15);

  /* persist to localStorage */
  useEffect(() => {
    if (schedType === null) return;
    saveState({ schedType, blocks, tasks, wrapup, notionPageId });
  }, [schedType, blocks, tasks, wrapup, notionPageId]);

  useEffect(() => {
    let cancelled = false;

    const applyConfig = async () => {
      const saved = loadState();
      if (saved?.schedType) {
        setSchedType(saved.schedType);
        setBlocks(saved.blocks ?? []);
        setTasks(saved.tasks ?? {});
        setWrapup(saved.wrapup ?? { left: "", next: "" });
        setNotionPageId(saved.notionPageId ?? null);
        notified.current.clear();
        setConfigStatus("ready");
        return;
      }

      const token = import.meta.env.VITE_NOTION_TOKEN;
      let notionState = null;
      try {
        notionState = await loadTodayFromNotion(token);
      } catch {
        notionState = null;
      }
      if (cancelled) return;

      if (notionState?.snapshot) {
        setSchedType(notionState.snapshot.schedType);
        setBlocks(notionState.snapshot.blocks);
        setTasks(notionState.snapshot.tasks);
        setWrapup(notionState.snapshot.wrapup);
        setNotionPageId(notionState.pageId);
        notified.current.clear();
        setConfigStatus("ready");
        return;
      }

      const config = await loadScheduleConfig();
      if (cancelled) return;

      const weekday = getWeekdayKey();
      const nextType =
        config.days[weekday] === "standup" ||
        config.days[weekday] === "noStandup"
          ? config.days[weekday]
          : config.defaultType;
      const nextState = resolveInitialState(nextType);

      setSchedType(nextState.schedType);
      setBlocks(nextState.blocks);
      setTasks(nextState.tasks);
      setWrapup(nextState.wrapup);
      setNotionPageId(null);
      notified.current.clear();
      setConfigStatus("ready");
    };

    applyConfig();

    return () => {
      cancelled = true;
    };
  }, []);

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
    const nextState = createScheduleState(type);
    setSchedType(nextState.schedType);
    setBlocks(nextState.blocks);
    setTasks(nextState.tasks);
    setWrapup(nextState.wrapup);
    setNotionPageId(null);
    notified.current.clear();
  };

  const reloadScheduleFromConfig = async () => {
    clearState();
    setConfigStatus("loading");
    const config = await loadScheduleConfig();
    const weekday = getWeekdayKey();
    const nextType =
      config.days[weekday] === "standup" || config.days[weekday] === "noStandup"
        ? config.days[weekday]
        : config.defaultType;
    initSchedule(nextType);
    setConfigStatus("ready");
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

  const resizeCurrentBlock = (delta) => {
    const ci = getCurIdx();
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i === ci) return { ...b, end: b.end + delta };
        if (i > ci) return { ...b, start: b.start + delta, end: b.end + delta };
        return b;
      }),
    );
  };

  const shiftCurrentBlock = (delta) => {
    const ci = getCurIdx();
    setBlocks((prev) => {
      const flexIdx = prev.findIndex((b) => b.type === "flex-work");
      return prev.map((b, i) => {
        if (i === ci - 1) return { ...b, end: b.end + delta };
        if (i >= ci && (flexIdx < 0 || i < flexIdx))
          return { ...b, start: b.start + delta, end: b.end + delta };
        if (i === flexIdx) return { ...b, start: b.start + delta };
        return b;
      });
    });
  };

  /* ── step away ────────────────────────────────────────── */
  const insertAwayBlock = (duration, absorbFlex) => {
    const ci = getCurIdx();
    const awayId = `away_${Date.now()}`;
    setBlocks((prev) => {
      const newBlocks = prev.map((b, i) => {
        if (i === ci) return { ...b, end: now };
        if (i > ci) return { ...b, start: b.start + duration, end: b.end + duration };
        return { ...b };
      });

      newBlocks.splice(ci + 1, 0, {
        id: awayId,
        label: "Away",
        start: now,
        end: now + duration,
        type: "away",
      });

      if (absorbFlex) {
        const flexIdx = newBlocks.findIndex((b) => b.type === "flex-work");
        if (flexIdx >= 0) {
          const flex = newBlocks[flexIdx];
          const newEnd = Math.max(flex.start, flex.end - duration);
          const leftover = duration - (flex.end - newEnd);
          newBlocks[flexIdx] = { ...flex, end: newEnd };
          if (leftover > 0) {
            for (let i = flexIdx + 1; i < newBlocks.length; i++) {
              newBlocks[i] = {
                ...newBlocks[i],
                start: newBlocks[i].start + leftover,
                end: newBlocks[i].end + leftover,
              };
            }
          }
        }
      }

      return newBlocks.filter((b) => b.end > b.start);
    });
    setShowAwayModal(false);
    setAwayStart(null);
  };

  const startPause = () => setAwayStart(now);

  const endPause = () => {
    const duration = Math.max(1, now - awayStart);
    insertAwayBlock(duration, awayAbsorbFlex);
  };

  const manualPause = () => {
    insertAwayBlock(awayManualMins, awayAbsorbFlex);
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
              newBlocks[i + 1] = {
                ...next,
                start: curr.end,
                end: curr.end + dur,
              };
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
    const md = buildMarkdown(blocks, tasks, wrapup);
    await navigator.clipboard.writeText(md);
    setExportStatus("copied");
    setTimeout(() => setExportStatus(null), 2000);
  };

  const sendToNotion = async () => {
    const token = import.meta.env.VITE_NOTION_TOKEN;
    const parentPage = import.meta.env.VITE_NOTION_PARENT_PAGE;
    const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
    if (!token || (!parentPage && !dbId)) {
      setExportStatus("missing-env");
      setTimeout(() => setExportStatus(null), 4000);
      return;
    }
    setExportStatus("sending");
    try {
      const payload = buildNotionPayload(
        parentPage,
        schedType,
        blocks,
        tasks,
        wrapup,
      );

      if (notionPageId) {
        const updateRes = await notionFetch(`/pages/${notionPageId}`, token, {
          method: "PATCH",
          body: JSON.stringify({ properties: payload.properties }),
        });
        if (!updateRes.ok) {
          const err = await updateRes.json().catch(() => ({}));
          if (updateRes.status === 401) setExportStatus("bad-token");
          else if (updateRes.status === 404) setExportStatus("bad-parent");
          else setExportStatus(`error: ${err.message || updateRes.status}`);
        } else {
          await replaceNotionPageContent(notionPageId, token, payload.children);
          setExportStatus("sent");
        }
      } else {
        const createRes = await notionFetch("/pages", token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          if (createRes.status === 401) setExportStatus("bad-token");
          else if (createRes.status === 404) setExportStatus("bad-parent");
          else setExportStatus(`error: ${err.message || createRes.status}`);
        } else {
          const created = await createRes.json();
          setNotionPageId(created.id);
          setExportStatus("sent");
        }
      }
    } catch {
      setExportStatus("network-error");
    }
    setTimeout(() => setExportStatus(null), 4000);
  };

  /* ── render: schedule picker ────────────────────────── */
  if (configStatus === "loading" || !schedType) {
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

  /* ── render: main view ─────────────────────────────── */
  const ci = getCurIdx();
  const cur = blocks[ci];
  const tc = TC[cur?.type] || TC.work;
  const minsLeft = cur ? Math.max(0, cur.end - now) : 0;
  const progress = cur
    ? Math.min(
        100,
        Math.max(0, ((now - cur.start) / (cur.end - cur.start)) * 100),
      )
    : 0;
  const wrapBlock = blocks.find((b) => b.type === "wrapup");
  const hasFlexTime = blocks.some((b) => b.type === "flex-work");
  const isWorkType = (t) => t === "work" || t === "flex-work";

  const exportStatusMsg = {
    copied: "✅ Copied to clipboard!",
    sent: "✅ Sent to Notion!",
    sending: "⏳ Sending…",
    "missing-env":
      "⚠️ Set VITE_NOTION_TOKEN and VITE_NOTION_PARENT_PAGE env vars",
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
              onClick={reloadScheduleFromConfig}
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
            <div style={{ fontSize: "11px", color: "#22c55e" }}>
              🔔 Alerts on
            </div>
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
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#f9fafb",
                }}
              >
                {cur.label}
              </div>
              <div
                style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}
              >
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
              onChange={(e) =>
                setTasks((p) => ({ ...p, [cur.id]: e.target.value }))
              }
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
            <span
              style={{ fontSize: "11px", color: "#4b5563", marginRight: "2px" }}
            >
              Resize:
            </span>
            {[-15, -10, -5].map((d) => (
              <button
                key={d}
                onClick={() => resizeCurrentBlock(d)}
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
                onClick={() => resizeCurrentBlock(d)}
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
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              marginTop: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: "11px", color: "#4b5563", marginRight: "2px" }}
            >
              Shift:
            </span>
            {[-15, -10, -5].map((d) => (
              <button
                key={d}
                onClick={() => shiftCurrentBlock(d)}
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
                onClick={() => shiftCurrentBlock(d)}
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

          <button
            onClick={() => setShowAwayModal(true)}
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
      )}

      {/* Away Modal */}
      {showAwayModal && (
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
            if (e.target === e.currentTarget && !awayStart) setShowAwayModal(false);
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
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#fde047" }}>
                ⏸️ Step Away
              </div>
              {!awayStart && (
                <button
                  onClick={() => setShowAwayModal(false)}
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
                  onClick={() => setAwayAbsorbFlex(opt.value)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    background: awayAbsorbFlex === opt.value ? "#eab30820" : "#ffffff08",
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
                  onClick={startPause}
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
                    onChange={(e) => setAwayManualMins(Math.max(1, Number(e.target.value)))}
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
                    onClick={manualPause}
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
                  onClick={endPause}
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          marginBottom: "12px",
        }}
      >
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    marginLeft: "8px",
                  }}
                >
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
            color:
              exportStatus.startsWith("⚠") || exportStatus.startsWith("error")
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
