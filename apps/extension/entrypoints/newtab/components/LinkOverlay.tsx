import { useEffect, useRef } from "react";

const bar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  background: "#1d1b18",
  color: "#eee",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
};

const barButton: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #555",
  color: "#eee",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 13,
  whiteSpace: "nowrap",
};

/** A link from the homepage, read in a panel over the new tab. */
export function LinkOverlay({
  url,
  title,
  onClose,
  onOpenTab,
}: {
  url: string;
  title: string;
  onClose: () => void;
  onOpenTab: () => void;
}) {
  // Pull focus out of the homepage frame so Esc lands here.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  // Esc closes while focus is on the new-tab page (a framed site keeps its own keys).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(1200px, 94vw)",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          background: "white",
        }}
      >
        <div style={bar}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{host}</b>
            {title && <span style={{ color: "#aaa" }}> · {title}</span>}
          </span>
          <span style={{ color: "#888", fontSize: 12, whiteSpace: "nowrap" }}>Blank or logged out?</span>
          <button style={barButton} onClick={onOpenTab} title="Open in a new tab">
            Open in tab ↗
          </button>
          <button ref={closeRef} style={barButton} onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>
        <iframe
          key={url}
          data-reading-overlay
          src={url}
          title={title || host}
          style={{ flex: 1, border: "none", width: "100%" }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
          allowFullScreen
        />
      </div>
    </div>
  );
}
