import { describe, expect, it } from "vitest";
import {
  buildCompressArgs,
  buildConvertArgs,
  buildExtractAudioArgs,
  buildGifArgs,
  buildTrimArgs,
  outputFileName,
  secondsArg,
} from "./ffmpegArgs";

describe("secondsArg", () => {
  it("formats plain seconds", () => {
    expect(secondsArg(0)).toBe("0");
    expect(secondsArg(12.5)).toBe("12.5");
    expect(secondsArg(12.3456)).toBe("12.346");
  });

  it("rejects negative and non-finite values", () => {
    expect(() => secondsArg(-1)).toThrow();
    expect(() => secondsArg(Number.NaN)).toThrow();
    expect(() => secondsArg(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("buildConvertArgs", () => {
  it("builds an MP4 job with faststart", () => {
    const args = buildConvertArgs({ inputName: "in.mov", outputName: "out.mp4", format: "mp4" });
    expect(args[0]).toBe("-i");
    expect(args).toContain("libx264");
    expect(args).toContain("+faststart");
    expect(args[args.length - 1]).toBe("out.mp4");
  });

  it("builds a WebM job with VP9/Opus", () => {
    const args = buildConvertArgs({ inputName: "in.mp4", outputName: "out.webm", format: "webm" });
    expect(args).toContain("libvpx-vp9");
    expect(args).toContain("libopus");
    expect(args).not.toContain("+faststart");
  });
});

describe("buildCompressArgs", () => {
  it("defaults to CRF 28", () => {
    const args = buildCompressArgs({ inputName: "in.mp4", outputName: "out.mp4" });
    expect(args).toContain("28");
  });

  it("adds a scale filter only when a max width is given", () => {
    const withCap = buildCompressArgs({ inputName: "in.mp4", outputName: "o.mp4", maxWidth: 1280 });
    expect(withCap.join(" ")).toContain("scale='min(1280,iw)':-2");
    const without = buildCompressArgs({ inputName: "in.mp4", outputName: "o.mp4" });
    expect(without).not.toContain("-vf");
  });

  it("rejects out-of-range CRF", () => {
    expect(() => buildCompressArgs({ inputName: "i", outputName: "o", crf: 99 })).toThrow();
  });
});

describe("buildGifArgs", () => {
  it("uses palette generation for decent colours", () => {
    const args = buildGifArgs({ inputName: "in.mp4", outputName: "out.gif" });
    const joined = args.join(" ");
    expect(joined).toContain("palettegen");
    expect(joined).toContain("paletteuse");
    expect(joined).toContain("fps=12");
    expect(joined).toContain("scale=480:-1");
  });

  it("honours width/fps and adds seek/duration when given", () => {
    const args = buildGifArgs({
      inputName: "in.mp4",
      outputName: "out.gif",
      width: 320,
      fps: 10,
      startSeconds: 5,
      durationSeconds: 3,
    });
    expect(args.slice(0, 2)).toEqual(["-ss", "5"]);
    expect(args).toContain("-t");
    expect(args.join(" ")).toContain("fps=10");
  });

  it("rejects silly dimensions", () => {
    expect(() => buildGifArgs({ inputName: "i", outputName: "o", width: 4 })).toThrow();
    expect(() => buildGifArgs({ inputName: "i", outputName: "o", fps: 0 })).toThrow();
  });
});

describe("buildExtractAudioArgs", () => {
  it("builds MP3 extraction without video", () => {
    const args = buildExtractAudioArgs({
      inputName: "in.mp4",
      outputName: "out.mp3",
      format: "mp3",
    });
    expect(args).toContain("-vn");
    expect(args).toContain("libmp3lame");
  });

  it("builds WAV extraction with PCM", () => {
    const args = buildExtractAudioArgs({
      inputName: "in.mp4",
      outputName: "out.wav",
      format: "wav",
    });
    expect(args).toContain("pcm_s16le");
  });
});

describe("buildTrimArgs", () => {
  it("seeks, then limits duration to end - start", () => {
    const args = buildTrimArgs({
      inputName: "in.mp4",
      outputName: "out.mp4",
      startSeconds: 10,
      endSeconds: 25,
    });
    expect(args.slice(0, 4)).toEqual(["-ss", "10", "-i", "in.mp4"]);
    const tIndex = args.indexOf("-t");
    expect(args[tIndex + 1]).toBe("15");
  });

  it("adds faststart only for MP4 outputs", () => {
    const mp4 = buildTrimArgs({
      inputName: "i.mp4",
      outputName: "o.mp4",
      startSeconds: 0,
      endSeconds: 5,
    });
    const webm = buildTrimArgs({
      inputName: "i.mp4",
      outputName: "o.webm",
      startSeconds: 0,
      endSeconds: 5,
    });
    expect(mp4).toContain("+faststart");
    expect(webm).not.toContain("+faststart");
  });

  it("rejects end <= start", () => {
    expect(() =>
      buildTrimArgs({ inputName: "i", outputName: "o", startSeconds: 5, endSeconds: 5 }),
    ).toThrow();
    expect(() =>
      buildTrimArgs({ inputName: "i", outputName: "o", startSeconds: 6, endSeconds: 5 }),
    ).toThrow();
  });
});

describe("outputFileName", () => {
  it("builds a suffixed name with the new extension", () => {
    expect(outputFileName("clip.mov", "converted", "mp4")).toBe("clip-converted.mp4");
  });

  it("sanitises characters ffmpeg's filesystem dislikes", () => {
    expect(outputFileName("my clip (final).mp4", "trimmed", "mp4")).toBe(
      "my-clip-final-trimmed.mp4",
    );
  });

  it("handles names without an extension", () => {
    expect(outputFileName("recording", "audio", "mp3")).toBe("recording-audio.mp3");
  });
});
