// Thin execution wrapper around ffmpeg.wasm.
//
// Everything testable (which arguments to run) lives in ffmpegArgs.ts. This
// file only: lazily loads the wasm core the first time a job runs, feeds it
// one input file, runs one command, and hands back the output as a Blob.

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
// The core is bundled from node_modules and served from our own origin —
// no CDN — which is both a privacy choice and what makes self-hosting work.
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * ffmpeg.wasm needs SharedArrayBuffer, which browsers only allow on
 * cross-origin-isolated pages (COOP/COEP headers — see vite.config.ts,
 * nginx.conf and public/_headers). The UI checks this before offering jobs.
 */
export function isCrossOriginIsolated(): boolean {
  return typeof window !== "undefined" && window.crossOriginIsolated === true;
}

async function loadFfmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (!loadPromise) {
    const instance = new FFmpeg();
    if (onLog) instance.on("log", ({ message }) => onLog(message));
    loadPromise = instance
      .load({ coreURL: coreURL as string, wasmURL: wasmURL as string })
      .then(() => {
        ffmpeg = instance;
        return instance;
      })
      .catch((error: unknown) => {
        // Let a later retry start from scratch instead of reusing a failure.
        loadPromise = null;
        throw error;
      });
  }
  return loadPromise;
}

export interface RunJobOptions {
  inputFile: File;
  args: string[];
  outputName: string;
  outputMime: string;
  /** 0–100, from ffmpeg's own progress events. */
  onProgress?: (percent: number) => void;
  onLog?: (message: string) => void;
}

/** Run one ffmpeg command on one file and return the output blob. */
export async function runFfmpegJob(options: RunJobOptions): Promise<Blob> {
  const instance = await loadFfmpeg(options.onLog);

  const progressHandler = ({ progress }: { progress: number }) => {
    options.onProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
  };
  instance.on("progress", progressHandler);

  // Input name inside ffmpeg's in-memory filesystem is taken from the final
  // argument layout: our builders always receive the input name they were
  // given, so we write the file under the first "-i" argument's value.
  const inputIndex = options.args.indexOf("-i");
  const inputName = inputIndex >= 0 ? options.args[inputIndex + 1] : options.inputFile.name;

  try {
    await instance.writeFile(inputName, await fetchFile(options.inputFile));
    const exitCode = await instance.exec(options.args);
    if (exitCode !== 0) {
      throw new Error(
        "ffmpeg could not process this file. It may be corrupt, or use a codec the web version does not support.",
      );
    }
    const data = await instance.readFile(options.outputName);
    if (typeof data === "string") {
      throw new Error("ffmpeg returned text where media was expected.");
    }
    // Copy into a plain ArrayBuffer-backed view so Blob accepts the type.
    const bytes = new Uint8Array(data.length);
    bytes.set(data);
    return new Blob([bytes.buffer], { type: options.outputMime });
  } finally {
    instance.off("progress", progressHandler);
    // Clean the virtual filesystem so the next job starts empty and large
    // files don't pile up in memory.
    await instance.deleteFile(inputName).catch(() => undefined);
    await instance.deleteFile(options.outputName).catch(() => undefined);
  }
}
