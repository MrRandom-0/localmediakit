// SRT / WebVTT parsing, conversion and cleanup.
//
// Both formats are just a list of cues: an index, a start/end timestamp and
// one or more lines of text. We parse into that shared shape first, then
// serialise back out — conversion between the two formats is therefore just
// parse + serialise, and every operation (shift, strip tags) works on cues.

export interface Cue {
  /** Start time in milliseconds. */
  startMs: number;
  /** End time in milliseconds. */
  endMs: number;
  /** Caption text; may contain newlines. */
  text: string;
}

export type SubtitleFormat = "srt" | "vtt";

/** "00:01:02,500" (SRT) or "00:01:02.500" / "01:02.500" (VTT) -> milliseconds. */
export function parseTimestamp(raw: string): number | null {
  const match = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!match) return null;

  const [, hours = "0", minutes, seconds, fraction] = match;
  const millis = Number(fraction.padEnd(3, "0"));
  return Number(hours) * 3_600_000 + Number(minutes) * 60_000 + Number(seconds) * 1_000 + millis;
}

/** Milliseconds -> "00:01:02,500" for SRT or "00:01:02.500" for VTT. */
export function formatTimestamp(ms: number, format: SubtitleFormat): string {
  const safe = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const millis = safe % 1_000;
  const separator = format === "srt" ? "," : ".";
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(millis, 3)}`;
}

const TIMING_LINE = /-->/;

/**
 * Split a subtitle file into cues. Handles both SRT and VTT input (the VTT
 * header and NOTE blocks are skipped). Malformed blocks are ignored rather
 * than throwing — real-world subtitle files are messy.
 */
export function parseSubtitles(input: string): Cue[] {
  const normalised = input.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const blocks = normalised.split(/\n{2,}/);
  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) continue;
    // VTT files start with a WEBVTT header and may contain NOTE blocks.
    if (lines[0].startsWith("WEBVTT") || lines[0].startsWith("NOTE")) continue;

    const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line));
    if (timingIndex === -1) continue;

    const [startRaw, endPart] = lines[timingIndex].split("-->");
    // VTT timing lines can carry cue settings after the end time (" align:center").
    const endRaw = endPart.trim().split(/\s+/)[0];
    const startMs = parseTimestamp(startRaw);
    const endMs = parseTimestamp(endRaw);
    if (startMs === null || endMs === null) continue;

    const text = lines
      .slice(timingIndex + 1)
      .join("\n")
      .trim();
    if (!text) continue;

    cues.push({ startMs, endMs, text });
  }

  return cues;
}

/** Serialise cues as a complete SRT file. */
export function toSrt(cues: Cue[]): string {
  return (
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${formatTimestamp(cue.startMs, "srt")} --> ${formatTimestamp(cue.endMs, "srt")}\n${cue.text}`,
      )
      .join("\n\n") + (cues.length > 0 ? "\n" : "")
  );
}

/** Serialise cues as a complete WebVTT file (header included). */
export function toVtt(cues: Cue[]): string {
  const body = cues
    .map(
      (cue) =>
        `${formatTimestamp(cue.startMs, "vtt")} --> ${formatTimestamp(cue.endMs, "vtt")}\n${cue.text}`,
    )
    .join("\n\n");
  return body ? `WEBVTT\n\n${body}\n` : "WEBVTT\n";
}

/**
 * Move every cue by `offsetMs` (negative moves them earlier). Start and end
 * are clamped at zero — a cue can never begin before the video does. A cue
 * whose end would land at/before its start collapses to a 1ms cue at 0 rather
 * than producing an invalid negative-length cue.
 */
export function shiftCues(cues: Cue[], offsetMs: number): Cue[] {
  return cues.map((cue) => {
    const startMs = Math.max(0, cue.startMs + offsetMs);
    const endMs = Math.max(startMs + 1, cue.endMs + offsetMs);
    return { ...cue, startMs, endMs };
  });
}

/**
 * Remove formatting markup — HTML-style tags (<i>, <b>, <font color=...>) and
 * ASS-style override blocks ({\pos(10,20)}) — leaving the spoken words only.
 */
export function stripFormatting(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Apply stripFormatting to every cue, dropping cues that become empty. */
export function stripCueFormatting(cues: Cue[]): Cue[] {
  return cues
    .map((cue) => ({ ...cue, text: stripFormatting(cue.text) }))
    .filter((cue) => cue.text.length > 0);
}

/** Best-effort format detection from content, falling back to the file name. */
export function detectFormat(content: string, fileName = ""): SubtitleFormat {
  if (content.trimStart().startsWith("WEBVTT")) return "vtt";
  if (/\.vtt$/i.test(fileName)) return "vtt";
  return "srt";
}

export interface ConvertOptions {
  outputFormat: SubtitleFormat;
  /** Timing shift in milliseconds; may be negative. */
  shiftMs: number;
  /** Remove formatting tags from cue text. */
  strip: boolean;
}

export interface ConvertedSubtitles {
  /** The converted file content, ready to download. */
  output: string;
  /** Number of cues in the source. */
  cueCount: number;
}

/**
 * The whole Subtitle Tools pipeline — parse, optionally strip formatting,
 * optionally shift timings, serialise — as one pure function, so converting
 * one pasted file and batch-converting twenty dropped files run exactly the
 * same code. Returns null when the input contains no cues at all.
 */
export function convertSubtitles(
  content: string,
  options: ConvertOptions,
): ConvertedSubtitles | null {
  const cues = parseSubtitles(content);
  if (cues.length === 0) return null;
  let working = cues;
  if (options.strip) working = stripCueFormatting(working);
  if (options.shiftMs !== 0) working = shiftCues(working, options.shiftMs);
  return {
    output: options.outputFormat === "srt" ? toSrt(working) : toVtt(working),
    cueCount: cues.length,
  };
}
