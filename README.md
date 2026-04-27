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
6. (Optional) For the loose ends panel, create a second database with a `Name` title and a `Done` checkbox, then set `VITE_NOTION_LOOSE_ENDS_DB`.
7. (Optional) Add `VITE_GITHUB_TOKEN` for the notifications panel and `VITE_TEAMWORK_*` for Teamwork integration.
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

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`

## Roadmap: making this shareable

The app currently bakes in a few of the original author's preferences. These are the known blockers for someone else picking it up cleanly:

- [ ] **Loose ends `Done` property is hardcoded** (`src/notion/looseEnds.js:13`). Move to an env var alongside `VITE_NOTION_TITLE_PROP`.
- [ ] **Inconsistent date-prop fallback** in `src/notion/api.js:69,94,125` — three call sites read `VITE_NOTION_DATE_PROP` with a `"date"` fallback. Centralize so the env var is the single source of truth.
- [ ] **GitHub notification classification is hardcoded** in `src/github/api.js:63-76` (which `reason` values count as "new", "updates", "noise"; CI activity explicitly suppressed). Move to a JSON config like `pr-age-thresholds.json`.
- [ ] **Default schedules are personal** (`src/data/scheduleConfig.js:5-51`) — block names "Block A/B/C/D", 9–5 workday, lunch 12:45–1:15. Ship a generic template, or add a first-run setup flow.
- [ ] **Block label parsing is fragile** (`src/notion/parsing.js:78-93`) — string-matches "Plan the day", "Standup", "Wrap up", "Lunch", "Break". Rename a block in Notion and parsing silently breaks.
- [ ] **Locale assumptions** in `src/utils/time.js` — hardcoded `en-US`, 12-hour format, and `workdayHour()` assumes hours 1–8 mean PM.
