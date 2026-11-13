import { Download, FileArchive, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  cardClass,
  ghostButtonClass,
  inputClass,
  labelClass,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from "../components/ui";
import { downloadBlob } from "../lib/download";
import { formatBytes, replaceExtension, savingsPercent } from "../lib/format";
import {
  canEncodeFormat,
  EXACT_SIZE_PRESETS,
  FORMAT_INFO,
  formatFromMime,
  processImage,
  readDimensions,
  RESIZE_PRESETS,
  type Dimensions,
  type ImageFormat,
} from "../lib/image";
import { buildZip } from "../lib/zip";

interface ImageJob {
  id: number;
  file: File;
  /** Object URL of the original file, so the person can see their photo. */
  previewUrl: string;
  originalWidth?: number;
  originalHeight?: number;
  status: "waiting" | "working" | "done" | "error";
  result?: { blob: Blob; name: string; width: number; height: number; previewUrl: string };
  error?: string;
}

let nextId = 1;

export default function ImageStudio() {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [formatChoice, setFormatChoice] = useState<"keep" | ImageFormat>("keep");
  const [quality, setQuality] = useState(82);
  const [maxDimension, setMaxDimension] = useState(0);
  const [resizeMode, setResizeMode] = useState<"fit" | "exact">("fit");
  const [exactPreset, setExactPreset] = useState(0);
  const [customSize, setCustomSize] = useState<Dimensions>({ width: 1200, height: 630 });
  const [busy, setBusy] = useState(false);
  // AVIF encoding depends on the browser; probe once so the option can be
  // labelled honestly instead of failing after someone has queued a batch.
  const [avifSupported, setAvifSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void canEncodeFormat("avif").then((supported) => {
      if (!cancelled) setAvifSupported(supported);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const exactSize: Dimensions | undefined =
    resizeMode === "exact"
      ? exactPreset < EXACT_SIZE_PRESETS.length
        ? EXACT_SIZE_PRESETS[exactPreset].size
        : customSize
      : undefined;

  const totals = useMemo(() => {
    const done = jobs.filter((job) => job.status === "done" && job.result);
    return {
      before: done.reduce((sum, job) => sum + job.file.size, 0),
      after: done.reduce((sum, job) => sum + (job.result?.blob.size ?? 0), 0),
      count: done.length,
    };
  }, [jobs]);

  async function addFiles(files: File[]) {
    const newJobs: ImageJob[] = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: nextId++,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "waiting" as const,
      }));
    if (newJobs.length === 0) return;
    setJobs((prev) => [...prev, ...newJobs]);
    // Read dimensions up-front so people can see what they dropped in.
    for (const job of newJobs) {
      try {
        const size = await readDimensions(job.file);
        setJobs((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? { ...item, originalWidth: size.width, originalHeight: size.height }
              : item,
          ),
        );
      } catch {
        // Dimension readout is a nicety; processing will surface real errors.
      }
    }
  }

  async function processAll() {
    setBusy(true);
    for (const job of jobs) {
      if (job.status === "done") continue;
      setJobs((prev) =>
        prev.map((item) => (item.id === job.id ? { ...item, status: "working" } : item)),
      );
      try {
        // "Keep" preserves AVIF inputs as AVIF too; formatFromMime covers
        // the canvas-native formats, everything else falls back to JPEG.
        const format =
          formatChoice === "keep"
            ? (formatFromMime(job.file.type) ??
              (job.file.type === "image/avif" ? "avif" : "jpeg"))
            : formatChoice;
        const processed = await processImage(job.file, {
          format,
          quality: quality / 100,
          maxDimension,
          exactSize,
        });
        const name = replaceExtension(job.file.name, FORMAT_INFO[format].extension);
        setJobs((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  status: "done",
                  result: {
                    blob: processed.blob,
                    name,
                    width: processed.width,
                    height: processed.height,
                    previewUrl: URL.createObjectURL(processed.blob),
                  },
                }
              : item,
          ),
        );
      } catch (error) {
        setJobs((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? {
                  ...item,
                  status: "error",
                  error: error instanceof Error ? error.message : "Could not process this image.",
                }
              : item,
          ),
        );
      }
    }
    setBusy(false);
  }

  async function downloadAll() {
    const done = jobs.filter((job) => job.status === "done" && job.result);
    if (done.length === 0) return;
    if (done.length === 1 && done[0].result) {
      downloadBlob(done[0].result.blob, done[0].result.name);
      return;
    }
    // Several files: bundle them into one zip instead of firing off a pile
    // of separate downloads (which browsers tend to block anyway). The zip
    // helper de-duplicates names so same-named inputs can't overwrite.
    const entries = done.flatMap((job) =>
      job.result ? [{ name: job.result.name, blob: job.result.blob }] : [],
    );
    const blob = await buildZip(entries);
    downloadBlob(blob, "localmediakit-images.zip");
  }

  return (
    <div>
      <PageHeader title="Image Studio">
        Compress, convert and resize images in batches. WebP at a sensible quality setting usually
        cuts photo sizes by half or more, AVIF goes further still, and PNG stays lossless. Resize
        by longest side, or crop to an exact size for social and link previews. Processed images
        also come out with their metadata removed, as a side effect of how browsers encode them.
      </PageHeader>

      <Dropzone
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        label="Drop images here"
        hint="JPEG, PNG, WebP and more — as many as you like"
        onFiles={addFiles}
      />

      <div className={`${cardClass} mt-6 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <label htmlFor="format" className={labelClass}>
            Output format
          </label>
          <select
            id="format"
            className={inputClass}
            value={formatChoice}
            onChange={(event) => setFormatChoice(event.target.value as typeof formatChoice)}
          >
            <option value="keep">Keep original format</option>
            <option value="jpeg">JPEG — photos, everywhere-compatible</option>
            <option value="webp">WebP — smallest for the web</option>
            <option value="avif" disabled={avifSupported === false}>
              AVIF — smallest of all
              {avifSupported === false ? " (not supported by this browser)" : ""}
            </option>
            <option value="png">PNG — lossless, supports transparency</option>
          </select>
        </div>
        <div>
          <label htmlFor="resize-mode" className={labelClass}>
            Resize
          </label>
          <select
            id="resize-mode"
            className={inputClass}
            value={resizeMode}
            onChange={(event) => setResizeMode(event.target.value as typeof resizeMode)}
          >
            <option value="fit">Fit within a longest side</option>
            <option value="exact">Exact size — crop to fill</option>
          </select>
        </div>
        {resizeMode === "fit" ? (
          <div>
            <label htmlFor="max-dimension" className={labelClass}>
              Longest side
            </label>
            <select
              id="max-dimension"
              className={inputClass}
              value={maxDimension}
              onChange={(event) => setMaxDimension(Number(event.target.value))}
            >
              {RESIZE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="exact-preset" className={labelClass}>
              Exact size
            </label>
            <select
              id="exact-preset"
              className={inputClass}
              value={exactPreset}
              onChange={(event) => setExactPreset(Number(event.target.value))}
            >
              {EXACT_SIZE_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
              <option value={EXACT_SIZE_PRESETS.length}>Custom size…</option>
            </select>
            {exactPreset >= EXACT_SIZE_PRESETS.length && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20000}
                  aria-label="Custom width in pixels"
                  className={inputClass}
                  value={customSize.width}
                  onChange={(event) =>
                    setCustomSize((size) => ({
                      ...size,
                      width: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                />
                <span className="text-zinc-500" aria-hidden>
                  ×
                </span>
                <input
                  type="number"
                  min={1}
                  max={20000}
                  aria-label="Custom height in pixels"
                  className={inputClass}
                  value={customSize.height}
                  onChange={(event) =>
                    setCustomSize((size) => ({
                      ...size,
                      height: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                />
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              The photo is centre-cropped to the chosen shape — nothing is stretched.
            </p>
          </div>
        )}
        <div>
          <label htmlFor="quality" className={labelClass}>
            Quality: {quality}%{" "}
            <span className="font-normal text-zinc-500">(JPEG / WebP / AVIF)</span>
          </label>
          <input
            id="quality"
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
            className="w-full accent-teal-700"
          />
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              onClick={processAll}
              disabled={busy}
            >
              <Play className="h-4 w-4" aria-hidden />
              {busy ? "Processing…" : "Process images"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={downloadAll}
              disabled={totals.count === 0}
            >
              <FileArchive className="h-4 w-4" aria-hidden />
              Download {totals.count > 1 ? `all as zip (${totals.count})` : "result"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                // Object URLs pin the file data in memory until revoked.
                for (const job of jobs) {
                  URL.revokeObjectURL(job.previewUrl);
                  if (job.result) URL.revokeObjectURL(job.result.previewUrl);
                }
                setJobs([]);
              }}
              disabled={busy}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Clear
            </button>
            {totals.count > 0 && (
              <p className="ml-auto text-sm tabular-nums" role="status">
                {formatBytes(totals.before)} → {formatBytes(totals.after)} (
                <strong>{savingsPercent(totals.before, totals.after)}% saved</strong>)
              </p>
            )}
          </div>

          <ul
            className={`${cardClass} divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800`}
          >
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <img
                  src={job.previewUrl}
                  alt={`Preview of ${job.file.name}`}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-zinc-900/10 dark:ring-white/10"
                  loading="lazy"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{job.file.name}</span>
                <span className="text-zinc-500 tabular-nums">
                  {job.originalWidth && job.originalHeight
                    ? `${job.originalWidth} × ${job.originalHeight} · `
                    : ""}
                  {formatBytes(job.file.size)}
                </span>
                {job.status === "done" && job.result && (
                  <>
                    <img
                      src={job.result.previewUrl}
                      alt={`Processed result for ${job.file.name}`}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-teal-600/30 dark:ring-teal-400/30"
                      loading="lazy"
                    />
                    <span className="tabular-nums">
                      → {job.result.width} × {job.result.height} ·{" "}
                      {formatBytes(job.result.blob.size)} (
                      {savingsPercent(job.file.size, job.result.blob.size)}% saved)
                    </span>
                    <button
                      type="button"
                      className={ghostButtonClass}
                      onClick={() => job.result && downloadBlob(job.result.blob, job.result.name)}
                    >
                      <Download className="h-4 w-4" aria-hidden /> Download
                    </button>
                  </>
                )}
                {job.status === "working" && <span role="status">Working…</span>}
                {job.status === "waiting" && <span className="text-zinc-500">Waiting</span>}
                {job.status === "error" && (
                  <span className="text-red-700 dark:text-red-300">{job.error}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
