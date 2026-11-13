import { describe, expect, it } from "vitest";
import { buildZip, uniqueNames } from "./zip";

describe("uniqueNames", () => {
  it("leaves already-unique names untouched", () => {
    expect(uniqueNames(["a.jpg", "b.png", "c.webp"])).toEqual(["a.jpg", "b.png", "c.webp"]);
  });

  it("suffixes duplicates before the extension", () => {
    expect(uniqueNames(["a.jpg", "a.jpg", "a.jpg"])).toEqual(["a.jpg", "a-2.jpg", "a-3.jpg"]);
  });

  it("handles names without an extension", () => {
    expect(uniqueNames(["notes", "notes"])).toEqual(["notes", "notes-2"]);
  });

  it("does not collide with a name that already carries the suffix", () => {
    expect(uniqueNames(["a.jpg", "a-2.jpg", "a.jpg"])).toEqual(["a.jpg", "a-2.jpg", "a-3.jpg"]);
  });

  it("only de-duplicates exact matches", () => {
    expect(uniqueNames(["A.jpg", "a.jpg"])).toEqual(["A.jpg", "a.jpg"]);
  });
});

describe("buildZip", () => {
  it("produces a real zip containing every entry", async () => {
    const blob = await buildZip([
      { name: "one.txt", blob: new Blob(["hello"], { type: "text/plain" }) },
      { name: "one.txt", blob: new Blob(["world"], { type: "text/plain" }) },
    ]);
    expect(blob.type).toBe("application/zip");
    // PK\x03\x04 — the local-file-header signature every zip starts with.
    const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    expect(Array.from(header)).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(["one-2.txt", "one.txt"]);
    expect(await zip.file("one.txt")?.async("string")).toBe("hello");
    expect(await zip.file("one-2.txt")?.async("string")).toBe("world");
  });
});
