import { describe, expect, test } from "bun:test";
import { dailyCutoff, shouldAutoRebuild } from "../apps/extension/lib/auto-rebuild";

const base = {
  enabled: true,
  hasApiKey: true,
  isRunning: false,
  intervalMs: 12 * 60 * 60 * 1000,
  dailyAt: "07:15",
};
const at = (d: string) => new Date(d);

describe("daily auto-rebuild", () => {
  test("waits until the cutoff", () => {
    expect(
      shouldAutoRebuild({ ...base, lastBuildTimestamp: "2026-10-08T07:20:00", now: at("2026-10-09T07:00:00") }),
    ).toBe(false);
  });

  test("fires once the cutoff passes and the build is from before it", () => {
    expect(
      shouldAutoRebuild({ ...base, lastBuildTimestamp: "2026-10-08T07:20:00", now: at("2026-10-09T07:16:00") }),
    ).toBe(true);
  });

  test("does not fire again after today's build", () => {
    expect(
      shouldAutoRebuild({ ...base, lastBuildTimestamp: "2026-10-09T07:17:00", now: at("2026-10-09T15:00:00") }),
    ).toBe(false);
  });

  test("a failed attempt today waits until tomorrow", () => {
    expect(
      shouldAutoRebuild({
        ...base,
        lastBuildTimestamp: "2026-10-08T07:20:00",
        lastAutoAttemptTimestamp: "2026-10-09T07:16:00",
        now: at("2026-10-09T09:00:00"),
      }),
    ).toBe(false);
  });

  test("never fires before the first manual build", () => {
    expect(shouldAutoRebuild({ ...base, lastBuildTimestamp: null, now: at("2026-10-09T09:00:00") })).toBe(false);
  });

  test("an empty or invalid time falls back to the interval", () => {
    expect(dailyCutoff("", new Date())).toBeNull();
    expect(dailyCutoff("25:00", new Date())).toBeNull();
    expect(
      shouldAutoRebuild({
        ...base,
        dailyAt: "",
        lastBuildTimestamp: "2026-10-09T00:00:00",
        now: at("2026-10-09T13:00:00"),
      }),
    ).toBe(true);
  });
});
