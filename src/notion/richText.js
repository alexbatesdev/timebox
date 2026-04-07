export const NOTION_VERSION = "2022-06-28";
export const TIMEBOX_STATE_LABEL = "_timebox_state";

export const NOTION_CUSTOM_EMOJI_ID =
  import.meta.env.VITE_NOTION_CUSTOM_EMOJI_ID || "";

export const toRichText = (content) =>
  (content || "").match(/[\s\S]{1,2000}/g)?.map((chunk) => ({
    type: "text",
    text: { content: chunk },
  })) || [{ type: "text", text: { content: "" } }];

export const notionCallout = (icon, text) => ({
  object: "block",
  type: "callout",
  callout: {
    icon,
    color: "gray_background",
    rich_text: toRichText(text),
  },
});

export const emojiIcon = (emoji) => ({ type: "emoji", emoji });
export const customEmojiIcon = (id) => ({
  type: "custom_emoji",
  custom_emoji: { id },
});
export const workIcon = () =>
  NOTION_CUSTOM_EMOJI_ID
    ? customEmojiIcon(NOTION_CUSTOM_EMOJI_ID)
    : emojiIcon("💻");

export const buildTimeboxSnapshot = (schedType, blocks, tasks, wrapup) => ({
  schedType,
  blocks,
  tasks,
  wrapup,
});
