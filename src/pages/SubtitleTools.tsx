import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  cardClass,
  inputClass,
  labelClass,
  PageHeader,
  secondaryButtonClass,
} from "../components/ui";
import { downloadText } from "../lib/download";
import { replaceExtension } from "../lib/format";
import {
  detectFormat,
  parseSubtitles,
  shiftCues,
  stripCueFormatting,
  toSrt,
  toVtt,
  type SubtitleFormat,
} from "../lib/subtitles";

export default function SubtitleTools() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [outputFormat, setOutputFormat] = useState<SubtitleFormat>("vtt");
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [stripTags, setStripTags] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const cues = useMemo(() => (source ? parseSubtitles(source) : []), [source]);

  const result = useMemo(() => {
    if (cues.length === 0) return "";
    let working = cues;
    if (stripTags) working = stripCueFormatting(working);
    if (shiftSeconds !== 0) working = shiftCues(working, Math.round(shiftSeconds * 1000));
    return outputFormat === "srt" ? toSrt(working) : toVtt(working);
  }, [cues, stripTags, shiftSeconds, outputFormat]);

  async function loadFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setLoadError(null);
    try {
      const text = await file.text();
      const parsed = parseSubtitles(text);
      if (parsed.length === 0) {
        setLoadError(
          "No subtitle cues were found in that file. Check it is a real .srt or .vtt file.",
        );
        return;
      }
      setSource(text);
      setFileName(file.name);
      // The natural conversion is to the *other* format.
      setOutputFormat(detectFormat(text, file.name) === "srt" ? "vtt" : "srt");
    } catch {
      setLoadError("That file could not be read as text.");
    }
  }

  function download() {
    if (!result || !fileName) return;
    downloadText(result, replaceExtension(fileName, outputFormat), "text/plain");
  }

  return (
    <div>
      <PageHeader title="Subtitle Tools">
        Convert between SRT (the format most players and editors use) and WebVTT (the format web
        players need), fix captions that drift out of sync, and remove formatting tags — all by
        editing the text locally, never uploading it.
      </PageHeader>

      <Dropzone
        accept=".srt,.vtt,text/plain"
        label="Drop a subtitle file here"
        hint=".srt or .vtt"
        onFiles={loadFile}
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
