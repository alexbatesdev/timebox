import { useState, useEffect } from "react";
import { getNow } from "../utils/time.js";

export const useClock = () => {
  const [now, setNow] = useState(getNow());

  useEffect(() => {
    const t = setInterval(() => setNow(getNow()), 30000);
    return () => clearInterval(t);
  }, []);

  return now;
};
