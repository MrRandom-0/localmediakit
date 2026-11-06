// Local speech-to-text with Whisper (via Transformers.js).
//
// This module is ONLY ever loaded through a dynamic import() from the
// Transcribe page, so the model runtime (~several MB of JS + wasm) never
// bloats the main bundle and visitors who never transcribe pay nothing.
// The model weights themselves download once, from the Hugging Face hub,
// the first time someone transcribes — after that the browser caches them.
// Nothing about the audio ever leaves the device; inference is local.

import { chunksToSrt, chunksToText, type TranscriptChunk } from "./transcript";

export interface TranscriptionResult {
  text: string;
  srt: string;
  chunks: TranscriptChunk[];
}

export type TranscribeProgress =
  | { stage: "loading-model"; message: string }
  | { stage: "decoding"; message: string }
  | { stage: "transcribing"; message: string };

const MODEL_ID = "Xenova/whisper-tiny.en";

/**
 * Decode any audio/video file to the 16 kHz mono Float32 samples Whisper
 * expects, using the browser's own audio stack.
 */
async function decodeTo16kMono(file: File): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    // Mix down to mono by averaging channels.
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      channelData.push(decoded.getChannelData(channel));
    }
    const mono = new Float32Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      let sum = 0;
      for (const channel of channelData) sum += channel[i];
      mono[i] = sum / channelData.length;
    }
    return mono;
  } finally {
    await audioContext.close();
  }
}

/** Transcribe one media file locally. First run downloads the model (~40 MB). */
export async function transcribeFile(
  file: File,
  onProgress?: (progress: TranscribeProgress) => void,
): Promise<TranscriptionResult> {
  onProgress?.({ stage: "decoding", message: "Reading the audio track…" });
  const samples = await decodeTo16kMono(file);

  onProgress?.({
    stage: "loading-model",
    message: "Loading the Whisper model (first run downloads ~40 MB, then it is cached)…",
  });
  const { pipeline, env } = await import("@xenova/transformers");
  // Models come from the hub; we never want it looking for local files.
  env.allowLocalModels = false;

  const transcriber = await pipeline("automatic-speech-recognition", MODEL_ID, {
    quantized: true,
  });

  onProgress?.({ stage: "transcribing", message: "Transcribing on this device…" });
  const output = (await transcriber(samples, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  })) as { text: string; chunks: TranscriptChunk[] };

  const chunks = output.chunks ?? [];
  await transcriber.dispose();

  return {
    text: chunksToText(chunks) || output.text.trim(),
    srt: chunksToSrt(chunks),
    chunks,
  };
}
