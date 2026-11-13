import { Download } from "lucide-react";
import { useState } from "react";
import Dropzone from "../components/Dropzone";
import {
  BetaBadge,
  ErrorBox,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from "../components/ui";
import { downloadText } from "../lib/download";
import { replaceExtension } from "../lib/format";
import type { TranscriptionResult } from "../lib/transcriber";

export default function Transcribe() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // Dynamic import on purpose: the Whisper runtime is large, and it should
      // only load for people who actually click Transcribe.
      const { transcribeFile } = await import("../lib/transcriber");
      const output = await transcribeFile(file, (progress) => setStatus(progress.message));
      setResult(output);
      setStatus("Done.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `Transcription failed: ${caught.message}`
          : "Transcription failed in this browser. A recent desktop Chrome/Edge/Firefox works best.",
      );
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Transcribe (Beta)">
        Speech-to-text with OpenAI's Whisper model, running entirely on your machine via
        Transformers.js. The model (the small, English-only <em>whisper-tiny.en</em>, about 40 MB)
        downloads once the first time you use it and is cached by your browser after that. The
        trade-off for total privacy is accuracy: this tiny model is noticeably less accurate than
        cloud services, especially with background noise, strong accents or multiple speakers. Treat
        the output as a good first draft.
      </PageHeader>

      <div className="-mt-3 mb-5">
        <BetaBadge />
      </div>

      <Dropzone
        accept="audio/*,video/*"
        label="Drop an audio or video file here"
        hint="Lectures, voice notes, interviews, meeting recordings"
        onFiles={(files) => {
          setFile(files[0] ?? null);
          setResult(null);
          setError(null);
        }}
      />

      {file && (
        <div className="mt-5">
          <p className="mb-3 text-sm">
            <strong>{file.name}</strong>
          </p>
          <button type="button" className={primaryButtonClass} onClick={run} disabled={busy}>
            {busy ? "Transcribing…" : "Transcribe on this device"}
          </button>
          {status && (
            <p role="status" className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {status}
            </p>
          )}
          {error && (
            <div className="mt-3">
              <ErrorBox message={error} />
            </div>
          )}
        </div>
      )}

      {result && file && (
        <div className="mt-6">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => downloadText(result.text, replaceExtension(file.name, "txt"))}
            >
              <Download className="h-4 w-4" aria-hidden /> Transcript (.txt)
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={!result.srt}
              onClick={() => downloadText(result.srt, replaceExtension(file.name, "srt"))}
            >
              <Download className="h-4 w-4" aria-hidden /> Subtitles (.srt)
            </button>
          </div>
          <pre className="max-h-[32rem] overflow-auto rounded-2xl bg-zinc-950 p-5 font-mono text-sm whitespace-pre-wrap text-zinc-100 shadow-card dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            {result.text}
          </pre>
        </div>
      )}
    </div>
  );
}
