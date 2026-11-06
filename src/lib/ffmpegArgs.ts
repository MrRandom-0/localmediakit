// ffmpeg command construction — pure functions, no wasm, no DOM.
//
// Why separate this from the code that runs ffmpeg? Because argument order
// and filter syntax are where video tools quietly go wrong, and a pure
// builder can be unit-tested exhaustively while the execution layer stays a
// thin wrapper around ffmpeg.wasm.

export type VideoOutputFormat = "mp4" | "webm";
export type AudioOutputFormat = "mp3" | "wav";

export interface ConvertOptions {
  inputName: string;
  outputName: string;
  format: VideoOutputFormat;
}

/** Seconds -> the "12.5" style string ffmpeg expects for -ss / -t. */
export function secondsArg(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error("Time values for ffmpeg must be zero or positive.");
  }
  // Three decimals is frame-accurate enough and keeps args tidy.
  return String(Math.round(seconds * 1000) / 1000);
}

/** Video conversion: re-encode to a web-friendly MP4 or WebM. */
export function buildConvertArgs(options: ConvertOptions): string[] {
  const { inputName, outputName, format } = options;
  if (format === "mp4") {
    return [
      "-i",
      inputName,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      // Lets browsers start playback before the whole file downloads.
      "-movflags",
      "+faststart",
      outputName,
    ];
  }
  return [
    "-i",
    inputName,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "32",
    "-c:a",
    "libopus",
    "-b:a",
    "128k",
    outputName,
  ];
}

export interface CompressOptions {
  inputName: string;
  outputName: string;
  /** H.264 CRF: 18 = near-lossless, 28 = visibly smaller. We expose 28. */
  crf?: number;
  /** Cap the width (height follows, staying even for the encoder). */
  maxWidth?: number;
}

/** "Make it smaller" preset: always MP4/H.264, the most compatible output. */
export function buildCompressArgs(options: CompressOptions): string[] {
  const crf = options.crf ?? 28;
  if (crf < 0 || crf > 51) throw new Error("CRF must be between 0 and 51.");

  const args = [
    "-i",
    options.inputName,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    String(crf),
  ];
  if (options.maxWidth && options.maxWidth > 0) {
    // scale=-2 keeps the height divisible by 2, which libx264 requires.
    args.push("-vf", `scale='min(${Math.round(options.maxWidth)},iw)':-2`);
  }
  args.push("-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", options.outputName);
  return args;
}

export interface GifOptions {
  inputName: string;
  outputName: string;
  width?: number;
  fps?: number;
  /** Optional clip window, in seconds. */
  startSeconds?: number;
  durationSeconds?: number;
}

/** Animated GIF with a generated palette — much better colours than default. */
export function buildGifArgs(options: GifOptions): string[] {
  const width = Math.round(options.width ?? 480);
  const fps = Math.round(options.fps ?? 12);
  if (width < 16 || width > 4096) throw new Error("GIF width must be 16–4096 px.");
  if (fps < 1 || fps > 50) throw new Error("GIF fps must be 1–50.");

  const args: string[] = [];
  // Seeking before -i is the fast path and is fine for GIF-length clips.
  if (options.startSeconds) args.push("-ss", secondsArg(options.startSeconds));
  args.push("-i", options.inputName);
  if (options.durationSeconds) args.push("-t", secondsArg(options.durationSeconds));

  const filters =
    `fps=${fps},scale=${width}:-1:flags=lanczos,` +
    "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse";
  args.push("-filter_complex", filters, "-loop", "0", options.outputName);
  return args;
}

export interface ExtractAudioOptions {
  inputName: string;
  outputName: string;
  format: AudioOutputFormat;
}

/** Pull the audio track out of a video (or convert an audio file). */
export function buildExtractAudioArgs(options: ExtractAudioOptions): string[] {
  const args = ["-i", options.inputName, "-vn"];
  if (options.format === "mp3") {
    args.push("-c:a", "libmp3lame", "-q:a", "2");
  } else {
    args.push("-c:a", "pcm_s16le");
  }
  args.push(options.outputName);
  return args;
}

export interface TrimOptions {
  inputName: string;
  outputName: string;
  startSeconds: number;
  endSeconds: number;
}

/**
 * Trim to [start, end). We re-encode instead of stream-copying: copies can
 * only cut on keyframes, which makes the start point drift by seconds —
 * exactly the bug users report as "it cut in the wrong place".
 */
export function buildTrimArgs(options: TrimOptions): string[] {
  if (options.endSeconds <= options.startSeconds) {
    throw new Error("End time must be after start time.");
  }
  const duration = options.endSeconds - options.startSeconds;
  const isMp4 = options.outputName.toLowerCase().endsWith(".mp4");
  const args = [
    "-ss",
    secondsArg(options.startSeconds),
    "-i",
    options.inputName,
    "-t",
    secondsArg(duration),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
  ];
  if (isMp4) args.push("-movflags", "+faststart");
  args.push(options.outputName);
  return args;
}

/** Output file name for a job: ("clip.mov", "mp4", "converted") -> "clip-converted.mp4". */
export function outputFileName(inputName: string, suffix: string, extension: string): string {
  const dot = inputName.lastIndexOf(".");
  const base = dot > 0 ? inputName.slice(0, dot) : inputName || "media";
  // ffmpeg's in-memory filesystem dislikes some characters; keep names simple.
  const safeBase = base.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "media";
  return `${safeBase}-${suffix}.${extension}`;
}
