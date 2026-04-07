import { useState, useEffect } from "react";
import { getNow } from "../utils/time.js";

export const useClock = () => {
  const [now, setNow] = useState(getNow());

  useEffect(() => {
    let id;
    const tick = () => {
      setNow(getNow());
      const msUntilNextMinute = 60000 - (Date.now() % 60000);
      id = setTimeout(tick, msUntilNextMinute);
    };
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    id = setTimeout(tick, msUntilNextMinute);
    return () => clearTimeout(id);
  }, []);

  return now;
};
