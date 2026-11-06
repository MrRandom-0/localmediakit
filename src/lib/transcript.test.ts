import { describe, expect, it } from "vitest";
import { chunksToCues, chunksToSrt, chunksToText } from "./transcript";

const CHUNKS = [
  { text: " Hello world. ", timestamp: [0, 1.5] as [number, number | null] },
  { text: "Second chunk.", timestamp: [1.5, 3] as [number, number | null] },
];

describe("chunksToCues", () => {
  it("converts seconds to milliseconds and trims text", () => {
    const cues = chunksToCues(CHUNKS);
    expect(cues).toEqual([
      { startMs: 0, endMs: 1500, text: "Hello world." },
      { startMs: 1500, endMs: 3000, text: "Second chunk." },
    ]);
  });

  it("gives the final chunk a fallback duration when its end is null", () => {
    const cues = chunksToCues([{ text: "Tail", timestamp: [10, null] }]);
    expect(cues[0]).toEqual({ startMs: 10_000, endMs: 12_000, text: "Tail" });
  });

  it("skips empty and timestamp-less chunks", () => {
    const cues = chunksToCues([
      { text: "   ", timestamp: [0, 1] },
      { text: "No time", timestamp: [Number.NaN, 2] },
      { text: "Kept", timestamp: [2, 3] },
    ]);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Kept");
  });
});

describe("chunksToSrt", () => {
  it("produces a valid SRT document", () => {
    expect(chunksToSrt(CHUNKS)).toBe(
      "1\n00:00:00,000 --> 00:00:01,500\nHello world.\n\n" +
        "2\n00:00:01,500 --> 00:00:03,000\nSecond chunk.\n",
    );
  });

  it("produces an empty string for no chunks", () => {
    expect(chunksToSrt([])).toBe("");
  });
});

describe("chunksToText", () => {
  it("joins trimmed chunks with newlines", () => {
    expect(chunksToText(CHUNKS)).toBe("Hello world.\nSecond chunk.");
  });
});
