import { describe, expect, test } from "bun:test";
import { opensAsTab } from "../apps/extension/lib/link-overlay";

describe("reading overlay routing", () => {
  test("articles stay in the reader panel", () => {
    expect(opensAsTab("https://www.bbc.co.uk/news/articles/c1234")).toBe(false);
    expect(opensAsTab("https://www.theguardian.com/technology/2026/oct/09/ai-story")).toBe(false);
    expect(opensAsTab("https://www.espncricinfo.com/story/australia-women-beat-bangladesh-1528716")).toBe(false);
    expect(opensAsTab("https://example.com/olive-oil-review")).toBe(false);
  });
  test("video and social sites open as tabs", () => {
    expect(opensAsTab("https://www.youtube.com/watch?v=x3TJFoQWCHA")).toBe(true);
    expect(opensAsTab("https://youtu.be/x3TJFoQWCHA")).toBe(true);
    expect(opensAsTab("https://m.youtube.com/watch?v=x")).toBe(true);
    expect(opensAsTab("https://x.com/AnthropicAI/status/1")).toBe(true);
    expect(opensAsTab("https://old.reddit.com/r/lego/comments/abc")).toBe(true);
  });
  test("live blogs and scorecards open as tabs", () => {
    expect(
      opensAsTab(
        "https://www.espncricinfo.com/series/bangladesh-women-in-australia-2026-27-1528686/australia-women-vs-bangladesh-women-1st-odi-1528716/live-cricket-score",
      ),
    ).toBe(true);
    expect(opensAsTab("https://www.bbc.co.uk/sport/football/live/c9876")).toBe(true);
    expect(opensAsTab("https://www.bbc.co.uk/sport/cricket/scorecard/e-244562")).toBe(true);
    expect(opensAsTab("https://www.theguardian.com/sport/live/2026/oct/09/match")).toBe(true);
  });
});
