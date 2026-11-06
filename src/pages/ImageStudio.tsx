import { Download, FileArchive, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  inputClass,
  labelClass,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from "../components/ui";
import { downloadBlob } from "../lib/download";
import { formatBytes, replaceExtension, savingsPercent } from "../lib/format";
import {
  FORMAT_INFO,
  formatFromMime,
  processImage,
  readDimensions,
  RESIZE_PRESETS,
  type ImageFormat,
} from "../lib/image";

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
  const [busy, setBusy] = useState(false);

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
        const format =
          formatChoice === "keep" ? (formatFromMime(job.file.type) ?? "jpeg") : formatChoice;
        const processed = await processImage(job.file, {
          format,
          quality: quality / 100,
          maxDimension,
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
    // of separate downloads (which browsers tend to block anyway).
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const usedNames = new Set<string>();
    for (const job of done) {
      if (!job.result) continue;
      // Two inputs can share a name (a.jpg from two folders); suffix the
      // duplicates so nothing overwrites anything else inside the zip.
      let name = job.result.name;
      const dot = name.lastIndexOf(".");
      let counter = 2;
      while (usedNames.has(name)) {
        name = `${name.slice(0, dot)}-${counter}.${name.slice(dot + 1)}`;
        counter++;
      }
      usedNames.add(name);
      zip.file(name, job.result.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "localmediakit-images.zip");
  }

  return (
    <div>
      <PageHeader title="Image Studio">
        Compress, convert and resize images in batches. WebP at a sensible quality setting usually
        cuts photo sizes by half or more; PNG stays lossless. Processed images also come out with
        their metadata removed, as a side effect of how browsers encode them.
      </PageHeader>

      <Dropzone
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        label="Drop images here"
        hint="JPEG, PNG, WebP and more — as many as you like"
        onFiles={addFiles}
      />

      <div className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
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
            <option value="png">PNG — lossless, supports transparency</option>
          </select>
        </div>
        <div>
          <label htmlFor="max-dimension" className={labelClass}>
            Resize
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
        <div>
          <label htmlFor="quality" className={labelClass}>
            Quality: {quality}% <span className="font-normal text-zinc-500">(JPEG / WebP)</span>
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
              <p className="ml-auto text-sm" role="status">
                {formatBytes(totals.before)} → {formatBytes(totals.after)} (
                <strong>{savingsPercent(totals.before, totals.after)}% saved</strong>)
              </p>
            )}
          </div>

          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <img
                  src={job.previewUrl}
                  alt={`Preview of ${job.file.name}`}
                  className="h-12 w-12 shrink-0 rounded-md border border-zinc-200 object-cover dark:border-zinc-700"
                  loading="lazy"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{job.file.name}</span>
                <span className="text-zinc-500">
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
                      className="h-12 w-12 shrink-0 rounded-md border border-teal-200 object-cover dark:border-teal-800"
                      loading="lazy"
                    />
                    <span>
                      → {job.result.width} × {job.result.height} ·{" "}
                      {formatBytes(job.result.blob.size)} (
                      {savingsPercent(job.file.size, job.result.blob.size)}% saved)
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline dark:text-teal-300"
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
