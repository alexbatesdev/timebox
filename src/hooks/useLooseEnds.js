import { useState, useEffect, useCallback } from "react";
import {
  fetchLooseEnds,
  addLooseEnd,
  completeLooseEnd,
  deleteLooseEnd,
} from "../api.js";

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
  const [items, setItems] = useState(() => loadFromStorage());
  const [loading, setLoading] = useState(false);

  const persist = useCallback((next) => {
    setItems(next);
    saveToStorage(typeof next === "function" ? next(loadFromStorage()) : next);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLooseEnds();
      setItems(data);
      saveToStorage(data);
    } catch {
      /* keep localStorage version */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addItem = useCallback(
    async (title) => {
      if (!title.trim()) return;
      const tempId = `local_${Date.now()}`;
      const newItem = { id: tempId, title: title.trim() };
      persist((prev) => [...prev, newItem]);
      try {
        const created = await addLooseEnd(title.trim());
        persist((prev) =>
          prev.map((item) => (item.id === tempId ? created : item)),
        );
      } catch {
        /* keep local version */
      }
    },
    [persist],
  );

  const completeItem = useCallback(
    async (id) => {
      persist((prev) => prev.filter((item) => item.id !== id));
      try {
        await completeLooseEnd(id);
      } catch {
        reload();
      }
    },
    [persist, reload],
  );

  const deleteItem = useCallback(
    async (id) => {
      persist((prev) => prev.filter((item) => item.id !== id));
      try {
        await deleteLooseEnd(id);
      } catch {
        reload();
      }
    },
    [persist, reload],
  );

  return { items, loading, addItem, completeItem, deleteItem, reload };
};
