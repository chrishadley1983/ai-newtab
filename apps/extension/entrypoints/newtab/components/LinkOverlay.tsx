import { useEffect, useRef, useState } from "react";
import { loadArticle, type ReaderArticle } from "@/lib/reader";

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

/** Reader typography, scoped to the panel body. */
const READER_CSS = `
.hb-reader { max-width: 680px; margin: 0 auto; padding: 32px 24px 80px; color: #222;
  font: 19px/1.6 Georgia, "Times New Roman", serif; }
.hb-reader h1 { font-size: 32px; line-height: 1.2; margin: 0 0 12px; }
.hb-reader .hb-meta { font: 14px/1.4 system-ui, sans-serif; color: #777; margin-bottom: 28px; }
.hb-reader h2, .hb-reader h3, .hb-reader h4 { line-height: 1.3; margin: 1.6em 0 0.5em; }
.hb-reader img { max-width: 100%; height: auto; display: block; margin: 1em auto; border-radius: 4px; }
.hb-reader figure { margin: 1.4em 0; }
.hb-reader figcaption { font: 14px/1.4 system-ui, sans-serif; color: #777; margin-top: 6px; }
.hb-reader a { color: #1a5fb4; }
.hb-reader blockquote { border-left: 3px solid #ccc; margin: 1.2em 0; padding-left: 16px; color: #555; }
.hb-reader pre { overflow-x: auto; background: #f4f4f4; padding: 12px; font-size: 14px; }
.hb-reader table { border-collapse: collapse; font-size: 15px; }
.hb-reader td, .hb-reader th { border: 1px solid #ddd; padding: 4px 8px; }
@media (max-width: 600px) { .hb-reader { font-size: 17px; padding: 20px 16px 60px; } .hb-reader h1 { font-size: 26px; } }
`;

/**
 * A homepage link read in a panel over the new tab, as a reader view.
 * Pages that aren't articles (or won't fetch) call onFallback, which opens a tab.
 */
export function LinkOverlay({
  url,
  title,
  onClose,
  onOpenTab,
  onFallback,
}: {
  url: string;
  title: string;
  onClose: () => void;
  onOpenTab: () => void;
  onFallback: () => void;
}) {
  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const ctrl = new AbortController();
    setArticle(null);
    loadArticle(url, ctrl.signal)
      .then((a) => (a ? setArticle(a) : onFallback()))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.warn("[overlay] reader view failed, opening a tab", err);
        onFallback();
      });
    return () => ctrl.abort();
    // onFallback is recreated each render; the url is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  // Links inside the article open as background tabs, keeping the panel open.
  const onBodyClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a?.href || !/^https?:/i.test(a.href)) return;
    e.preventDefault();
    void browser.tabs.create({ url: a.href, active: false });
  };

  const meta = article
    ? [article.byline, article.siteName ?? host, article.publishedTime?.slice(0, 10), `${article.minutes} min read`]
        .filter(Boolean)
        .join(" · ")
    : "";

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
      <style>{READER_CSS}</style>
      <div
        style={{
          width: "min(900px, 94vw)",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          background: "#fdfcf9",
        }}
      >
        <div style={bar}>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b>{host}</b>
            {title && <span style={{ color: "#aaa" }}> · {title}</span>}
          </span>
          <button style={barButton} onClick={onOpenTab} title="Open the original page in a new tab">
            Open original ↗
          </button>
          <button ref={closeRef} style={barButton} onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>
        <div data-reading-overlay style={{ flex: 1, overflowY: "auto" }} onClick={onBodyClick}>
          {article ? (
            <article className="hb-reader">
              <h1>{article.title || title}</h1>
              <div className="hb-meta">{meta}</div>
              {/* Sanitised by cleanArticleHtml: no scripts, styles or handlers. */}
              <div dangerouslySetInnerHTML={{ __html: article.html }} />
            </article>
          ) : (
            <div
              style={{ padding: 48, textAlign: "center", color: "#888", fontFamily: "system-ui, sans-serif" }}
            >
              Fetching article…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
