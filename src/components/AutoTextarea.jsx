import { useRef, useEffect } from "react";

export default function AutoTextarea({ value, ...props }) {
  const ref = useRef(null);
  const maxHeightRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const natural = el.scrollHeight;
    const target = Math.max(maxHeightRef.current, natural);
    maxHeightRef.current = target;
    el.style.height = `${target}px`;
  }, [value]);

  return <textarea ref={ref} value={value} rows={1} {...props} />;
}
