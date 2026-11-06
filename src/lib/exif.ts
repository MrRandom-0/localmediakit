// EXIF handling for the Metadata Stripper.
//
// Reading uses `exifr` (in readExif below). Turning its raw output into the
// rows a normal person understands — "Camera: Canon EOS R6", "Location:
// 51.5074, -0.1278" — is a pure function, so it is tested without needing
// real camera files in the test suite.

export interface ExifRow {
  label: string;
  value: string;
}

/** The slice of exifr's output we actually display. */
export interface RawExif {
  Make?: string;
  Model?: string;
  Software?: string;
  DateTimeOriginal?: Date | string;
  CreateDate?: Date | string;
  ModifyDate?: Date | string;
  latitude?: number;
  longitude?: number;
  ImageWidth?: number;
  ImageHeight?: number;
  Orientation?: number;
  [key: string]: unknown;
}

function formatDate(value: Date | string | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

/**
 * Turn raw EXIF into friendly rows, in the order people care about:
 * camera first, then when, then — the privacy-sensitive one — where.
 */
export function summariseExif(raw: RawExif | null | undefined): ExifRow[] {
  if (!raw) return [];
  const rows: ExifRow[] = [];

  // Some cameras repeat the make inside the model ("Canon EOS R6" already
  // contains "Canon") — don't print it twice.
  const make = typeof raw.Make === "string" ? raw.Make.trim() : "";
  const model = typeof raw.Model === "string" ? raw.Model.trim() : "";
  const camera =
    make && model
      ? model.toLowerCase().includes(make.toLowerCase())
        ? model
        : `${make} ${model}`
      : make || model;
  if (camera) rows.push({ label: "Camera", value: camera });

  const taken = formatDate(raw.DateTimeOriginal ?? raw.CreateDate);
  if (taken) rows.push({ label: "Taken", value: taken });

  const edited = formatDate(raw.ModifyDate);
  if (edited && edited !== taken) rows.push({ label: "Last edited", value: edited });

  if (typeof raw.latitude === "number" && typeof raw.longitude === "number") {
    rows.push({
      label: "Location (GPS)",
      value: `${raw.latitude.toFixed(6)}, ${raw.longitude.toFixed(6)}`,
    });
  }

  if (raw.ImageWidth && raw.ImageHeight) {
    rows.push({ label: "Dimensions in file", value: `${raw.ImageWidth} × ${raw.ImageHeight} px` });
  }
  if (typeof raw.Software === "string" && raw.Software.trim()) {
    rows.push({ label: "Software", value: raw.Software.trim() });
  }

  return rows;
}

/** True when the file carries GPS coordinates — the row worth warning about. */
export function hasGps(raw: RawExif | null | undefined): boolean {
  return !!raw && typeof raw.latitude === "number" && typeof raw.longitude === "number";
}
