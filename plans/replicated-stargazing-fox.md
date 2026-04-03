# Timebox Improvements Plan

## Context
The timebox app is a single-file React app (`src/App.jsx`, 734 lines) with Vite. It has no persistence, no way to add meetings, a disconnected wrapup UI, and no export capability. We're adding all four features.

## Files to modify
- `src/App.jsx` — all 4 features
- `vite.config.js` — Notion API proxy

## Implementation Order

### 1. Wrapup Unification
- Uncomment the wrapup schedule entries in both `SCHEDULES.standup` (lines 87-93) and `SCHEDULES.noStandup` (lines 152-158)
- Keep the always-visible wrapup section at the bottom
- Add timestamps from the wrapup block to its header: `📝 Wrap-up · 4:45 PM – 5:00 PM`
- Look up the wrapup block in `blocks` to get dynamic timestamps (they may shift)
- The wrapup block also appears in the block list as a normal entry (no task input on it since the textareas below serve that purpose)
- Remove the task input for wrapup blocks in the block list (the `isWork` check on line 649 should exclude wrapup)

### 2. Local Storage Persistence
- Date-scoped key: `timebox-YYYY-MM-DD`
- Store: `{ schedType, blocks, tasks, wrapup }` as a single JSON value
- Initialize `useState` with lazy initializers that read from localStorage
- Single `useEffect` persists state whenever any value changes (skip when `schedType` is null)
- "Change schedule" button clears today's stored data
- `notifPerm` and `notified` ref are NOT persisted (re-derived from browser state)

### 3. Meeting Addition with flex-work Type
- Add `"flex-work"` to `TC` color map (slightly different shade from work to distinguish)
- Change Block D's type from `"work"` to `"flex-work"` in both schedules
- Add `"flex-work"` to all `isWork` checks (lines 486, 649) so it gets task inputs
- **Add Meeting UI**: Button below the current block card that expands an inline form:
  - Text input for meeting label
  - Hour dropdown (8 AM – 5 PM) + minute dropdown (00, 15, 30, 45)
  - Duration dropdown (15, 30, 45, 60, 90 min)
  - Add button
- **Meeting insertion logic** (`addMeeting` function):
  1. Create meeting block with unique ID (`mtg_${Date.now()}`)
  2. Insert into blocks array, sort by start time
  3. Cascade overlap resolution: walk blocks in order; if block `i+1` starts before block `i` ends:
     - If `i+1` is lunch → skip (lunch is pinned)
     - If `i+1` is `flex-work` → shrink from start (absorb overlap, don't maintain duration)
     - Otherwise → push forward maintaining duration
  4. Filter out any blocks where `end <= start` (fully consumed flex)
  5. Re-sort final list
- **Meeting removal**: Small × button on added meeting blocks (blocks with id starting with `mtg_`)
- Edge cases: if flex block fully consumed, warn "No flex time remaining"

### 4. Notion Export
**Vite proxy** (`vite.config.js`):
```js
server: {
  proxy: {
    '/api/notion': {
      target: 'https://api.notion.com/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/notion/, ''),
    }
  }
}
```
Auth headers are added in the fetch call, not the proxy config, using `import.meta.env.VITE_NOTION_TOKEN` and `import.meta.env.VITE_NOTION_PARENT_PAGE`.

**Export UI**: Two buttons at the bottom of the page:
- "Copy as Markdown" — always works, uses `navigator.clipboard.writeText()`
- "Send to Notion" — calls the API, shows success/error inline

**Markdown format**:
```
# Daily Timebox — Thursday, April 3
📢 Standup Day

| Time | Block | Task |
|------|-------|------|
| 9:00 – 9:30 AM | Plan the day | ... |
...

## Wrap-up
**Where I left off:** ...
**What's next:** ...
```

**Notion API call** (`POST /api/notion/pages`):
- Parent: `{ page_id: VITE_NOTION_PARENT_PAGE }`
- Title: "Daily Timebox — Thursday, April 3"
- Children: `heading_2` for "Schedule", `bulleted_list_item` for each block with time + label + task, `divider`, `heading_2` for "Wrap-up", `paragraph` blocks for left/next
- Headers: `Authorization: Bearer ${token}`, `Notion-Version: 2022-06-28`
- Error handling: show user-friendly messages for 401 (bad token), 404 (bad parent page), network errors (proxy not running / production build)

## Verification
1. Run `npm run dev` and verify the app loads
2. Select a schedule → refresh page → verify state persists
3. Add a meeting during Block C time → verify flex block shrinks, Block C pushes forward, lunch stays pinned
4. Add a meeting during flex time → verify flex splits around it
5. Check wrapup section shows dynamic timestamps
6. Click "Copy as Markdown" → paste somewhere → verify format
7. Set `VITE_NOTION_TOKEN` and `VITE_NOTION_PARENT_PAGE` env vars → click "Send to Notion" → verify page created
