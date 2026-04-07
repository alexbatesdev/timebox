import { fmtTimeShort } from "../utils/time.js";

export const buildMarkdown = (blocks, tasks, wrapup) => {
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
