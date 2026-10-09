import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";

/** An article extracted for the reading overlay. */
export interface ReaderArticle {
  title: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
  /** Sanitised HTML: no scripts, styles or event handlers; links open in new tabs. */
  html: string;
  minutes: number;
}

/** Below this much text the page is a stub, index or paywall teaser: open it as a tab. */
const MIN_TEXT_CHARS = 600;

/**
 * Fetch `url` and extract the article, or null when the page isn't one.
 * Host permissions let the extension page fetch any site without CORS.
 */
export async function loadArticle(url: string, signal?: AbortSignal): Promise<ReaderArticle | null> {
  const res = await fetch(url, { credentials: "include", redirect: "follow", signal });
  if (!res.ok) return null;
  if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  // Readability resolves relative links and images against the document base.
  const base = doc.createElement("base");
  base.href = res.url || url;
  doc.head.prepend(base);

  const parsed = new Readability(doc).parse();
  const text = parsed?.textContent?.trim() ?? "";
  if (!parsed?.content || text.length < MIN_TEXT_CHARS) return null;

  return {
    title: parsed.title || "",
    byline: parsed.byline || null,
    siteName: parsed.siteName || null,
    publishedTime: parsed.publishedTime || null,
    html: cleanArticleHtml(parsed.content),
    minutes: Math.max(1, Math.round(text.split(/\s+/).length / 230)),
  };
}

/** Keep the article's structure and images; drop everything active. */
export function cleanArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "a", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code",
      "em", "strong", "b", "i", "u", "s", "sub", "sup", "br", "hr", "figure", "figcaption",
      "img", "picture", "source", "table", "thead", "tbody", "tr", "th", "td", "caption",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "srcset", "alt", "width", "height"],
      source: ["srcset", "type", "media"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https"],
    // h1 is the panel's title; demote any inside the body.
    transformTags: {
      h1: "h2",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}
