import { describe, expect, it } from "vitest";
import { hasGps, summariseExif } from "./exif";

describe("summariseExif", () => {
  it("returns no rows for missing data", () => {
    expect(summariseExif(null)).toEqual([]);
    expect(summariseExif(undefined)).toEqual([]);
    expect(summariseExif({})).toEqual([]);
  });

  it("combines make and model into one camera row", () => {
    const rows = summariseExif({ Make: "Canon", Model: "Canon EOS R6" });
    expect(rows).toEqual([{ label: "Camera", value: "Canon EOS R6" }]);
  });

  it("joins make and model when the model does not contain the make", () => {
    const rows = summariseExif({ Make: "NIKON", Model: "Z 6" });
    expect(rows).toEqual([{ label: "Camera", value: "NIKON Z 6" }]);
  });

  it("shows a GPS row with fixed precision", () => {
    const rows = summariseExif({ latitude: 51.507351, longitude: -0.127758 });
    expect(rows).toEqual([{ label: "Location (GPS)", value: "51.507351, -0.127758" }]);
  });

  it("includes dimensions and software when present", () => {
    const rows = summariseExif({ ImageWidth: 6000, ImageHeight: 4000, Software: "Lightroom" });
    expect(rows.map((r) => r.label)).toEqual(["Dimensions in file", "Software"]);
  });

  it("formats a Date taken value", () => {
    const rows = summariseExif({ DateTimeOriginal: new Date("2024-05-01T10:30:00") });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("Taken");
    expect(rows[0].value).toContain("2024");
  });
});

describe("hasGps", () => {
  it("detects coordinates", () => {
    expect(hasGps({ latitude: 1, longitude: 2 })).toBe(true);
    expect(hasGps({ latitude: 1 })).toBe(false);
    expect(hasGps(null)).toBe(false);
  });
});
