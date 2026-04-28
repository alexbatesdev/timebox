import { NOTION_VERSION } from "./richText.js";
import { extractSnapshotFromBlocks } from "./parsing.js";
import { getDateProp } from "./schema.js";

const notionHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "Notion-Version": NOTION_VERSION,
});

export const notionFetch = async (path, token, options = {}) =>
  fetch(`/api/notion${path}`, {
    ...options,
    headers: {
      ...notionHeaders(token),
      ...(options.headers || {}),
    },
  });

const fetchAllBlockChildren = async (blockId, token) => {
  const results = [];
  let cursor = null;

  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}` : "";
    const res = await notionFetch(
      `/blocks/${blockId}/children${query}`,
      token,
      {
        method: "GET",
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || `Failed to fetch block children (${res.status})`,
      );
    }
    const data = await res.json();
    results.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  return results;
};

const fetchBlockChildrenRecursive = async (notionBlocks, token) =>
  Promise.all(
    notionBlocks.map(async (block) => {
      if (!block.has_children) return block;
      const children = await fetchAllBlockChildren(block.id, token);
      return {
        ...block,
        children: await fetchBlockChildrenRecursive(children, token),
      };
    }),
  );

const loadSnapshotFromPage = async (page, token) => {
  const children = await fetchAllBlockChildren(page.id, token);
  const fullChildren = await fetchBlockChildrenRecursive(children, token);
  const { snapshot, warnings } = extractSnapshotFromBlocks(fullChildren);
  return { pageId: page.id, snapshot, warnings };
};

const queryTodayNotionEntry = async (token) => {
  const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
  if (!token || !dbId) return null;

  const dateProp = getDateProp();
  const todayISO = new Date().toISOString().slice(0, 10);
  const res = await notionFetch(`/databases/${dbId}/query`, token, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: dateProp,
        date: { equals: todayISO },
      },
      page_size: 1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to query Notion (${res.status})`);
  }

  const data = await res.json();
  return data.results?.[0] || null;
};

const queryPreviousNotionEntry = async (token) => {
  const dbId = import.meta.env.VITE_NOTION_DATABASE_ID;
  if (!token || !dbId) return null;

  const dateProp = getDateProp();
  const todayISO = new Date().toISOString().slice(0, 10);
  const res = await notionFetch(`/databases/${dbId}/query`, token, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: dateProp,
        date: { before: todayISO },
      },
      sorts: [{ property: dateProp, direction: "descending" }],
      page_size: 1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to query Notion (${res.status})`);
  }

  const data = await res.json();
  return data.results?.[0] || null;
};

export const loadTodayFromNotion = async (token) => {
  const page = await queryTodayNotionEntry(token);
  if (!page) return null;
  return loadSnapshotFromPage(page, token);
};

export const loadPreviousWrapupFromNotion = async (token) => {
  const page = await queryPreviousNotionEntry(token);
  if (!page) return null;
  const dateProp = getDateProp();
  const dateISO = page.properties?.[dateProp]?.date?.start || null;
  const { snapshot } = await loadSnapshotFromPage(page, token);
  const wrapup = snapshot?.wrapup;
  if (!wrapup || (!wrapup.left && !wrapup.next)) return null;
  return { wrapup, dateISO };
};

export const replaceNotionPageContent = async (pageId, token, children) => {
  const existingChildren = await fetchAllBlockChildren(pageId, token);
  for (const child of existingChildren) {
    const res = await notionFetch(`/blocks/${child.id}`, token, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.message || `Failed to clear page content (${res.status})`,
      );
    }
  }

  const res = await notionFetch(`/blocks/${pageId}/children`, token, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Failed to append page content (${res.status})`,
    );
  }
};
