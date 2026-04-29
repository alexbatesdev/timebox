import { useState, useEffect, useCallback } from "react";
import {
  isLooseEndsConfigured,
  fetchLooseEnds,
  addLooseEnd,
  completeLooseEnd,
  deleteLooseEnd,
} from "../notion/looseEnds.js";
import { usePinned } from "./usePinned.js";

const STORAGE_KEY = "timebox-loose-ends";

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded */
  }
};

export const useLooseEnds = () => {
  const notionEnabled = isLooseEndsConfigured();
  const [items, setItems] = useState(() => loadFromStorage());
  const [loading, setLoading] = useState(false);
  const { pinnedIds, togglePin } = usePinned("timebox-le-pinned");
  const { pinnedIds: activeIds, togglePin: toggleActive } = usePinned(
    "timebox-le-active",
  );

  const persist = useCallback((next) => {
    setItems(next);
    saveToStorage(typeof next === "function" ? next(loadFromStorage()) : next);
  }, []);

  const reload = useCallback(async () => {
    if (!notionEnabled) return;
    setLoading(true);
    try {
      const data = await fetchLooseEnds();
      setItems(data);
      saveToStorage(data);
    } catch {
      /* keep localStorage version */
    }
    setLoading(false);
  }, [notionEnabled]);

  useEffect(() => {
    if (notionEnabled) reload();
  }, [notionEnabled, reload]);

  const addItem = useCallback(
    async (title) => {
      if (!title.trim()) return;
      const tempId = `local_${Date.now()}`;
      const newItem = { id: tempId, title: title.trim() };
      persist((prev) => [...prev, newItem]);
      if (notionEnabled) {
        try {
          const created = await addLooseEnd(title.trim());
          persist((prev) =>
            prev.map((item) => (item.id === tempId ? created : item)),
          );
        } catch {
          /* keep local version */
        }
      }
    },
    [notionEnabled, persist],
  );

  const completeItem = useCallback(
    async (id) => {
      persist((prev) => prev.filter((item) => item.id !== id));
      if (notionEnabled) {
        try {
          await completeLooseEnd(id);
        } catch {
          reload();
        }
      }
    },
    [notionEnabled, persist, reload],
  );

  const deleteItem = useCallback(
    async (id) => {
      persist((prev) => prev.filter((item) => item.id !== id));
      if (notionEnabled) {
        try {
          await deleteLooseEnd(id);
        } catch {
          reload();
        }
      }
    },
    [notionEnabled, persist, reload],
  );

  const sortedItems = [...items].sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 0 : 1;
    const bp = pinnedIds.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  return { items: sortedItems, pinnedIds, togglePin, activeIds, toggleActive, loading, addItem, completeItem, deleteItem, reload };
};
