// Image processing: the maths lives in pure functions (fitWithin,
// targetSize, savings), the browser work (decode -> canvas -> encode) is a
// thin layer on top so the decisions are unit-tested and the DOM code stays
// boring.

export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

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
  avif: { mime: "image/avif", extension: "avif", lossy: true },
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

/** Exact output sizes for common destinations; the image is centre-cropped to fill. */
export const EXACT_SIZE_PRESETS: { label: string; size: Dimensions }[] = [
  { label: "1200 × 630 — link preview (Open Graph)", size: { width: 1200, height: 630 } },
  { label: "1080 × 1080 — Instagram square", size: { width: 1080, height: 1080 } },
  { label: "1080 × 1350 — Instagram portrait", size: { width: 1080, height: 1350 } },
  { label: "1920 × 1080 — video / 16:9", size: { width: 1920, height: 1080 } },
  { label: "1080 × 1920 — story / 9:16", size: { width: 1080, height: 1920 } },
];

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * The centred rectangle of `source` that has `target`'s aspect ratio — the
 * part of the photo kept when it is cropped to fill an exact output size
 * ("cover" in CSS terms). Nothing is ever upscaled: if the source is smaller
 * than the target in both dimensions the whole source is returned and the
 * caller shrinks the output instead (see coveredSize).
 */
export function coverCropRect(source: Dimensions, target: Dimensions): SourceRect {
  const sourceRatio = source.width / source.height;
  const targetRatio = target.width / target.height;
  if (sourceRatio > targetRatio) {
    // Source is wider than the target: keep full height, crop the sides.
    const sw = Math.max(1, Math.round(source.height * targetRatio));
    return { sx: Math.round((source.width - sw) / 2), sy: 0, sw, sh: source.height };
  }
  // Source is taller (or equal): keep full width, crop top and bottom.
  const sh = Math.max(1, Math.round(source.width / targetRatio));
  return { sx: 0, sy: Math.round((source.height - sh) / 2), sw: source.width, sh };
}

/**
 * The output size for an exact-size request. Equal to the target, unless the
 * source is smaller than the target on both axes — then the source size wins
 * so we never upscale (that only adds blur and bytes).
 */
export function coveredSize(source: Dimensions, target: Dimensions): Dimensions {
  if (source.width >= target.width || source.height >= target.height) {
    return { width: target.width, height: target.height };
  }
  return { width: Math.round(source.width), height: Math.round(source.height) };
}

export interface ImageOptions {
  format: ImageFormat;
  /** 0–1 for lossy formats; ignored for PNG. */
  quality: number;
  /** Longest allowed side in px; 0 keeps the original size. Ignored when exactSize is set. */
  maxDimension: number;
  /** Exact output size; the image is centre-cropped to fill it. Takes precedence over maxDimension. */
  exactSize?: Dimensions;
}

/**
 * True when a canvas encode actually produced the requested type. This
 * matters because canvas.toBlob silently falls back to PNG when the browser
 * cannot encode the requested format (AVIF and WebP in some browsers) — the
 * caller deserves an honest error, not a PNG wearing an .avif file name.
 */
export function encodeMatchesRequest(blobType: string, format: ImageFormat): boolean {
  return blobType === FORMAT_INFO[format].mime;
}

const encodeSupportCache = new Map<ImageFormat, Promise<boolean>>();

/**
 * Probe whether this browser can encode `format` on a canvas, by encoding a
 * 1×1 test image and checking what actually came out. Results are cached —
 * the answer cannot change during a session.
 */
export function canEncodeFormat(format: ImageFormat): Promise<boolean> {
  const cached = encodeSupportCache.get(format);
  if (cached) return cached;
  const probe = (async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, FORMAT_INFO[format].mime, 0.8),
    );
    return blob !== null && encodeMatchesRequest(blob.type, format);
  })();
  encodeSupportCache.set(format, probe);
  return probe;
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
    const source = { width: bitmap.width, height: bitmap.height };
    const target = options.exactSize
      ? coveredSize(source, options.exactSize)
      : fitWithin(source, options.maxDimension);

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
    if (options.exactSize) {
      const crop = coverCropRect(source, target);
      context.drawImage(
        bitmap,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        target.width,
        target.height,
      );
    } else {
      context.drawImage(bitmap, 0, 0, target.width, target.height);
    }

    const info = FORMAT_INFO[options.format];
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, info.mime, info.lossy ? options.quality : undefined),
    );
    if (!blob) throw new Error("The browser could not encode this image.");
    if (!encodeMatchesRequest(blob.type, options.format)) {
      // toBlob silently substitutes PNG for formats the browser cannot
      // encode — refuse rather than hand back a mislabelled file.
      throw new Error(
        `This browser cannot encode ${options.format.toUpperCase()} images. Try JPEG, PNG or WebP instead.`,
      );
    }

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
