import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { useState } from "react";
import Dropzone from "../components/Dropzone";
import { PageHeader } from "../components/ui";
import { downloadBlob } from "../lib/download";
import { hasGps, summariseExif, type ExifRow, type RawExif } from "../lib/exif";
import { formatBytes, replaceExtension } from "../lib/format";
import { FORMAT_INFO, formatFromMime, processImage } from "../lib/image";

interface Inspected {
  file: File;
  rows: ExifRow[];
  gps: boolean;
  raw: RawExif | null;
  strippedBlob?: Blob;
  strippedRows?: ExifRow[];
  error?: string;
}

export default function MetadataStripper() {
  const [item, setItem] = useState<Inspected | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function inspect(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    setItem(null);
    // Show the photo itself, not just its filename — people should see
    // exactly which picture they are about to clean and share.
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
    try {
      // Dynamic import: exifr is only needed on this page.
      const { default: exifr } = await import("exifr");
      const raw = (await exifr.parse(file, {
        gps: true,
        tiff: true,
        exif: true,
      })) as RawExif | null;
      setItem({
        file,
        raw: raw ?? null,
        rows: summariseExif(raw),
        gps: hasGps(raw),
      });
    } catch {
      setItem({
        file,
        raw: null,
        rows: [],
        gps: false,
        error:
          "We could not read metadata from this file. It may not contain any, or it may be a format we cannot inspect.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function strip() {
    if (!item) return;
    setBusy(true);
    try {
      // Re-encoding through a canvas drops every metadata segment — EXIF,
      // XMP, GPS, the lot — because the browser writes a brand-new file.
      const format = formatFromMime(item.file.type) ?? "jpeg";
      const processed = await processImage(item.file, { format, quality: 0.92, maxDimension: 0 });

      const { default: exifr } = await import("exifr");
      let after: RawExif | null = null;
      try {
        after = (await exifr.parse(processed.blob, {
          gps: true,
          tiff: true,
          exif: true,
        })) as RawExif | null;
      } catch {
        after = null; // No metadata at all is the expected, happy outcome.
      }

      setItem({
        ...item,
        strippedBlob: processed.blob,
        strippedRows: summariseExif(after),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Metadata Stripper">
        Photos carry hidden baggage: the camera model, the exact time, and often the GPS coordinates
        of where you were standing. Pick a photo to see what yours reveals, then strip it clean
        before sharing.
      </PageHeader>

      <Dropzone
        accept="image/jpeg,image/png,image/webp,image/tiff"
        label="Drop a photo here to inspect it"
        hint="JPEG photos carry the most metadata, but PNG and others can too"
        onFiles={inspect}
      />

      {busy && (
        <p role="status" className="mt-4 text-sm">
          Working…
        </p>
      )}

      {item && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-semibold">
            {item.file.name}{" "}
            <span className="font-normal text-zinc-500">({formatBytes(item.file.size)})</span>
          </h2>

          {previewUrl && (
            <img
              src={previewUrl}
              alt={`Preview of ${item.file.name}`}
              className="mt-3 max-h-80 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
            />
          )}

          {item.error && (
            <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {item.error}
            </p>
          )}

          {!item.error && item.rows.length === 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-teal-800 dark:text-teal-300">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Good news — we found no readable
              metadata in this file.
            </p>
          )}

          {item.rows.length > 0 && (
            <>
              {item.gps && (
                <p
                  role="alert"
                  className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  This photo contains GPS location data. Anyone you send it to can find where it was
                  taken — often your home address.
                </p>
              )}
              <dl className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                {item.rows.map((row) => (
                  <div key={row.label} className="flex gap-4 py-2 text-sm">
                    <dt className="w-40 shrink-0 font-medium">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>

              {!item.strippedBlob && (
                <button
                  type="button"
                  onClick={strip}
                  disabled={busy}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden /> Strip all metadata
                </button>
              )}
            </>
          )}

          {item.strippedBlob && (
            <div className="mt-4 rounded-md bg-teal-50 px-4 py-3 text-sm dark:bg-teal-950">
              <p className="font-medium text-teal-900 dark:text-teal-100">
                Done — the cleaned copy was re-read and{" "}
                {item.strippedRows && item.strippedRows.length > 0
                  ? `still shows ${item.strippedRows.length} harmless field(s), but no location, camera or date information.`
                  : "contains no metadata at all."}
              </p>
              <p className="mt-1 text-teal-900 dark:text-teal-100">
                Cleaned size: {formatBytes(item.strippedBlob.size)} (original{" "}
                {formatBytes(item.file.size)})
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                onClick={() => {
                  if (!item.strippedBlob) return;
                  const format = formatFromMime(item.file.type) ?? "jpeg";
                  downloadBlob(
                    item.strippedBlob,
                    replaceExtension(item.file.name, FORMAT_INFO[format].extension),
                  );
                }}
              >
                <Download className="h-4 w-4" aria-hidden /> Download cleaned photo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
