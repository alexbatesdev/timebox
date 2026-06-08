import {
  fmtTimeShort,
  localDateISO,
  DEFAULT_TIME_FORMAT,
} from "../../utils/time.js";
import { TIMEBOX_STATE_LABEL } from "../../notion/richText.js";
import { getDateProp, getTitleProp } from "../../notion/schema.js";

/* ── Notion rich-text / block helpers (export-only) ──────────────────────── */

// Notion caps a single rich_text element at 2000 chars; split on that boundary.
export const toRichText = (content) =>
  (content || "").match(/[\s\S]{1,2000}/g)?.map((chunk) => ({
    type: "text",
    text: { content: chunk },
  })) || [{ type: "text", text: { content: "" } }];

export const emojiIcon = (emoji) => ({ type: "emoji", emoji });
export const customEmojiIcon = (id) => ({
  type: "custom_emoji",
  custom_emoji: { id },
});
const workIcon = () => {
  const customId = import.meta.env.VITE_NOTION_CUSTOM_EMOJI_ID;
  return customId ? customEmojiIcon(customId) : emojiIcon("💻");
};

export const notionCallout = (icon, text) => ({
  object: "block",
  type: "callout",
  callout: {
    icon,
    color: "gray_background",
    rich_text: toRichText(text),
  },
});

// The authoritative machine-readable snapshot. Always written first so reads
// (previous-wrap-up extraction) never depend on the cosmetic block titles.
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

const DEFAULT_LABEL_BY_TYPE = {
  meeting: "Meeting",
  away: "Away",
  break: "Break",
  wrapup: "Wrap up",
};

// Titles are cosmetic, but they still go into a Notion rich_text field, so keep
// them single-line and bounded. Falls back to a type-based name when empty.
const sanitizeLabel = (label, type) => {
  const cleaned = (label || "").replace(/\s+/g, " ").trim().slice(0, 200);
  return cleaned || DEFAULT_LABEL_BY_TYPE[type] || "Block";
};

// One cosmetic toggle per block, dispatched by type. Unknown types get a bare
// toggle (no callout) rather than being mis-rendered.
const buildBlockToggle = (block, tasks, wrapup, format) => {
  const timeStr = `${fmtTimeShort(block.start, format)}-${fmtTimeShort(
    block.end,
    format,
  )}`;
  const task = tasks[block.id] || "";
  const callouts = [];

  if (block.type === "work" || block.type === "flex-work") {
    callouts.push(notionCallout(workIcon(), task));
  } else if (block.type === "meeting") {
    callouts.push(
      notionCallout(emojiIcon("✏️"), task ? `Notes:\n${task}` : "Notes:"),
    );
  } else if (block.type === "wrapup") {
    callouts.push(
      notionCallout(emojiIcon("💻"), `Where I left off:\n${wrapup.left || ""}`),
    );
    callouts.push(
      notionCallout(emojiIcon("💾"), `What's next:\n${wrapup.next || ""}`),
    );
  } else if (block.type === "away") {
    callouts.push(notionCallout(emojiIcon("⏸️"), "Away"));
  }
  // break / unknown types intentionally get no callout

  const toggle = {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [
        {
          type: "text",
          text: {
            content: `${timeStr}: ${sanitizeLabel(block.label, block.type)}`,
          },
        },
      ],
    },
  };
  if (callouts.length > 0) toggle.toggle.children = callouts;
  return toggle;
};

/* ── payload builder (pure, no I/O) ──────────────────────────────────────── */

export const buildNotionPayload = ({
  schedType,
  blocks,
  tasks,
  wrapup,
  timeFormat = DEFAULT_TIME_FORMAT,
}) => {
  const children = [
    buildStateBlock({ schedType, blocks, tasks, wrapup }),
    ...blocks.map((block) =>
      buildBlockToggle(block, tasks, wrapup, timeFormat),
    ),
  ];

  const modeLabel = schedType === "standup" ? "M" : "T";
  const todayISO = localDateISO();
  const properties = {
    [getTitleProp()]: {
      title: [
        {
          type: "mention",
          mention: { type: "date", date: { start: todayISO } },
        },
        { type: "text", text: { content: `'s Schedule (${modeLabel})` } },
      ],
    },
    [getDateProp()]: { date: { start: todayISO } },
  };

  return { properties, children };
};
