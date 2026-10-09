/**
 * Reading overlay: articles clicked on the homepage open as a reader view in a
 * panel over the new tab; everything else opens in a new tab.
 *
 * Framing the live site was tried and dropped: in a real profile sites break in
 * frames in a different way each (YouTube's service worker and then a renderer
 * crash, consent banners that blank the page, X never renders). A reader view
 * built from the fetched HTML has none of that, so only pages that extract well
 * stay in the panel.
 */

/** Tag on the postMessage from the homepage frame, so stray messages are ignored. */
export const LINK_MESSAGE_SOURCE = "hb-homepage-link";

export interface LinkMessage {
  source: typeof LINK_MESSAGE_SOURCE;
  kind: "open-overlay" | "open-tab" | "close-overlay";
  url: string;
  title: string;
}

export function asLinkMessage(data: unknown): LinkMessage | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Partial<LinkMessage>;
  if (m.source !== LINK_MESSAGE_SOURCE) return null;
  if (m.kind === "close-overlay") return { source: m.source, kind: m.kind, url: "", title: "" };
  if (m.kind !== "open-overlay" && m.kind !== "open-tab") return null;
  if (typeof m.url !== "string" || !/^https?:\/\//i.test(m.url)) return null;
  return { source: m.source, kind: m.kind, url: m.url, title: typeof m.title === "string" ? m.title : "" };
}

/** Video, social and app-like sites: no article to extract, open these as tabs. */
const OPEN_AS_TAB_HOSTS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "twitch.tv",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "facebook.com",
  "reddit.com",
  "linkedin.com",
  "github.com",
  "spotify.com",
];

/** Live blogs and scorecards update in place, so a one-off snapshot is no use. */
const LIVE_PATH = /(^|[/_-])(live|scorecard)([/_-]|$)/i;

export function opensAsTab(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|mobile\.|m\.)/, "");
    if (OPEN_AS_TAB_HOSTS.some((h) => host === h || host.endsWith("." + h))) return true;
    return LIVE_PATH.test(u.pathname);
  } catch {
    return false;
  }
}
