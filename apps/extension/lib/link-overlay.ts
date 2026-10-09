/**
 * Reading overlay: links clicked on the homepage open in a framed panel over
 * the new tab instead of navigating away.
 *
 * Many sites (YouTube, X, the Guardian…) forbid framing with X-Frame-Options or
 * CSP frame-ancestors. A session rule scoped to THIS tab only strips those
 * headers from sub-frames, so ordinary browsing is untouched. YouTube is framed
 * as the normal watch page: its embed player refuses to play inside an extension
 * page (errors 152/153), even for embeddable videos.
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

/** Sites that render blank inside any frame, even with the headers stripped: open these as tabs. */
const OPEN_AS_TAB_HOSTS = ["x.com", "twitter.com"];

export function opensAsTab(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^(www\.|mobile\.)/, "");
    return OPEN_AS_TAB_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

/** One rule id per tab, so several open new tabs don't overwrite each other. */
const RULE_ID_BASE = 1000;
/** The service-worker rule for whichever site the overlay is showing. */
const SW_RULE_ID = 999;

const FRAME_BLOCKING_HEADERS = [
  { header: "x-frame-options", operation: "remove" },
  { header: "content-security-policy", operation: "remove" },
] as Browser.declarativeNetRequest.ModifyHeaderInfo[];

/**
 * Let `url` load in a frame inside this tab. Idempotent.
 *
 * Two rules: the tab's own sub-frame requests, and the site's service worker.
 * Sites like YouTube serve navigations from a service worker once you've visited
 * them; that fetch belongs to no tab, so the tab rule never sees it and the
 * frame is refused. The service-worker rule is limited to the overlay's site and
 * is removed again when the overlay closes.
 */
export async function allowFramingInTab(tabId: number, url: string): Promise<void> {
  const id = RULE_ID_BASE + (tabId % 1_000_000);
  const host = new URL(url).hostname;
  await browser.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [id, SW_RULE_ID],
    addRules: [
      {
        id,
        priority: 1,
        action: { type: "modifyHeaders", responseHeaders: FRAME_BLOCKING_HEADERS },
        condition: { tabIds: [tabId], resourceTypes: ["sub_frame"] },
      },
      {
        id: SW_RULE_ID,
        priority: 1,
        action: { type: "modifyHeaders", responseHeaders: FRAME_BLOCKING_HEADERS },
        condition: {
          tabIds: [-1], // requests made by no tab, e.g. a service worker
          requestDomains: [host],
          excludedResourceTypes: ["main_frame"],
        },
      },
    ],
  });
}

/** Drop the service-worker rule once nothing is being read. */
export async function endFraming(): Promise<void> {
  await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [SW_RULE_ID] });
}
