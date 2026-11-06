// Image processing: the maths lives in pure functions (fitWithin,
// targetSize, savings), the browser work (decode -> canvas -> encode) is a
// thin layer on top so the decisions are unit-tested and the DOM code stays
// boring.

export type ImageFormat = "jpeg" | "png" | "webp";

export interface FormatInfo {
  mime: string;
  extension: string;
  /** Lossy formats honour the quality slider; PNG ignores it. */
  lossy: boolean;
}

export const FORMAT_INFO: Record<ImageFormat, FormatInfo> = {
  jpeg: { mime: "image/jpeg", extension: "jpg", lossy: true },
  png: { mime: "image/png", extension: "png", lossy: false },
  webp: { mime: "image/webp", extension: "webp", lossy: true },
};

/** Map a mime type (from a File) to one of our output formats, if we know it. */
export function formatFromMime(mime: string): ImageFormat | null {
  switch (mime) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Scale `size` down so neither side exceeds `maxDimension`, preserving the
 * aspect ratio. Images already small enough are returned unchanged — we never
 * upscale, that only adds blur and bytes.
 */
export function fitWithin(size: Dimensions, maxDimension: number): Dimensions {
  const longest = Math.max(size.width, size.height);
  if (maxDimension <= 0 || longest <= maxDimension) {
    return { width: Math.round(size.width), height: Math.round(size.height) };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** Common "longest side" presets offered in the UI. 0 means "original size". */
export const RESIZE_PRESETS: { label: string; value: number }[] = [
  { label: "Original size", value: 0 },
  { label: "3840 px — 4K / print", value: 3840 },
  { label: "1920 px — full HD / web hero", value: 1920 },
  { label: "1280 px — blog / docs", value: 1280 },
  { label: "800 px — email / thumbnails", value: 800 },
];

export interface ImageOptions {
  format: ImageFormat;
  /** 0–1 for lossy formats; ignored for PNG. */
  quality: number;
  /** Longest allowed side in px; 0 keeps the original size. */
  maxDimension: number;
}

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Decode, optionally resize, and re-encode one image entirely on a canvas.
 * Re-encoding has a useful side effect: EXIF/metadata never survives a
 * canvas round-trip, so processed images come out metadata-free.
 */
export async function processImage(file: File, options: ImageOptions): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const target = fitWithin({ width: bitmap.width, height: bitmap.height }, options.maxDimension);

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available in this browser.");

    // JPEG has no alpha channel — paint white behind transparent pixels
    // instead of the default black.
    if (options.format === "jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, target.width, target.height);
    }
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const info = FORMAT_INFO[options.format];
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, info.mime, info.lossy ? options.quality : undefined),
    );
    if (!blob) throw new Error("The browser could not encode this image.");

    return { blob, width: target.width, height: target.height };
  } finally {
    bitmap.close();
  }
}

/** Load an image just to read its pixel dimensions. */
export async function readDimensions(file: File): Promise<Dimensions> {
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
