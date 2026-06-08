import { buildMarkdown } from "./markdown.js";
import { notionExporter } from "./notion/index.js";

// Generic export layer: each exporter receives a snapshot of the current day
// ({ schedType, blocks, tasks, wrapup, timeFormat }) and optionally returns a
// { message, tone } for a toast. Optional fields:
//   isAvailable() — hide the exporter (e.g. when unconfigured)
//   auto         — { dailyAt, onWrapupChange } consumed by useAutoExport
// New targets (e.g. Obsidian) plug in here without touching App.jsx.
export const exporters = [
  {
    id: "markdown",
    label: "📋 Copy as Markdown",
    run: async ({ blocks, tasks, wrapup, timeFormat }) => {
      const md = buildMarkdown(blocks, tasks, wrapup, timeFormat);
      await navigator.clipboard.writeText(md);
      return { message: "✅ Copied to clipboard!", tone: "info" };
    },
  },
  notionExporter,
];
