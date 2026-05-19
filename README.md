# Timebox

Personal daily scheduler built with React and Vite. The main view is a configurable timeboxed daily schedule synced to a Notion database. Optional side panels integrate with GitHub (notifications + saved searches), Teamwork (your assigned tasks), a Notion "loose ends" database, and a Favorites panel that surfaces pinned items across the other panels.

## Prerequisites

- **Node.js ≥ 20.19** (or ≥ 22.12). Vite 8 will refuse to start on older versions.
- **npm** (ships with Node).
- A **Notion** account with at least one database — required to run the app.

## Setup

1. Install dependencies: `npm install`
2. Copy the env template: `cp .env.example .env`
3. Fill in `.env` — at minimum you need a Notion token, the main database ID, and a parent page ID. See `.env.example` for what each var does and which are optional. The full list of supported env vars is summarized in [Environment variables](#environment-variables) below.
4. In Notion, share the integration with the database and parent page (Share → Connections → add your integration).
5. Confirm your main database has these properties:
   - A **title** property (default name: `Name`)
   - A **date** property (default name: `date`)
   - If your DB uses different names, set `VITE_NOTION_TITLE_PROP` / `VITE_NOTION_DATE_PROP` in `.env`.
6. (Optional) For the loose ends panel, create a second database with a title property (default `Name`) and a checkbox (default `Done`), then set `VITE_NOTION_LOOSE_ENDS_DB`. Override the property names with `VITE_NOTION_LOOSE_ENDS_TITLE_PROP` / `VITE_NOTION_LOOSE_ENDS_DONE_PROP` if your DB uses different ones. See [Loose Ends panel](#loose-ends-panel).
7. (Optional) Add `VITE_GITHUB_TOKEN` for the notifications panel and `VITE_TEAMWORK_*` for the Teamwork panel. See [GitHub panel](#github-panel-sections) and [Teamwork panel](#teamwork-panel) for setup details.
8. (Optional) Tweak [`public/schedule-config.json`](/Users/alex.bates/Code/timebox/public/schedule-config.json) to match your own workday — block names, hours, weekday-to-schedule mapping, time format, and active highlight color. See [Schedule Selection](#schedule-selection).
9. Run `npm run dev`.

## Environment variables

Everything Vite reads at runtime is listed and documented in [`.env.example`](/Users/alex.bates/Code/timebox/.env.example). Quick reference:

| Variable                              | Required? | Purpose                                                                                  |
| ------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `VITE_NOTION_TOKEN`                   | Yes       | Notion internal integration token.                                                       |
| `VITE_NOTION_DATABASE_ID`             | Yes       | ID of the main timebox database.                                                         |
| `VITE_NOTION_PARENT_PAGE`             | Yes       | Page under which new daily entries are created.                                          |
| `VITE_NOTION_TITLE_PROP`              | No        | Override title property name on main DB (default `Name`).                                |
| `VITE_NOTION_DATE_PROP`               | No        | Override date property name on main DB (default `date`).                                 |
| `VITE_NOTION_LOOSE_ENDS_DB`           | No        | Enables the Loose Ends panel; ID of a second Notion DB.                                  |
| `VITE_NOTION_LOOSE_ENDS_TITLE_PROP`   | No        | Override title property on the loose-ends DB (default `Name`).                           |
| `VITE_NOTION_LOOSE_ENDS_DONE_PROP`    | No        | Override checkbox property on the loose-ends DB (default `Done`).                        |
| `VITE_NOTION_CUSTOM_EMOJI_ID`         | No        | Custom emoji ID for work-callout icons in Notion blocks. Falls back to 💻 when unset.    |
| `VITE_GITHUB_TOKEN`                   | No        | GitHub access token. **Classic PAT** required if you want the notifications section (the `/notifications` API doesn't support fine-grained tokens). Fine-grained tokens work for the PR/issue search sections only. See [GitHub token setup](#github-token-setup). |
| `VITE_TEAMWORK_SITE`                  | No        | Teamwork subdomain (e.g. `acme` for `acme.teamwork.com`). Required to enable Teamwork.   |
| `VITE_TEAMWORK_API_KEY`               | No        | Teamwork API key (Profile → API & Mobile → API Tokens). Required with `VITE_TEAMWORK_SITE`. |

## Schedule Selection

The full schedule layout — which schedule plays on which weekday, the blocks each schedule contains, time-format parsing, and the active-highlight color — lives in [public/schedule-config.json](/Users/alex.bates/Code/timebox/public/schedule-config.json). Top-level keys:

| Key            | Type    | Purpose                                                                                                                |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `defaultType`  | string  | Schedule key used if `days` is missing or invalid for today.                                                            |
| `days`         | object  | Map of `monday`…`sunday` → schedule key.                                                                                |
| `schedules`    | object  | Map of schedule key → schedule definition (see below).                                                                  |
| `timeFormat`   | string  | How time strings in this file (and Notion) are parsed/written. See [Time Format](#time-format). Default `lazyOpinionated`. |
| `activeColor`  | string  | Hex color used for the "active item" highlight across panels. Default `#22d3ee`.                                        |

`defaultType` and `days` values must be keys present in `schedules`. If a day is omitted or invalid, the app falls back to `defaultType`. Out of the box the file defines two schedules — `standup` and `noStandup` — but you can rename them, add more, or replace them entirely.

```json
{
  "defaultType": "noStandup",
  "activeColor": "#22d3ee",
  "days": {
    "monday": "standup",
    "tuesday": "noStandup",
    "wednesday": "standup",
    "thursday": "noStandup",
    "friday": "standup",
    "saturday": "noStandup",
    "sunday": "noStandup"
  },
  "schedules": { "...": "see below" }
}
```

### Schedule definitions

Each entry under `schedules` is a named schedule:

```json
"standup": {
  "label": "M-day",
  "emoji": "🟣",
  "blocks": [
    { "id": "plan",  "label": "Plan the day", "start": "9:00",  "end": "9:30",  "type": "work" },
    { "id": "sdup",  "label": "Standup",      "start": "9:30",  "end": "10:00", "type": "meeting" },
    { "id": "A",     "label": "Block A",      "start": "10:00", "end": "11:00", "type": "work" },
    { "id": "lunch", "label": "Lunch",        "start": "12:45", "end": "1:15",  "type": "break" },
    { "id": "D",     "label": "Block D — Flex", "start": "3:00", "end": "4:45", "type": "flex-work" },
    { "id": "wrap",  "label": "Wrap up",      "start": "4:45",  "end": "5:00",  "type": "wrapup" }
  ]
}
```

Block fields:

- `id` — unique string within the schedule. Stable across edits; the app uses it to track which block a task belongs to.
- `label` — header text shown in the UI and written into Notion.
- `start` / `end` — time strings parsed using `timeFormat` (see below).
- `type` — one of `work`, `flex-work`, `break`, `meeting`, `wrapup`. Unknown values fall back to `work`. The type drives icon/styling and (for `wrapup`) special end-of-day behavior.

`label` and `emoji` on the schedule itself are displayed in the header.

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

### GitHub token setup

The GitHub panel needs an access token in `VITE_GITHUB_TOKEN`. Token-type choice is constrained by a frustrating GitHub limitation:

> The `/notifications` REST endpoint **only supports classic personal access tokens**. Fine-grained PATs have no permission that grants access to notifications.

That means if you want the **notifications** section to work, you need a classic PAT — and every org whose notifications you want must allow classic PATs (and have you SSO-authorize the token, if it uses SAML).

**Classic PAT (required for notifications):**
1. https://github.com/settings/tokens → **Generate new token (classic)**.
2. Scopes: `notifications` and `repo`.
3. Generate, copy (starts with `ghp_`), paste into `.env` as `VITE_GITHUB_TOKEN`.
4. If any of your orgs use SAML SSO, on the token list page click **Configure SSO** next to your token and authorize each org.
5. If an org has *disabled* classic PATs entirely (you'll see `"<org> forbids access via a personal access token (classic)..."` from any repo call), you can't fix this token-side — an org admin would have to re-enable classic PATs, or you'd have to skip the notifications panel for that org's content.

**Fine-grained PAT (PR/issue search only — notifications won't work):**

If the notifications panel isn't important to you and you only want the PR/issue search sections to work, a fine-grained PAT is fine:
1. https://github.com/settings/personal-access-tokens → **Generate new token**.
2. **Resource owner**: your account *and* every org whose repos you want.
3. **Repository access**: "All repositories" (simplest).
4. **Repository permissions**: Contents, Issues, Pull requests, Metadata — all Read-only.
5. The notifications section will stay empty (the API returns `[]`); the PR search sections will work normally.

**Sanity check** — replace `$TOKEN`:

```bash
# Token & scopes
curl -sI -H "Authorization: Bearer $TOKEN" https://api.github.com/user | grep -i '^x-oauth-scopes'

# Notifications (classic PAT only)
curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/notifications?all=true&per_page=1" | head -20

# Org repo visibility — if this returns "forbids access via a personal access token (classic)", the org has disabled classic PATs
curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/<org>/<repo>" | grep '"message"'
```

### GitHub Panel Sections

The full GitHub panel layout is configurable via [`public/github-panel-sections.json`](/Users/alex.bates/Code/timebox/public/github-panel-sections.json). Each entry is a top-level section in the panel; entries are rendered in the order they appear in the array.

Each entry has a `type` discriminator:

- `"type": "notifications"` — the Notifications section. Optional `settings` object configures the notification categories (schema below). Only one notifications slot is allowed anywhere in the tree.
- `"type": "search"` — a search-driven section, fetched via the GitHub Search API (`/search/issues`, which serves both Issues *and* PRs). Same query syntax you'd type into github.com.
- `"type": "group"` — a collapsible wrapper containing other sections. Has its own `id`, `title`, optional `defaultExpanded`, and a recursive `sections` array. Sections inside a group render with smaller, nested-style headers. Groups can contain other groups.

Schema (default config — Notifications at top, two PR search sections grouped under "PRs"):

```json
{
  "sections": [
    {
      "type": "notifications",
      "settings": {
        "categories": [
          { "id": "newStuff", "label": "New Stuff", "reasons": ["review_requested", "assign"], "frequent": true, "defaultExpanded": true },
          { "id": "updates",  "label": "Updates",   "reasons": ["mention", "team_mention", "comment", "author", "state_change"], "frequent": true, "defaultExpanded": true },
          { "id": "noise",    "label": "Noise",     "fallback": true, "frequent": false, "defaultExpanded": false }
        ]
      }
    },
    {
      "type": "group",
      "id": "prs",
      "title": "PRs",
      "defaultExpanded": true,
      "sections": [
        {
          "type": "search",
          "id": "review-requests",
          "title": "Awaiting My Review",
          "query": "is:pr is:open draft:false user-review-requested:@me sort:updated-desc",
          "accentColor": "#3b82f6",
          "ageThresholds": [
            { "minHours": 0, "color": "#6b7280" },
            { "minHours": 16, "color": "#f59e0b" },
            { "minHours": 72, "color": "#dc2626", "titleColor": "#dc2626" }
          ]
        },
        {
          "type": "search",
          "id": "my-prs",
          "title": "My Open PRs",
          "query": "is:pr is:open author:@me sort:updated-desc",
          "accentColor": "#22c55e",
          "ageThresholds": [
            { "minHours": 0, "color": "#6b7280" },
            { "minHours": 16, "color": "#f59e0b" },
            { "minHours": 168, "color": "#dc2626", "titleColor": "#dc2626" }
          ]
        }
      ]
    }
  ]
}
```

You can mix freely — put a search section at the top level next to Notifications, group multiple Issues queries under an "Issues" header, etc. Example with an Issues group:

```json
{
  "sections": [
    { "type": "notifications" },
    {
      "type": "group",
      "id": "issues",
      "title": "Issues",
      "sections": [
        {
          "type": "search",
          "id": "my-issues",
          "title": "My Open Issues",
          "query": "is:issue is:open author:@me sort:updated-desc",
          "accentColor": "#a855f7"
        }
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

For the `"type": "notifications"` entry's optional `settings` object:

- `categories` — array defining how unread/read notifications are bucketed for display. Each category has `id` (unique string), `label` (header text), and either `reasons` (array of GitHub notification reason strings — `mention`, `review_requested`, `assign`, `team_mention`, `comment`, `author`, `state_change`, `subscribed`, `ci_activity`, etc.) or `fallback: true` (catch-all for anything not matched by an earlier category). Optional `frequent` (default `true` for non-fallback, `false` for fallback) controls whether the category's reasons are pulled by the polled participating-only fetch (`true`) or by the heavier, paginated on-open fetch that includes non-participating notifications like `subscribed` (`false`). Optional `defaultExpanded` (default `true`). Exactly one category must be `fallback: true`.
- If `settings` is omitted, defaults are used (New Stuff / Updates / Noise).

For `"type": "group"` entries:

- `id` — unique per group (across all groups, regardless of nesting depth).
- `title` — header text for the collapsible wrapper.
- `defaultExpanded` (optional, default `true`) — whether the group starts expanded.
- `sections` — array of child sections (search, group, or notifications). Children render with smaller, nested-style headers.

**Order in the array = render order.** Reorder entries to put a search section above Notifications, interleave Issues between PR groups, move things in or out of groups, etc.

If the file is missing or invalid (unknown `type`, duplicate `id`, multiple `notifications` slots, malformed thresholds, etc.), the app falls back to a built-in default with Notifications first and a "PRs" group containing "Awaiting My Review" and "My Open PRs".

## Teamwork panel

Enabled by setting both `VITE_TEAMWORK_SITE` and `VITE_TEAMWORK_API_KEY` in `.env`.

- `VITE_TEAMWORK_SITE` is the subdomain only (e.g. `acme` for `https://acme.teamwork.com`).
- `VITE_TEAMWORK_API_KEY` is generated from your Teamwork profile: avatar → **Edit My Details** → **API & Mobile** → **Create API Token**. Use a personal token, not an OAuth client.

The panel lists your incomplete assigned tasks grouped by project, with workflow-stage badges, expandable subtasks, and inline descriptions. Tasks can be pinned (appear in Favorites) or marked active (highlighted using `activeColor`). Stage moves are supported via the stage badge dropdown.

Requests are proxied through Vite at `/api/teamwork` (see `vite.config.js`), which injects the basic-auth header for you so the token is never sent from the browser.

## Loose Ends panel

Enabled by setting `VITE_NOTION_LOOSE_ENDS_DB` to the ID of a second Notion database with:

- a **title** property (default `Name`, override with `VITE_NOTION_LOOSE_ENDS_TITLE_PROP`)
- a **checkbox** property (default `Done`, override with `VITE_NOTION_LOOSE_ENDS_DONE_PROP`)

Make sure the integration is shared with this database too (Share → Connections). The panel surfaces open loose-end entries, lets you add new ones inline, mark them done (toggles the checkbox in Notion), pin them, or mark them active.

## Favorites panel

Always available. Aggregates everything you've pinned across the Teamwork, Loose Ends, and GitHub panels — including pinned GitHub search results — in one stack. No configuration required; pin items in their source panels and they show up here.

## "Active" highlight color

`activeColor` lives in [`public/schedule-config.json`](/Users/alex.bates/Code/timebox/public/schedule-config.json) (string, hex like `"#22d3ee"`). It sets the highlight color used for items marked **active** across Teamwork tasks, Loose Ends, and GitHub items — a separate toggle from pinning, intended for the items you're working on right now. Defaults to `"#22d3ee"` (cyan). Active wins over pinned for both title-text color and (where applicable) disclosure-caret tint when both apply.

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`

## Roadmap: making this shareable

The app currently bakes in a few of the original author's preferences. These are the known blockers for someone else picking it up cleanly:

- [ ] **Default schedules are personal** (`src/data/scheduleConfig.js:5-51`) — block names "Block A/B/C/D", 9–5 workday, lunch 12:45–1:15. Ship a generic template, or add a first-run setup flow.
- [ ] **Block label parsing is fragile** (`src/notion/parsing.js:78-93`) — string-matches "Plan the day", "Standup", "Wrap up", "Lunch", "Break". Rename a block in Notion and parsing silently breaks.
- [ ] **In-app UI is hardcoded 12-hour with AM/PM** (`src/utils/time.js:fmtTime`) — the schedule-config `timeFormat` controls config/Notion/markdown round-tripping, but the header and block list always render as 12h. A user who picks `24h` for their config will still see 12h in the UI.
