import { describe, expect, it } from "vitest";
import { validateExternalVideoUrl } from "./video-links.js";

describe("external video links", () => {
  it("normalizes YouTube watch, short, and Shorts links", () => {
    expect(
      validateExternalVideoUrl("https://www.youtube.com/watch?v=abcdefghijk&t=30"),
    ).toEqual({
      sourceType: "YOUTUBE",
      sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    });
    expect(validateExternalVideoUrl("https://youtu.be/abcdefghijk")).toEqual({
      sourceType: "YOUTUBE",
      sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    });
    expect(
      validateExternalVideoUrl("https://youtube.com/shorts/abcdefghijk"),
    ).toEqual({
      sourceType: "YOUTUBE",
      sourceUrl: "https://www.youtube.com/watch?v=abcdefghijk",
    });
  });

  it("normalizes Google Drive view and open links", () => {
    expect(
      validateExternalVideoUrl(
        "https://drive.google.com/file/d/abcdefghijk/view?usp=sharing",
      ),
    ).toEqual({
      sourceType: "GOOGLE_DRIVE",
      sourceUrl: "https://drive.google.com/file/d/abcdefghijk/view",
    });
    expect(
      validateExternalVideoUrl("https://drive.google.com/open?id=abcdefghijk"),
    ).toEqual({
      sourceType: "GOOGLE_DRIVE",
      sourceUrl: "https://drive.google.com/file/d/abcdefghijk/view",
    });
  });

  it.each([
    "javascript:alert(1)",
    "http://www.youtube.com/watch?v=abcdefghijk",
    "https://youtube.com.attacker.example/watch?v=abcdefghijk",
    "https://example.com/abcdefghijk",
    "https://www.youtube.com/watch?v=invalid",
  ])("rejects unsupported or invalid URL %s", (url) => {
    expect(() => validateExternalVideoUrl(url)).toThrow();
  });
});
