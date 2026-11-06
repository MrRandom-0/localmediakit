// Turning Whisper's chunked output into something downloadable.
// Pure helpers — the model itself lives in transcriber.ts, loaded lazily.

import { formatTimestamp, type Cue } from "./subtitles";

/** One timestamped chunk as returned by Whisper-style pipelines. */
export interface TranscriptChunk {
  text: string;
  /** [startSeconds, endSeconds]; the end can be null on the final chunk. */
  timestamp: [number, number | null];
}

/** Whisper chunks -> subtitle cues. Bad/empty chunks are skipped. */
export function chunksToCues(chunks: TranscriptChunk[]): Cue[] {
  const cues: Cue[] = [];
  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const [start, end] = chunk.timestamp;
    if (typeof start !== "number" || Number.isNaN(start)) continue;
    const startMs = Math.round(start * 1000);
    // A missing end time happens on the last chunk; give it a readable length.
    const endMs = typeof end === "number" && end > start ? Math.round(end * 1000) : startMs + 2000;
    cues.push({ startMs, endMs, text });
  }
  return cues;
}

/** Whisper chunks -> a complete SRT file. */
export function chunksToSrt(chunks: TranscriptChunk[]): string {
  const cues = chunksToCues(chunks);
  return (
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${formatTimestamp(cue.startMs, "srt")} --> ${formatTimestamp(cue.endMs, "srt")}\n${cue.text}`,
      )
      .join("\n\n") + (cues.length > 0 ? "\n" : "")
  );
}

/** Whisper chunks -> plain transcript text, one chunk per line. */
export function chunksToText(chunks: TranscriptChunk[]): string {
  return chunks
    .map((chunk) => chunk.text.trim())
    .filter(Boolean)
    .join("\n");
}
