import { describe, expect, it } from "vitest";
import { fitWithin, formatFromMime, FORMAT_INFO } from "./image";

describe("fitWithin", () => {
  it("leaves small images untouched", () => {
    expect(fitWithin({ width: 800, height: 600 }, 1920)).toEqual({ width: 800, height: 600 });
  });

  it("scales landscape images by width", () => {
    expect(fitWithin({ width: 4000, height: 2000 }, 1000)).toEqual({ width: 1000, height: 500 });
  });

  it("scales portrait images by height", () => {
    expect(fitWithin({ width: 1000, height: 4000 }, 1000)).toEqual({ width: 250, height: 1000 });
  });

  it("handles square images", () => {
    expect(fitWithin({ width: 2000, height: 2000 }, 500)).toEqual({ width: 500, height: 500 });
  });

  it("treats a max dimension of 0 as 'no resize'", () => {
    expect(fitWithin({ width: 6000, height: 4000 }, 0)).toEqual({ width: 6000, height: 4000 });
  });

  it("never returns a zero-sized side", () => {
    const result = fitWithin({ width: 10000, height: 1 }, 100);
    expect(result.width).toBe(100);
    expect(result.height).toBe(1);
  });

  it("rounds to whole pixels", () => {
    const result = fitWithin({ width: 333, height: 222 }, 100);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });
});

describe("formatFromMime", () => {
  it("maps the formats we support", () => {
    expect(formatFromMime("image/jpeg")).toBe("jpeg");
    expect(formatFromMime("image/png")).toBe("png");
    expect(formatFromMime("image/webp")).toBe("webp");
  });

  it("returns null for anything else", () => {
    expect(formatFromMime("image/gif")).toBeNull();
    expect(formatFromMime("image/avif")).toBeNull();
    expect(formatFromMime("")).toBeNull();
  });
});

describe("FORMAT_INFO", () => {
  it("marks PNG as lossless and the others lossy", () => {
    expect(FORMAT_INFO.png.lossy).toBe(false);
    expect(FORMAT_INFO.jpeg.lossy).toBe(true);
    expect(FORMAT_INFO.webp.lossy).toBe(true);
  });
});
