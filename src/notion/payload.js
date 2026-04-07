import { fmtTimeShort } from "../utils/time.js";
import { TIMEBOX_STATE_LABEL, toRichText, notionCallout, emojiIcon, workIcon, buildTimeboxSnapshot } from "./richText.js";

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

export const buildNotionPayload = (parentPageId, schedType, blocks, tasks, wrapup) => {
  const modeLabel = schedType === "standup" ? "M" : "T";
  const children = [
    buildStateBlock(buildTimeboxSnapshot(schedType, blocks, tasks, wrapup)),
  ];

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
