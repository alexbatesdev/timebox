import { toMin, workdayHour } from "../utils/time.js";
import { TIMEBOX_STATE_LABEL } from "./richText.js";

export const notionRichTextToPlain = (richText = []) =>
  richText.map((item) => item.plain_text || item.text?.content || "").join("");

export const parseSnapshotText = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schedType !== "standup" && parsed.schedType !== "noStandup") {
      return null;
    }
    return {
      schedType: parsed.schedType,
      blocks: Array.isArray(parsed.blocks) ? parsed.blocks : [],
      tasks:
        parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {},
      wrapup:
        parsed.wrapup && typeof parsed.wrapup === "object"
          ? { left: parsed.wrapup.left || "", next: parsed.wrapup.next || "" }
          : { left: "", next: "" },
    };
  } catch {
    return null;
  }
};

export const parseTimeRange = (text) => {
  const match = text.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2}):\s*(.+)$/);
  if (!match) return null;
  const [, sh, sm, eh, em, label] = match;
  return {
    start: workdayHour(Number(sh)) * 60 + Number(sm),
    end: workdayHour(Number(eh)) * 60 + Number(em),
    label: label.trim(),
  };
};

export const inferSchedTypeFromBlocks = (parsedBlocks) => {
  const plan = parsedBlocks.find((block) => block.id === "plan");
  return plan && plan.end - plan.start === 30 ? "standup" : "noStandup";
};

export const inferBlockType = (label, childText) => {
  if (label === "Wrap up") return "wrapup";
  if (label === "Away") return "away";
  if (label === "Lunch" || label === "Break") return "break";
  if (label.includes("Flex")) return "flex-work";
  if (childText.startsWith("Notes:")) return "meeting";
  return "work";
};

export const parseLegacyNotionBlocks = (notionBlocks) => {
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
      const leftMatch = childText.match(
        /Where I left off:\n([\s\S]*?)(?:\nWhat's next:|$)/,
      );
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

export const extractSnapshotFromBlocks = (notionBlocks) => {
  const stateToggle = notionBlocks.find(
    (block) =>
      block.type === "toggle" &&
      notionRichTextToPlain(block.toggle?.rich_text) === TIMEBOX_STATE_LABEL,
  );
  const codeBlock = stateToggle?.children?.find(
    (child) => child.type === "code",
  );
  const snapshot = codeBlock
    ? parseSnapshotText(notionRichTextToPlain(codeBlock.code?.rich_text))
    : null;
  return snapshot || parseLegacyNotionBlocks(notionBlocks);
};
