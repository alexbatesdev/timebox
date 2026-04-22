import { useEffect } from "react";

const TONE_STYLES = {
  warn: {
    background: "#422006",
    border: "1px solid #b45309",
    color: "#fde68a",
  },
  info: {
    background: "#0b1f3a",
    border: "1px solid #1e40af",
    color: "#bfdbfe",
  },
};

export default function Toast({ message, tone = "info", onDismiss, duration = 6000 }) {
  useEffect(() => {
    if (!duration) return undefined;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [message, tone, duration, onDismiss]);

  const palette = TONE_STYLES[tone] || TONE_STYLES.info;

  return (
    <div
      onClick={onDismiss}
      role="alert"
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        maxWidth: "420px",
        padding: "10px 14px",
        borderRadius: "8px",
        fontSize: "12px",
        lineHeight: 1.45,
        textAlign: "left",
        cursor: "pointer",
        zIndex: 1000,
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
        ...palette,
      }}
    >
      {message}
    </div>
  );
}
