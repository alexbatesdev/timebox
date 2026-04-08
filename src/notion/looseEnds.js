import { notionFetch } from "./api.js";

const dbId = () => import.meta.env.VITE_NOTION_LOOSE_ENDS_DB;
const token = () => import.meta.env.VITE_NOTION_TOKEN;

export const isLooseEndsConfigured = () => Boolean(dbId() && token());

export const fetchLooseEnds = async () => {
  const res = await notionFetch(`/databases/${dbId()}/query`, token(), {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: "Done",
        checkbox: { equals: false },
      },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
    }),
  });
  if (!res.ok) throw new Error(`Failed to fetch loose ends (${res.status})`);
  const data = await res.json();
  return (data.results || []).map((page) => ({
    id: page.id,
    title:
      page.properties?.Name?.title?.[0]?.plain_text ||
      page.properties?.Name?.title?.[0]?.text?.content ||
      "",
  }));
};

export const addLooseEnd = async (title) => {
  const res = await notionFetch("/pages", token(), {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: dbId() },
      properties: {
        Name: { title: [{ type: "text", text: { content: title } }] },
        Done: { checkbox: false },
      },
    }),
  });
  if (!res.ok) throw new Error(`Failed to add loose end (${res.status})`);
  const page = await res.json();
  return { id: page.id, title };
};

export const completeLooseEnd = async (pageId) => {
  const res = await notionFetch(`/pages/${pageId}`, token(), {
    method: "PATCH",
    body: JSON.stringify({
      properties: { Done: { checkbox: true } },
    }),
  });
  if (!res.ok) throw new Error(`Failed to complete loose end (${res.status})`);
};

export const deleteLooseEnd = async (pageId) => {
  const res = await notionFetch(`/pages/${pageId}`, token(), {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
  if (!res.ok) throw new Error(`Failed to delete loose end (${res.status})`);
};
