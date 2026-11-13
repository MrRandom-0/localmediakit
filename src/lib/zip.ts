// Bundling several result files into one zip download.
//
// Browsers block or throttle a pile of simultaneous downloads, so every
// "download all" in the app goes through here. JSZip is loaded lazily —
// only people who actually download a bundle pay for its bytes.

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/**
 * Make a list of file names unique by suffixing duplicates before the
 * extension: ["a.jpg", "a.jpg", "a.jpg"] -> ["a.jpg", "a-2.jpg", "a-3.jpg"].
 * Two inputs can legitimately share a name (the same photo from two
 * folders); inside a zip, a repeated name would silently overwrite.
 */
export function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((original) => {
    let name = original;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    let counter = 2;
    while (used.has(name)) {
      name = `${base}-${counter}${extension}`;
      counter++;
    }
    used.add(name);
    return name;
  });
}

/** Pack entries into a single zip Blob, de-duplicating names on the way in. */
export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const names = uniqueNames(entries.map((entry) => entry.name));
  entries.forEach((entry, index) => {
    zip.file(names[index], entry.blob);
  });
  return zip.generateAsync({ type: "blob" });
}
