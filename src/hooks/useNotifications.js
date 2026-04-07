import { useState, useEffect, useRef } from "react";
import { fmtTime } from "../utils/time.js";

export const useNotifications = (blocks, tasks, now) => {
  const [notifPerm, setNotifPerm] = useState(() => {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  });
  const notified = useRef(new Set());

  useEffect(() => {
    if (!notifPerm || !blocks.length) return;
    blocks.forEach((b) => {
      if (now >= b.start && now < b.start + 2 && !notified.current.has(b.id)) {
        notified.current.add(b.id);
        const task = tasks[b.id] ? ` — ${tasks[b.id]}` : "";
        new Notification(`⏰ ${b.label}${task}`, {
          body: `${fmtTime(b.start)} – ${fmtTime(b.end)}`,
          requireInteraction: true,
        });
      }
    });
  }, [now, blocks, tasks, notifPerm]);

  const requestNotif = async () => {
    if ("Notification" in window) {
      const p = await Notification.requestPermission();
      setNotifPerm(p === "granted");
    }
  };

  const clearNotified = () => notified.current.clear();

  return { notifPerm, requestNotif, clearNotified };
};
