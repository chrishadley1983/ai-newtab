/**
 * Auto-rebuild policy, evaluated by the worker's alarm heartbeat: once the
 * current homepage is older than the chosen interval, rebuild headlessly so the
 * next new tab already shows a fresh one.
 */

/** Interval choices offered in Settings, in hours. */
export const REBUILD_INTERVAL_CHOICES = [6, 12, 24, 48] as const;

export const DEFAULT_REBUILD_INTERVAL_HOURS = 12;

/** A stored/user value as ms, falling back to the default when unset or invalid. */
export function rebuildIntervalMs(hours?: number | null): number {
  const h = typeof hours === "number" && hours > 0 ? hours : DEFAULT_REBUILD_INTERVAL_HOURS;
  return h * 60 * 60 * 1000;
}

export interface AutoRebuildInput {
  enabled: boolean;
  hasApiKey: boolean;
  isRunning: boolean;
  /** ISO timestamp of the last successful build, if any. */
  lastBuildTimestamp?: string | null;
  /** ISO timestamp of the last auto-build attempt, if any. */
  lastAutoAttemptTimestamp?: string | null;
  intervalMs: number;
  /** "HH:MM" local time. When set, rebuild once a day after it instead of on the interval. */
  dailyAt?: string | null;
  now: Date;
}

/** Today's `HH:MM` as a Date, or null when unset/invalid. */
export function dailyCutoff(dailyAt: string | null | undefined, now: Date): Date | null {
  const m = dailyAt?.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const cutoff = new Date(now);
  cutoff.setHours(h, min, 0, 0);
  return cutoff;
}

/**
 * Conservative by design:
 * - Never fires before the first manual build, so nothing spends on the API
 *   before the user has engaged.
 * - Won't retry a failed or cancelled auto-build until another full interval
 *   has passed, so it can't loop. The user can always rebuild by hand.
 */
export function shouldAutoRebuild(input: AutoRebuildInput): boolean {
  const { enabled, hasApiKey, isRunning, lastBuildTimestamp, lastAutoAttemptTimestamp, intervalMs, now } =
    input;

  if (!enabled || !hasApiKey || isRunning || !lastBuildTimestamp) return false;

  // Daily mode: one build per day, once the cutoff has passed. An attempt after
  // today's cutoff (success or not) counts, so a failure waits until tomorrow.
  const cutoff = dailyCutoff(input.dailyAt, now);
  if (cutoff) {
    if (now < cutoff) return false;
    if (new Date(lastBuildTimestamp) >= cutoff) return false;
    if (lastAutoAttemptTimestamp && new Date(lastAutoAttemptTimestamp) >= cutoff) return false;
    return true;
  }

  const age = (iso: string) => now.getTime() - new Date(iso).getTime();
  if (age(lastBuildTimestamp) < intervalMs) return false;
  if (lastAutoAttemptTimestamp && age(lastAutoAttemptTimestamp) < intervalMs) return false;
  return true;
}
