import { notionFetch } from "../../notion/api.js";
import { getDateProp } from "../../notion/schema.js";
import { localDateISO } from "../../utils/time.js";
import { buildNotionPayload } from "./payload.js";

// Notion caps the children array at 100 blocks per create/append request.
const MAX_BLOCKS_PER_REQUEST = 100;

const token = () => import.meta.env.VITE_NOTION_TOKEN;
const dbId = () => import.meta.env.VITE_NOTION_DATABASE_ID;

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const ensureOk = async (res, context) => {
  if (res.ok) return res;
  const err = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Invalid Notion token");
  if (res.status === 404) throw new Error("Notion database/page not found");
  throw new Error(err.message || `${context} (${res.status})`);
};

// Find today's daily entry so repeat sends update one page instead of creating
// duplicates. DB-mode only — idempotency comes from the date filter, so no
// app-level page id is needed.
const queryTodayEntry = async () => {
  const res = await notionFetch(`/databases/${dbId()}/query`, token(), {
    method: "POST",
    body: JSON.stringify({
      filter: { property: getDateProp(), date: { equals: localDateISO() } },
      page_size: 1,
    }),
  });
  await ensureOk(res, "Failed to query Notion");
  const data = await res.json();
  return data.results?.[0] || null;
};

const fetchTopLevelChildIds = async (pageId) => {
  const ids = [];
  let cursor = null;
  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : "";
    const res = await notionFetch(`/blocks/${pageId}/children${query}`, token(), {
      method: "GET",
    });
    await ensureOk(res, "Failed to read page content");
    const data = await res.json();
    ids.push(...(data.results || []).map((b) => b.id));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return ids;
};

const appendChildren = async (pageId, children) => {
  for (const batch of chunk(children, MAX_BLOCKS_PER_REQUEST)) {
    const res = await notionFetch(`/blocks/${pageId}/children`, token(), {
      method: "PATCH",
      body: JSON.stringify({ children: batch }),
    });
    await ensureOk(res, "Failed to write page content");
  }
};

const updatePage = async (pageId, properties, children) => {
  const res = await notionFetch(`/pages/${pageId}`, token(), {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
  await ensureOk(res, "Failed to update page");

  // Clear existing content, then re-append. The state block is children[0], so
  // it lands in the first append batch and is present even if a later batch fails.
  const existingIds = await fetchTopLevelChildIds(pageId);
  for (const id of existingIds) {
    const del = await notionFetch(`/blocks/${id}`, token(), { method: "DELETE" });
    await ensureOk(del, "Failed to clear page content");
  }
  await appendChildren(pageId, children);
};

const createPage = async (properties, children) => {
  const [first = [], ...rest] = chunk(children, MAX_BLOCKS_PER_REQUEST);
  const res = await notionFetch("/pages", token(), {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: dbId() },
      properties,
      children: first,
    }),
  });
  await ensureOk(res, "Failed to create page");
  const created = await res.json();
  for (const batch of rest) await appendChildren(created.id, batch);
};

export const notionExporter = {
  id: "notion",
  label: "📤 Send to Notion",
  isAvailable: () => !!(token() && dbId()),
  // Consumed by useAutoExport: 5 PM (1020 min) daily send + wrap-up edit sync.
  auto: { dailyAt: 1020, onWrapupChange: true },
  run: async (snapshot) => {
    if (!token() || !dbId()) {
      throw new Error("Set VITE_NOTION_TOKEN and VITE_NOTION_DATABASE_ID");
    }
    const { properties, children } = buildNotionPayload(snapshot);
    const existing = await queryTodayEntry();
    if (existing) {
      await updatePage(existing.id, properties, children);
    } else {
      await createPage(properties, children);
    }
    return { message: "✅ Sent to Notion!", tone: "info" };
  },
};
