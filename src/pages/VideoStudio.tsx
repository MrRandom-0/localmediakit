import { AlertTriangle, Download, Play } from "lucide-react";
import { useMemo, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  ErrorBox,
  inputClass,
  labelClass,
  PageHeader,
  primaryButtonClass,
  ProgressBar,
} from "../components/ui";
import { downloadBlob } from "../lib/download";
import { isCrossOriginIsolated, runFfmpegJob } from "../lib/ffmpegClient";
import {
  buildCompressArgs,
  buildConvertArgs,
  buildExtractAudioArgs,
  buildGifArgs,
  buildTrimArgs,
  outputFileName,
  type AudioOutputFormat,
  type VideoOutputFormat,
} from "../lib/ffmpegArgs";
import { fileExtension, formatBytes } from "../lib/format";

type JobKind = "convert" | "compress" | "gif" | "audio" | "trim";

const JOB_LABELS: Record<JobKind, string> = {
  convert: "Convert video",
  compress: "Compress video",
  gif: "Make a GIF",
  audio: "Extract audio",
  trim: "Trim clip",
};

interface BuiltJob {
  args: string[];
  outputName: string;
  outputMime: string;
}

/** Translate the current form state into an ffmpeg command for a given file. */
function buildJob(kind: JobKind, file: File, settings: Settings): BuiltJob {
  // ffmpeg reads the input under this exact name; keep the real extension so
  // it can detect the container from it (via the file header + name).
  const inputName = `input.${fileExtension(file.name) || "mp4"}`;

  switch (kind) {
    case "convert": {
      const outputName = outputFileName(file.name, "converted", settings.convertFormat);
      return {
        args: buildConvertArgs({ inputName, outputName, format: settings.convertFormat }),
        outputName,
        outputMime: settings.convertFormat === "mp4" ? "video/mp4" : "video/webm",
      };
    }
    case "compress": {
      const outputName = outputFileName(file.name, "compressed", "mp4");
      return {
        args: buildCompressArgs({
          inputName,
          outputName,
          maxWidth: settings.compressMaxWidth > 0 ? settings.compressMaxWidth : undefined,
        }),
        outputName,
        outputMime: "video/mp4",
      };
    }
    case "gif": {
      const outputName = outputFileName(file.name, "clip", "gif");
      return {
        args: buildGifArgs({
          inputName,
          outputName,
          width: settings.gifWidth,
          fps: settings.gifFps,
          durationSeconds: settings.gifDuration > 0 ? settings.gifDuration : undefined,
        }),
        outputName,
        outputMime: "image/gif",
      };
    }
    case "audio": {
      const outputName = outputFileName(file.name, "audio", settings.audioFormat);
      return {
        args: buildExtractAudioArgs({ inputName, outputName, format: settings.audioFormat }),
        outputName,
        outputMime: settings.audioFormat === "mp3" ? "audio/mpeg" : "audio/wav",
      };
    }
    case "trim": {
      const outputName = outputFileName(file.name, "trimmed", "mp4");
      return {
        args: buildTrimArgs({
          inputName,
          outputName,
          startSeconds: settings.trimStart,
          endSeconds: settings.trimEnd,
        }),
        outputName,
        outputMime: "video/mp4",
      };
    }
  }
}

interface Settings {
  convertFormat: VideoOutputFormat;
  compressMaxWidth: number;
  gifWidth: number;
  gifFps: number;
  gifDuration: number;
  audioFormat: AudioOutputFormat;
  trimStart: number;
  trimEnd: number;
}

const DEFAULT_SETTINGS: Settings = {
  convertFormat: "mp4",
  compressMaxWidth: 1280,
  gifWidth: 480,
  gifFps: 12,
  gifDuration: 6,
  audioFormat: "mp3",
  trimStart: 0,
  trimEnd: 10,
};

export default function VideoStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<JobKind>("convert");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);

  const isolated = useMemo(() => isCrossOriginIsolated(), []);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setStatus("Loading the video engine (first run downloads the ffmpeg core)…");
    try {
      const job = buildJob(kind, file, settings);
      const blob = await runFfmpegJob({
        inputFile: file,
        args: job.args,
        outputName: job.outputName,
        outputMime: job.outputMime,
        onProgress: (percent) => {
          setProgress(percent);
          setStatus(`Processing… ${percent}%`);
        },
      });
      setResult({ blob, name: job.outputName });
      setStatus("Done.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong processing this file.",
      );
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Video & Audio Studio">
        Real video processing — the same ffmpeg that powers most of the industry — compiled to run
        inside your browser tab. No uploads, no queues, no watermark. Larger files take longer:
        processing speed depends on your computer.
      </PageHeader>

      {!isolated && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">The video engine can't start in this context.</p>
            <p className="mt-1">
              ffmpeg in the browser needs a security feature called cross-origin isolation
              (SharedArrayBuffer). This page was served without the required COOP/COEP headers, so
              video jobs are disabled rather than crashing. The image, metadata and subtitle tools
              work fine. If you are self-hosting, check that your server sends those headers — the
              bundled nginx and Netlify configs in this repository do.
            </p>
          </div>
        </div>
      )}

      <Dropzone
        accept="video/*,audio/*"
        label="Drop a video or audio file here"
        hint="MP4, WebM, MOV, MKV, MP3, WAV and most other common formats"
        onFiles={(files) => {
          setFile(files[0] ?? null);
          setResult(null);
          setError(null);
        }}
      />

      {file && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-sm">
              <strong>{file.name}</strong> · {formatBytes(file.size)}
            </p>
            {file.type.startsWith("video/") && previewUrl ? (
              <video src={previewUrl} controls className="max-h-96 w-full rounded-lg bg-black" />
            ) : file.type.startsWith("audio/") && previewUrl ? (
              <audio src={previewUrl} controls className="w-full" />
            ) : (
              <p className="text-sm text-zinc-500">
                No preview for this format, but processing still works.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <label htmlFor="job" className={labelClass}>
              What do you want to do?
            </label>
            <select
              id="job"
              className={inputClass}
              value={kind}
              onChange={(event) => setKind(event.target.value as JobKind)}
            >
              {(Object.keys(JOB_LABELS) as JobKind[]).map((key) => (
                <option key={key} value={key}>
                  {JOB_LABELS[key]}
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-4">
              {kind === "convert" && (
                <div>
                  <label htmlFor="convert-format" className={labelClass}>
                    Output format
                  </label>
                  <select
                    id="convert-format"
                    className={inputClass}
                    value={settings.convertFormat}
                    onChange={(e) => update("convertFormat", e.target.value as VideoOutputFormat)}
                  >
                    <option value="mp4">MP4 — plays everywhere</option>
                    <option value="webm">WebM — smaller, for the web</option>
                  </select>
                </div>
              )}

              {kind === "compress" && (
                <div>
                  <label htmlFor="compress-width" className={labelClass}>
                    Maximum width
                  </label>
                  <select
                    id="compress-width"
                    className={inputClass}
                    value={settings.compressMaxWidth}
                    onChange={(e) => update("compressMaxWidth", Number(e.target.value))}
                  >
                    <option value={0}>Keep original width</option>
                    <option value={1920}>1920 px (Full HD)</option>
                    <option value={1280}>1280 px (HD)</option>
                    <option value={854}>854 px (SD — much smaller)</option>
                  </select>
                  <p className="mt-1 text-xs text-zinc-500">
                    Quality is set to a strong-but-fair CRF 28 preset.
                  </p>
                </div>
              )}

              {kind === "gif" && (
                <>
                  <div>
                    <label htmlFor="gif-width" className={labelClass}>
                      Width: {settings.gifWidth}px
                    </label>
                    <input
                      id="gif-width"
                      type="range"
                      min={160}
                      max={1024}
                      step={16}
                      value={settings.gifWidth}
                      onChange={(e) => update("gifWidth", Number(e.target.value))}
                      className="w-full accent-teal-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="gif-fps" className={labelClass}>
                      Frames per second: {settings.gifFps}
                    </label>
                    <input
                      id="gif-fps"
                      type="range"
                      min={5}
                      max={24}
                      value={settings.gifFps}
                      onChange={(e) => update("gifFps", Number(e.target.value))}
                      className="w-full accent-teal-700"
                    />
                  </div>
                  <div>
                    <label htmlFor="gif-duration" className={labelClass}>
                      Use the first N seconds (0 = whole video — careful, GIFs get huge)
                    </label>
                    <input
                      id="gif-duration"
                      type="number"
                      min={0}
                      max={120}
                      value={settings.gifDuration}
                      onChange={(e) => update("gifDuration", Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              {kind === "audio" && (
                <div>
                  <label htmlFor="audio-format" className={labelClass}>
                    Audio format
                  </label>
                  <select
                    id="audio-format"
                    className={inputClass}
                    value={settings.audioFormat}
                    onChange={(e) => update("audioFormat", e.target.value as AudioOutputFormat)}
                  >
                    <option value="mp3">MP3 — small, plays everywhere</option>
                    <option value="wav">WAV — uncompressed</option>
                  </select>
                </div>
              )}

              {kind === "trim" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="trim-start" className={labelClass}>
                      Start (seconds)
                    </label>
                    <input
                      id="trim-start"
                      type="number"
                      min={0}
                      step={0.1}
                      value={settings.trimStart}
                      onChange={(e) => update("trimStart", Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="trim-end" className={labelClass}>
                      End (seconds)
                    </label>
                    <input
                      id="trim-end"
                      type="number"
                      min={0}
                      step={0.1}
                      value={settings.trimEnd}
                      onChange={(e) => update("trimEnd", Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <p className="col-span-2 text-xs text-zinc-500">
                    Output is MP4, re-encoded so the cut lands exactly where you asked (stream
                    copies can drift to the nearest keyframe).
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`${primaryButtonClass} mt-5 w-full justify-center`}
              onClick={run}
              disabled={busy || !isolated}
            >
              <Play className="h-4 w-4" aria-hidden />
              {busy ? "Processing…" : JOB_LABELS[kind]}
            </button>

            {busy && (
              <div className="mt-4">
                <ProgressBar percent={progress} label="Processing progress" />
              </div>
            )}
            {status && !busy && (
              <p role="status" className="mt-3 text-sm">
                {status}
              </p>
            )}
            {error && (
              <div className="mt-3">
                <ErrorBox message={error} />
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-md bg-teal-50 px-4 py-3 text-sm dark:bg-teal-950">
                <p>
                  <strong>{result.name}</strong> — {formatBytes(result.blob.size)}
                  {file && result.blob.size < file.size && (
                    <>
                      {" "}
                      ({Math.round(((file.size - result.blob.size) / file.size) * 100)}% smaller)
                    </>
                  )}
                </p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 font-medium text-teal-800 hover:underline dark:text-teal-200"
                  onClick={() => downloadBlob(result.blob, result.name)}
                >
                  <Download className="h-4 w-4" aria-hidden /> Download result
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
