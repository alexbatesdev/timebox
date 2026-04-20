import { useState, useCallback } from "react";

const load = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const save = (key, map) => {
  localStorage.setItem(key, JSON.stringify(map));
};

export const useNotes = (storageKey) => {
  const [notes, setNotes] = useState(() => load(storageKey));

  const setNote = useCallback(
    (id, text) => {
      setNotes((prev) => {
        const next = { ...prev };
        if (text) next[id] = text;
        else delete next[id];
        save(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const getNote = useCallback((id) => notes[id] || "", [notes]);

  return { notes, setNote, getNote };
};
