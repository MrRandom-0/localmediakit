import { describe, expect, it } from "vitest";
import {
  detectFormat,
  formatTimestamp,
  parseSubtitles,
  parseTimestamp,
  shiftCues,
  stripCueFormatting,
  stripFormatting,
  toSrt,
  toVtt,
  type Cue,
} from "./subtitles";

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello there.

2
00:00:04,000 --> 00:00:06,000
Second line
over two rows.
`;

describe("parseTimestamp", () => {
  it("parses SRT timestamps", () => {
    expect(parseTimestamp("00:01:02,500")).toBe(62_500);
    expect(parseTimestamp("01:00:00,000")).toBe(3_600_000);
    expect(parseTimestamp("00:00:00,001")).toBe(1);
  });

  it("parses VTT timestamps with a dot and without hours", () => {
    expect(parseTimestamp("00:01:02.500")).toBe(62_500);
    expect(parseTimestamp("01:02.500")).toBe(62_500);
  });

  it("pads short fractions", () => {
    expect(parseTimestamp("00:00:01,5")).toBe(1500);
    expect(parseTimestamp("00:00:01,05")).toBe(1050);
  });

  it("returns null for garbage", () => {
    expect(parseTimestamp("not a time")).toBeNull();
    expect(parseTimestamp("00:00")).toBeNull();
    expect(parseTimestamp("")).toBeNull();
  });
});

describe("formatTimestamp", () => {
  it("formats for both formats", () => {
    expect(formatTimestamp(62_500, "srt")).toBe("00:01:02,500");
    expect(formatTimestamp(62_500, "vtt")).toBe("00:01:02.500");
    expect(formatTimestamp(3_600_000, "srt")).toBe("01:00:00,000");
  });

  it("clamps negative values to zero", () => {
    expect(formatTimestamp(-500, "srt")).toBe("00:00:00,000");
  });
});

describe("parseSubtitles", () => {
  it("parses SRT cues including multi-line text", () => {
    const cues = parseSubtitles(SAMPLE_SRT);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ startMs: 1000, endMs: 3500, text: "Hello there." });
    expect(cues[1].text).toBe("Second line\nover two rows.");
  });

  it("parses VTT, skipping the header and cue settings", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.500 align:center
Hello there.
`;
    const cues = parseSubtitles(vtt);
    expect(cues).toEqual([{ startMs: 1000, endMs: 3500, text: "Hello there." }]);
  });

  it("skips NOTE blocks and malformed cues instead of throwing", () => {
    const messy = `WEBVTT

NOTE this is a comment block

not a cue at all

3
garbage --> also garbage
Broken timing

00:00:10.000 --> 00:00:11.000
The one good cue
`;
    const cues = parseSubtitles(messy);
    expect(cues).toEqual([{ startMs: 10_000, endMs: 11_000, text: "The one good cue" }]);
  });

  it("handles CRLF line endings and a BOM", () => {
    const cues = parseSubtitles("\uFEFF1\r\n00:00:01,000 --> 00:00:02,000\r\nHi\r\n");
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Hi");
  });

  it("returns an empty list for empty input", () => {
    expect(parseSubtitles("")).toEqual([]);
    expect(parseSubtitles("   \n\n  ")).toEqual([]);
  });
});

describe("serialisers and round-trip", () => {
  it("round-trips SRT -> cues -> SRT", () => {
    expect(toSrt(parseSubtitles(SAMPLE_SRT))).toBe(SAMPLE_SRT);
  });

  it("converts SRT to VTT with header and dot separators", () => {
    const vtt = toVtt(parseSubtitles(SAMPLE_SRT));
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vtt).toContain("00:00:01.000 --> 00:00:03.500");
  });

  it("round-trips VTT -> cues -> SRT", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n";
    const srt = toSrt(parseSubtitles(vtt));
    expect(srt).toBe("1\n00:00:01,000 --> 00:00:02,000\nHi\n");
  });

  it("serialises an empty cue list", () => {
    expect(toSrt([])).toBe("");
    expect(toVtt([])).toBe("WEBVTT\n");
  });
});

describe("shiftCues", () => {
  const cues: Cue[] = [{ startMs: 5000, endMs: 7000, text: "x" }];

  it("shifts forwards and backwards", () => {
    expect(shiftCues(cues, 1500)[0]).toMatchObject({ startMs: 6500, endMs: 8500 });
    expect(shiftCues(cues, -2000)[0]).toMatchObject({ startMs: 3000, endMs: 5000 });
  });

  it("clamps at zero when shifting before the start of the video", () => {
    const shifted = shiftCues(cues, -10_000)[0];
    expect(shifted.startMs).toBe(0);
    expect(shifted.endMs).toBeGreaterThan(shifted.startMs);
  });

  it("does not mutate the original cues", () => {
    shiftCues(cues, 1000);
    expect(cues[0].startMs).toBe(5000);
  });
});

describe("stripFormatting", () => {
  it("removes HTML-style tags", () => {
    expect(stripFormatting('<i>Hello</i> <font color="#fff">world</font>')).toBe("Hello world");
  });

  it("removes ASS override blocks", () => {
    expect(stripFormatting("{\\pos(10,20)}Hello")).toBe("Hello");
  });

  it("leaves plain text alone", () => {
    expect(stripFormatting("Just words.")).toBe("Just words.");
  });

  it("drops cues that become empty", () => {
    const result = stripCueFormatting([
      { startMs: 0, endMs: 1000, text: "<i></i>" },
      { startMs: 1000, endMs: 2000, text: "<b>Kept</b>" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Kept");
  });
});

describe("detectFormat", () => {
  it("detects VTT from content or extension", () => {
    expect(detectFormat("WEBVTT\n\n...")).toBe("vtt");
    expect(detectFormat("anything", "captions.vtt")).toBe("vtt");
  });

  it("defaults to SRT", () => {
    expect(detectFormat("1\n00:00:01,000...")).toBe("srt");
  });
});
