# Timebox

Personal daily scheduler built with React and Vite.

## Setup

1. Install dependencies: `npm install`
2. Copy the env template: `cp .env.example .env`
3. Fill in `.env` — at minimum you need a Notion token, the main database ID, and a parent page ID. See `.env.example` for what each var does and which are optional.
4. In Notion, share the integration with the database and parent page (Share → Connections → add your integration).
5. Confirm your main database has these properties:
   - A **title** property (default name: `Name`)
   - A **date** property (default name: `date`)
   - If your DB uses different names, set `VITE_NOTION_TITLE_PROP` / `VITE_NOTION_DATE_PROP` in `.env`.
6. (Optional) For the loose ends panel, create a second database with a title property (default `Name`) and a checkbox (default `Done`), then set `VITE_NOTION_LOOSE_ENDS_DB`. Override the property names with `VITE_NOTION_LOOSE_ENDS_TITLE_PROP` / `VITE_NOTION_LOOSE_ENDS_DONE_PROP` if your DB uses different ones.
7. (Optional) Add `VITE_GITHUB_TOKEN` for the notifications panel and `VITE_TEAMWORK_*` for Teamwork integration. To customize how notifications are categorized (the default sections are New Stuff / Updates / Noise), edit [`public/github-notification-rules.json`](/Users/alex.bates/Code/timebox/public/github-notification-rules.json).
8. Run `npm run dev`.

## Schedule Selection

The app chooses the schedule type automatically from [public/schedule-config.json](/Users/alex.bates/Code/timebox/public/schedule-config.json).

Example:

```json
{
  "defaultType": "noStandup",
  "days": {
    "monday": "standup",
    "tuesday": "noStandup",
    "wednesday": "standup",
    "thursday": "noStandup",
    "friday": "standup",
    "saturday": "noStandup",
    "sunday": "noStandup"
  }
}
```

Allowed values are `standup` and `noStandup`. If a day is omitted or invalid, the app falls back to `defaultType`.

### Time Format

Set `timeFormat` in `schedule-config.json` to control how time strings are parsed (in the config and from Notion) and how they are written back to Notion / markdown exports. The in-app UI always displays times as 12-hour with `AM`/`PM`.

| Value              | Config / Notion text       | Notes                                                                                                                  |
| ------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `lazyOpinionated`  | `9:00`, `1:15`, `4:45`     | **Default.** Bare numbers, no AM/PM. Hours 1–8 are interpreted as PM. Only round-trips correctly between 9 AM and 8 PM. |
| `12h`              | `9:00 AM`, `1:15 PM`       | Explicit AM/PM suffix required. Unambiguous.                                                                           |
| `24h`              | `09:00`, `13:15`, `16:45`  | 24-hour, zero-padded. Unambiguous.                                                                                     |

Example:

```json
{
  "timeFormat": "12h",
  "schedules": {
    "standup": {
      "blocks": [
        { "id": "plan", "label": "Plan the day", "start": "9:00 AM", "end": "9:30 AM", "type": "work" }
      ]
    }
  }
}
```

If `timeFormat` is omitted or unknown, it falls back to `lazyOpinionated`. The format applies to both reads (parsing config strings, parsing legacy Notion block titles) and writes (Notion block titles, markdown exports), so changing it requires either rewriting your config strings or letting the app re-emit them on the next Notion send.

### GitHub Panel Sections

The full GitHub panel layout is configurable via [`public/github-panel-sections.json`](/Users/alex.bates/Code/timebox/public/github-panel-sections.json). Each entry is a top-level section in the panel; entries are rendered in the order they appear in the array.

Each entry has a `type` discriminator:

- `"type": "notifications"` — placeholder slot for the Notifications section. No other fields. (Notification internals — categories and noise filter — still live in [`public/github-notification-rules.json`](/Users/alex.bates/Code/timebox/public/github-notification-rules.json).) Only one notifications slot is allowed.
- `"type": "search"` — a search-driven section, fetched via the GitHub Search API (`/search/issues`, which serves both Issues *and* PRs). Same query syntax you'd type into github.com.

Schema:

```json
{
  "sections": [
    { "type": "notifications" },
    {
      "type": "search",
      "id": "review-requests",
      "title": "Awaiting My Review",
      "query": "is:pr is:open draft:false user-review-requested:@me sort:updated-desc",
      "accentColor": "#3b82f6",
      "defaultExpanded": true,
      "ageThresholds": [
        { "minHours": 0, "color": "#6b7280" },
        { "minHours": 16, "color": "#f59e0b" },
        { "minHours": 72, "color": "#dc2626", "titleColor": "#dc2626" }
      ]
    },
    {
      "type": "search",
      "id": "my-issues",
      "title": "My Open Issues",
      "query": "is:issue is:open author:@me sort:updated-desc",
      "accentColor": "#a855f7",
      "ageThresholds": [
        { "minHours": 0, "color": "#6b7280" },
        { "minHours": 72, "color": "#f59e0b" },
        { "minHours": 336, "color": "#dc2626" }
      ]
    }
  ]
}
```

For `"type": "search"` entries:

- `id` — unique per search section. Used as the React key and the bucket key for fetched results.
- `title` — section header text.
- `query` — any valid GitHub Search query for issues or PRs. Examples: `is:issue is:open author:@me`, `is:pr is:closed author:@me sort:created-desc`, `is:pr is:open draft:false user-review-requested:@me`. Each section is fetched independently.
- `accentColor` (optional) — left-border accent color for the section.
- `defaultExpanded` (optional, default `true`) — whether the section starts expanded.
- `ageThresholds` (optional) — array of `{ minHours, color, titleColor? }`. The color of the relative-time text (and optionally the title) escalates as an item ages past each threshold.

**Order in the array = render order.** Reorder entries to put a search section above Notifications, interleave Issues between PR sections, etc.

If the file is missing or invalid (unknown `type`, duplicate `id`, multiple `notifications` slots, etc.), the app falls back to a built-in default that includes Notifications, "Awaiting My Review", and "My Open PRs" in that order.

### "Active" highlight color

`activeColor` (string, hex like `"#22d3ee"`) sets the highlight color used for items marked **active** across Teamwork tasks, Loose Ends, and GitHub items — a separate toggle from pinning, intended for the items you're working on right now. Defaults to `"#22d3ee"` (cyan). Active wins over pinned for both title-text color and (where applicable) disclosure-caret tint when both apply.

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`

## Roadmap: making this shareable

The app currently bakes in a few of the original author's preferences. These are the known blockers for someone else picking it up cleanly:

- [ ] **Default schedules are personal** (`src/data/scheduleConfig.js:5-51`) — block names "Block A/B/C/D", 9–5 workday, lunch 12:45–1:15. Ship a generic template, or add a first-run setup flow.
- [ ] **Block label parsing is fragile** (`src/notion/parsing.js:78-93`) — string-matches "Plan the day", "Standup", "Wrap up", "Lunch", "Break". Rename a block in Notion and parsing silently breaks.
- [ ] **In-app UI is hardcoded 12-hour with AM/PM** (`src/utils/time.js:fmtTime`) — the schedule-config `timeFormat` controls config/Notion/markdown round-tripping, but the header and block list always render as 12h. A user who picks `24h` for their config will still see 12h in the UI.
