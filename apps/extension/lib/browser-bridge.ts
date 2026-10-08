import type { BrowserBridge } from "@homepage/agent-core";
import { getHistorySites } from "./history";
import { scrapeUrls } from "./scraper";
import { loadSettings } from "./storage";

/** The brief endpoint gathers to-dos live, which can take several seconds. */
const BRIEF_TIMEOUT_MS = 60_000;

/**
 * The capabilities only a real browser has, implemented over chrome.history
 * and chrome.tabs, plus the user's own brief endpoint. Runs in the service
 * worker, in-process with the agent loop.
 */
export const browserBridge: BrowserBridge = {
  getHistory: ({ daysToAnalyze, maxResults }) => getHistorySites(daysToAnalyze, maxResults),
  getPageHtml: ({ urls, loadDelayMs }) => scrapeUrls(urls, { loadDelay: loadDelayMs }),
  getMorningBrief: async () => {
    const { briefUrl } = await loadSettings();
    if (!briefUrl) throw new Error("No morning brief URL is configured.");
    const res = await fetch(briefUrl, { signal: AbortSignal.timeout(BRIEF_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Morning brief returned HTTP ${res.status}`);
    return res.json();
  },
};
