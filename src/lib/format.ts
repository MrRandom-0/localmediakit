// Small formatting helpers shared by every tool.
// Kept dependency-free and pure so they are trivial to test.

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Human-readable file size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  // Whole numbers don't need a decimal place; everything else gets one.
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${rounded} ${BYTE_UNITS[exponent]}`;
}

/** Percentage saved after processing, e.g. (1000, 250) -> 75. Can be negative. */
export function savingsPercent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

/** Replace a file name's extension: ("photo.JPG", "webp") -> "photo.webp". */
export function replaceExtension(fileName: string, extension: string): string {
  const clean = extension.replace(/^\./, "");
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return `${base}.${clean}`;
}

/** The extension of a file name without the dot, lower-cased. "" when none. */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}
