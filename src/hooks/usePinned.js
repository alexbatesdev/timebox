import { useState, useCallback } from "react";

const load = (key) => {
  const raw = localStorage.getItem(key);
  return raw ? new Set(JSON.parse(raw).map(String)) : new Set();
};

const save = (key, set) => {
  localStorage.setItem(key, JSON.stringify([...set]));
};

export const usePinned = (storageKey) => {
  const [pinnedIds, setPinnedIds] = useState(() => load(storageKey));

  const togglePin = useCallback(
    (id) => {
      const key = String(id);
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        save(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return { pinnedIds, togglePin };
};
