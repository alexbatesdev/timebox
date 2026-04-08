const apiFetch = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
};

export const loadConfig = () => apiFetch("/config");

export const loadToday = () => apiFetch("/schedule/today");

export const saveSchedule = (pageId, snapshot) =>
  apiFetch("/schedule/save", {
    method: "POST",
    body: JSON.stringify({ pageId, snapshot }),
  });

export const fetchLooseEnds = () => apiFetch("/loose-ends");

export const addLooseEnd = (title) =>
  apiFetch("/loose-ends", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

export const completeLooseEnd = (id) =>
  apiFetch(`/loose-ends/${id}/complete`, { method: "POST" });

export const deleteLooseEnd = (id) =>
  apiFetch(`/loose-ends/${id}`, { method: "DELETE" });
