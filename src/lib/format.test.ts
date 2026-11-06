import { describe, expect, it } from "vitest";
import { fileExtension, formatBytes, replaceExtension, savingsPercent } from "./format";

describe("formatBytes", () => {
  it("formats bytes and zero", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes and megabytes with one decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatBytes(Math.round(2.4 * 1024 * 1024))).toBe("2.4 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe("3 GB");
  });

  it("is defensive about bad input", () => {
    expect(formatBytes(-10)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});

describe("savingsPercent", () => {
  it("calculates a saving", () => {
    expect(savingsPercent(1000, 250)).toBe(75);
    expect(savingsPercent(1000, 1000)).toBe(0);
  });

  it("goes negative when the output is bigger", () => {
    expect(savingsPercent(1000, 1500)).toBe(-50);
  });

  it("handles a zero-size original", () => {
    expect(savingsPercent(0, 0)).toBe(0);
  });
});

describe("replaceExtension", () => {
  it("swaps the extension", () => {
    expect(replaceExtension("photo.JPG", "webp")).toBe("photo.webp");
    expect(replaceExtension("archive.tar.gz", "zip")).toBe("archive.tar.zip");
  });

  it("adds an extension when there is none, and tolerates a leading dot", () => {
    expect(replaceExtension("photo", ".png")).toBe("photo.png");
  });
});

describe("fileExtension", () => {
  it("returns the lower-cased extension", () => {
    expect(fileExtension("Movie.MP4")).toBe("mp4");
    expect(fileExtension("captions.srt")).toBe("srt");
  });

  it("returns empty string when there is no extension", () => {
    expect(fileExtension("README")).toBe("");
    expect(fileExtension("trailingdot.")).toBe("");
  });
});
