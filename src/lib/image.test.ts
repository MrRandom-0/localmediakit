import { describe, expect, it } from "vitest";
import {
  coverCropRect,
  coveredSize,
  encodeMatchesRequest,
  EXACT_SIZE_PRESETS,
  fitWithin,
  formatFromMime,
  FORMAT_INFO,
} from "./image";

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

describe("AVIF support", () => {
  it("is a known format, lossy, with the right mime and extension", () => {
    expect(FORMAT_INFO.avif).toEqual({ mime: "image/avif", extension: "avif", lossy: true });
  });
});

describe("encodeMatchesRequest", () => {
  it("accepts a blob whose type is exactly the requested mime", () => {
    expect(encodeMatchesRequest("image/avif", "avif")).toBe(true);
    expect(encodeMatchesRequest("image/webp", "webp")).toBe(true);
    expect(encodeMatchesRequest("image/png", "png")).toBe(true);
  });

  it("rejects the silent PNG fallback", () => {
    // canvas.toBlob substitutes PNG when a format cannot be encoded; the
    // result must never be passed off as the requested format.
    expect(encodeMatchesRequest("image/png", "avif")).toBe(false);
    expect(encodeMatchesRequest("image/png", "webp")).toBe(false);
    expect(encodeMatchesRequest("", "jpeg")).toBe(false);
  });
});

describe("coverCropRect", () => {
  it("crops the sides of a wide source for a square target", () => {
    expect(coverCropRect({ width: 2000, height: 1000 }, { width: 1080, height: 1080 })).toEqual({
      sx: 500,
      sy: 0,
      sw: 1000,
      sh: 1000,
    });
  });

  it("crops top and bottom of a tall source for a wide target", () => {
    expect(coverCropRect({ width: 1000, height: 2000 }, { width: 1200, height: 630 })).toEqual({
      sx: 0,
      sy: 738,
      sw: 1000,
      sh: 525,
    });
  });

  it("keeps the whole frame when the aspect ratios already match", () => {
    expect(coverCropRect({ width: 1920, height: 1080 }, { width: 1280, height: 720 })).toEqual({
      sx: 0,
      sy: 0,
      sw: 1920,
      sh: 1080,
    });
  });

  it("always stays inside the source", () => {
    const rect = coverCropRect({ width: 333, height: 999 }, { width: 1200, height: 630 });
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(333);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(999);
    expect(rect.sw).toBeGreaterThanOrEqual(1);
    expect(rect.sh).toBeGreaterThanOrEqual(1);
  });
});

describe("coveredSize", () => {
  it("returns the target when the source is big enough", () => {
    expect(coveredSize({ width: 4000, height: 3000 }, { width: 1200, height: 630 })).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it("never upscales a source smaller than the target on both axes", () => {
    expect(coveredSize({ width: 800, height: 600 }, { width: 1200, height: 630 })).toEqual({
      width: 800,
      height: 600,
    });
  });
});

describe("EXACT_SIZE_PRESETS", () => {
  it("offers positive, unique sizes", () => {
    const seen = new Set<string>();
    for (const preset of EXACT_SIZE_PRESETS) {
      expect(preset.size.width).toBeGreaterThan(0);
      expect(preset.size.height).toBeGreaterThan(0);
      const key = `${preset.size.width}x${preset.size.height}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
