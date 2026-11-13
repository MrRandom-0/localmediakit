import { Download, FileArchive, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  cardClass,
  ghostButtonClass,
  inputClass,
  labelClass,
  PageHeader,
  secondaryButtonClass,
} from "../components/ui";
import { downloadBlob, downloadText } from "../lib/download";
import { replaceExtension } from "../lib/format";
import {
  convertSubtitles,
  detectFormat,
  parseSubtitles,
  shiftCues,
  stripCueFormatting,
  toSrt,
  toVtt,
  type SubtitleFormat,
} from "../lib/subtitles";
import { buildZip } from "../lib/zip";

interface BatchEntry {
  id: number;
  name: string;
  /** File content; null when the file could not be read as subtitles. */
  content: string | null;
  cueCount: number;
}

let nextBatchId = 1;

export default function SubtitleTools() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [outputFormat, setOutputFormat] = useState<SubtitleFormat>("vtt");
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [stripTags, setStripTags] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchEntry[]>([]);

  const cues = useMemo(() => (source ? parseSubtitles(source) : []), [source]);

  const result = useMemo(() => {
    if (cues.length === 0) return "";
    let working = cues;
    if (stripTags) working = stripCueFormatting(working);
    if (shiftSeconds !== 0) working = shiftCues(working, Math.round(shiftSeconds * 1000));
    return outputFormat === "srt" ? toSrt(working) : toVtt(working);
  }, [cues, stripTags, shiftSeconds, outputFormat]);

  async function loadFiles(files: File[]) {
    if (files.length === 0) return;
    setLoadError(null);
    // Every dropped file joins the batch list; the first readable one also
    // loads into the editor below, as before.
    const entries: BatchEntry[] = [];
    let editorLoaded = false;
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseSubtitles(text);
        entries.push({
          id: nextBatchId++,
          name: file.name,
          content: parsed.length > 0 ? text : null,
          cueCount: parsed.length,
        });
        if (parsed.length > 0 && !editorLoaded) {
          editorLoaded = true;
          setSource(text);
          setFileName(file.name);
          // The natural conversion is to the *other* format.
          setOutputFormat(detectFormat(text, file.name) === "srt" ? "vtt" : "srt");
        }
      } catch {
        entries.push({ id: nextBatchId++, name: file.name, content: null, cueCount: 0 });
      }
    }
    const readable = entries.filter((entry) => entry.content !== null);
    if (readable.length === 0) {
      setLoadError(
        "No subtitle cues were found in those files. Check they are real .srt or .vtt files.",
      );
    }
    setBatch((prev) => [...prev, ...entries]);
  }

  function download() {
    if (!result || !fileName) return;
    downloadText(result, replaceExtension(fileName, outputFormat), "text/plain");
  }

  // Batch results follow the same settings as the single-file editor —
  // one pipeline (convertSubtitles), applied per file.
  const batchResults = useMemo(
    () =>
      batch.map((entry) => ({
        entry,
        converted:
          entry.content !== null
            ? convertSubtitles(entry.content, {
                outputFormat,
                shiftMs: Math.round(shiftSeconds * 1000),
                strip: stripTags,
              })
            : null,
      })),
    [batch, outputFormat, shiftSeconds, stripTags],
  );

  const downloadableBatch = batchResults.filter((item) => item.converted !== null);

  async function downloadBatchZip() {
    const entries = downloadableBatch.flatMap((item) =>
      item.converted
        ? [
            {
              name: replaceExtension(item.entry.name, outputFormat),
              blob: new Blob([item.converted.output], { type: "text/plain;charset=utf-8" }),
            },
          ]
        : [],
    );
    if (entries.length === 0) return;
    const blob = await buildZip(entries);
    downloadBlob(blob, "localmediakit-subtitles.zip");
  }

  return (
    <div>
      <PageHeader title="Subtitle Tools">
        Convert between SRT (the format most players and editors use) and WebVTT (the format web
        players need), fix captions that drift out of sync, and remove formatting tags — one file at
        a time or a whole season in a batch — all by editing the text locally, never uploading it.
      </PageHeader>

      <Dropzone
        accept=".srt,.vtt,text/plain"
        multiple
        label="Drop subtitle files here"
        hint=".srt or .vtt — drop several to convert them as a batch"
        onFiles={loadFiles}
      />
      {loadError && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </p>
      )}

      <div className="mt-6">
        <label htmlFor="source" className={labelClass}>
          …or paste subtitle text
        </label>
        <textarea
          id="source"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            if (!fileName) setFileName("subtitles.srt");
          }}
          rows={8}
          spellCheck={false}
          placeholder={"1\n00:00:01,000 --> 00:00:03,000\nHello!"}
          className={`${inputClass} font-mono`}
        />
      </div>

      {cues.length > 0 && (
        <p role="status" className="mt-2 text-sm text-zinc-600 tabular-nums dark:text-zinc-400">
          {cues.length} cue{cues.length === 1 ? "" : "s"} loaded from {fileName}.
        </p>
      )}

      <div className={`${cardClass} mt-6 grid gap-4 p-6 sm:grid-cols-3`}>
        <div>
          <label htmlFor="output-format" className={labelClass}>
            Output format
          </label>
          <select
            id="output-format"
            className={inputClass}
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value as SubtitleFormat)}
          >
            <option value="srt">SRT (.srt)</option>
            <option value="vtt">WebVTT (.vtt)</option>
          </select>
        </div>
        <div>
          <label htmlFor="shift" className={labelClass}>
            Shift timings (seconds)
          </label>
          <input
            id="shift"
            type="number"
            step={0.1}
            value={shiftSeconds}
            onChange={(event) => setShiftSeconds(Number(event.target.value))}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Positive if captions appear too early, negative if too late. Timings never go below
            zero.
          </p>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripTags}
              onChange={(event) => setStripTags(event.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
            Strip formatting tags (&lt;i&gt;, colours, positions)
          </label>
        </div>
      </div>

      {batch.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">
              Batch — {batch.length} file{batch.length === 1 ? "" : "s"}
            </h2>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={downloadBatchZip}
                disabled={downloadableBatch.length === 0}
              >
                <FileArchive className="h-4 w-4" aria-hidden />
                Download all as zip ({downloadableBatch.length})
              </button>
              <button type="button" className={secondaryButtonClass} onClick={() => setBatch([])}>
                <Trash2 className="h-4 w-4" aria-hidden /> Clear batch
              </button>
            </div>
          </div>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Every file below is converted with the settings above — change the format, shift or tag
            stripping and the whole batch updates.
          </p>
          <ul
            className={`${cardClass} divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800`}
          >
            {batchResults.map(({ entry, converted }) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
                {converted ? (
                  <>
                    <span className="text-zinc-500 tabular-nums">
                      {converted.cueCount} cue{converted.cueCount === 1 ? "" : "s"} → .
                      {outputFormat}
                    </span>
                    <button
                      type="button"
                      className={ghostButtonClass}
                      onClick={() =>
                        downloadText(
                          converted.output,
                          replaceExtension(entry.name, outputFormat),
                          "text/plain",
                        )
                      }
                    >
                      <Download className="h-4 w-4" aria-hidden /> Download
                    </button>
                  </>
                ) : (
                  <span className="text-red-700 dark:text-red-300">
                    No subtitle cues found in this file
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Result</h2>
            <button type="button" className={secondaryButtonClass} onClick={download}>
              <Download className="h-4 w-4" aria-hidden /> Download .{outputFormat}
            </button>
          </div>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-zinc-950 p-5 font-mono text-sm text-zinc-100 shadow-card dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
