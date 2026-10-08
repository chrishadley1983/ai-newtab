import {
  DEFAULT_MODEL,
  MODEL_CHOICES,
  STORAGE_KEYS as AGENT_KEYS,
  type HomepageModel,
  type KVStore,
} from "@homepage/agent-core";

/**
 * Everything the extension persists, in one place. All of it lives in
 * chrome.storage.local — including the API key, which anyone with access to the
 * browser profile can read. Fine for a tool you run yourself; not for one you
 * distribute (see ARCHITECTURE.md → Privacy).
 */
export const KEYS = {
  ...AGENT_KEYS,
  homepage: "homepageData",
  systemPrompt: "systemPrompt",
  model: "model",
  autoRebuild: "autoRebuild",
  /** ISO timestamp of the last auto-build *attempted* (success or not). */
  lastAutoBuildAttempt: "lastAutoBuildAttempt",
  rebuildIntervalHours: "autoRebuildIntervalHours",
  /** Throttled mirror of the live build state, for tabs that open while the worker sleeps. */
  buildSnapshot: "buildSnapshot",
  /** Sent as `anthropic-workspace-id`; required by user-scoped (sk-ant-usr-) keys. */
  workspaceId: "workspaceId",
  /** Where getMorningBrief fetches the curated brief from. Empty = tool disabled. */
  briefUrl: "briefUrl",
  /** "HH:MM" local time for the daily rebuild. Empty = use the hourly interval. */
  dailyRebuildAt: "dailyRebuildAt",
} as const;

export const DEFAULT_BRIEF_URL = "http://localhost:8100/homepage/brief";
/** After the 07:01 newsletter fetch has landed. */
export const DEFAULT_DAILY_REBUILD_AT = "07:15";

export interface Homepage {
  /** The agent's raw TSX source. */
  code: string;
  /** ISO timestamp of when it was built. */
  timestamp: string;
}

export interface Settings {
  apiKey: string | null;
  systemPrompt: string;
  model: HomepageModel;
  /** Unset means on — auto-rebuild is opt-out. */
  autoRebuild: boolean;
  rebuildIntervalHours: number | null;
  workspaceId: string;
  briefUrl: string;
  dailyRebuildAt: string;
}

type SettingKey = keyof Settings;

/** The `KVStore` agent-core persists its agent/environment/session IDs through. */
export const extensionStore: KVStore = {
  async get<T>(key: string): Promise<T | undefined> {
    const result = await browser.storage.local.get(key);
    return result[key] as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};

export async function loadSettings(): Promise<Settings> {
  const s = await browser.storage.local.get([
    KEYS.apiKey,
    KEYS.systemPrompt,
    KEYS.model,
    KEYS.autoRebuild,
    KEYS.rebuildIntervalHours,
    KEYS.workspaceId,
    KEYS.briefUrl,
    KEYS.dailyRebuildAt,
  ]);
  const model = s[KEYS.model] as string | undefined;
  return {
    apiKey: (s[KEYS.apiKey] as string | undefined) ?? null,
    systemPrompt: (s[KEYS.systemPrompt] as string | undefined) ?? "",
    // Fall back if a stored model is no longer offered.
    model: MODEL_CHOICES.find((m) => m.id === model)?.id ?? DEFAULT_MODEL,
    autoRebuild: s[KEYS.autoRebuild] !== false,
    rebuildIntervalHours: (s[KEYS.rebuildIntervalHours] as number | undefined) ?? null,
    workspaceId: (s[KEYS.workspaceId] as string | undefined) ?? "",
    // Unset means the default; a saved empty string means deliberately off.
    briefUrl: (s[KEYS.briefUrl] as string | undefined) ?? DEFAULT_BRIEF_URL,
    dailyRebuildAt: (s[KEYS.dailyRebuildAt] as string | undefined) ?? DEFAULT_DAILY_REBUILD_AT,
  };
}

export async function saveSetting<K extends SettingKey>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await browser.storage.local.set({ [KEYS[key]]: value });
}

export async function loadHomepage(): Promise<Homepage | undefined> {
  return extensionStore.get<Homepage>(KEYS.homepage);
}

export async function saveHomepage(code: string): Promise<void> {
  const homepage: Homepage = { code, timestamp: new Date().toISOString() };
  await extensionStore.set(KEYS.homepage, homepage);
}
