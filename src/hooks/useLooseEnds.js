import { useState, useEffect, useCallback } from "react";
import {
  isLooseEndsConfigured,
  fetchLooseEnds,
  addLooseEnd,
  completeLooseEnd,
  deleteLooseEnd,
} from "../notion/looseEnds.js";

export const useLooseEnds = () => {
  const configured = isLooseEndsConfigured();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    try {
      const data = await fetchLooseEnds();
      setItems(data);
    } catch {
      /* silent — panel will just show empty */
    }
    setLoading(false);
  }, [configured]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addItem = useCallback(
    async (title) => {
      if (!configured || !title.trim()) return;
      const tempId = `temp_${Date.now()}`;
      setItems((prev) => [...prev, { id: tempId, title: title.trim() }]);
      try {
        const created = await addLooseEnd(title.trim());
        setItems((prev) =>
          prev.map((item) => (item.id === tempId ? created : item)),
        );
      } catch {
        setItems((prev) => prev.filter((item) => item.id !== tempId));
      }
    },
    [configured],
  );

  const completeItem = useCallback(
    async (id) => {
      if (!configured) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        await completeLooseEnd(id);
      } catch {
        reload();
      }
    },
    [configured, reload],
  );

  const deleteItem = useCallback(
    async (id) => {
      if (!configured) return;
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        await deleteLooseEnd(id);
      } catch {
        reload();
      }
    },
    [configured, reload],
  );

  return { configured, items, loading, addItem, completeItem, deleteItem, reload };
};
