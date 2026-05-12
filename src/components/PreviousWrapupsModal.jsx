import { useEffect, useState } from "react";

const formatDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export default function PreviousWrapupsModal({ show, onClose, loadWrapups }) {
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    setEntries([]);
    setCursor(null);
    setHasMore(false);
    setError(null);
    setHasFetched(false);
    setLoading(true);
    loadWrapups({ cursor: null })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setCursor(result.nextCursor);
        setHasMore(Boolean(result.nextCursor));
        setHasFetched(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load wrap-ups");
        setHasFetched(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [show, loadWrapups]);

  const loadMore = async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadWrapups({ cursor });
      setEntries((prev) => [...prev, ...result.entries]);
      setCursor(result.nextCursor);
      setHasMore(Boolean(result.nextCursor));
    } catch (err) {
      setError(err.message || "Failed to load more");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000aa",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "8vh",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #f9731640",
          borderRadius: "12px",
          padding: "20px",
          width: "560px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: "#f97316",
            }}
          >
            📚 Previous Wrap-ups
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            paddingRight: "4px",
          }}
        >
          {entries.map((entry, idx) => (
            <div
              key={`${entry.dateISO || "entry"}-${idx}`}
              style={{
                background: "#ffffff08",
                border: "1px solid #ffffff12",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "10px",
                fontSize: "12px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  fontWeight: "600",
                  marginBottom: "10px",
                }}
              >
                {entry.dateISO ? formatDate(entry.dateISO) : "Unknown date"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "20px",
                }}
              >
                {entry.wrapup.left && (
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                    >
                      Where I left off
                    </div>
                    <div
                      style={{
                        color: "#d1d5db",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                      }}
                    >
                      {entry.wrapup.left}
                    </div>
                  </div>
                )}
                {entry.wrapup.next && (
                  <div
                    style={{
                      flex: 1,
                      paddingLeft: entry.wrapup.left ? "20px" : 0,
                      borderLeft: entry.wrapup.left
                        ? "1px solid #ffffff12"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                    >
                      What's next
                    </div>
                    <div
                      style={{
                        color: "#d1d5db",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.45,
                      }}
                    >
                      {entry.wrapup.next}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {hasFetched && !loading && entries.length === 0 && !error && (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                fontSize: "13px",
                padding: "24px 0",
              }}
            >
              No previous wrap-ups found.
            </div>
          )}

          {error && (
            <div
              style={{
                color: "#fca5a5",
                fontSize: "12px",
                padding: "10px 12px",
                background: "#ef444410",
                border: "1px solid #ef444440",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div
              style={{
                textAlign: "center",
                color: "#6b7280",
                fontSize: "12px",
                padding: "12px 0",
              }}
            >
              Loading…
            </div>
          )}
        </div>

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              marginTop: "12px",
              padding: "8px",
              background: "#ffffff0a",
              border: "1px solid #f9731640",
              color: "#fdba74",
              borderRadius: "6px",
              cursor: loading ? "default" : "pointer",
              fontSize: "12px",
              fontWeight: "600",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
