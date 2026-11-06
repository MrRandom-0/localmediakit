import { ArrowRight, Captions, FileAudio, Image, Mic, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const TOOLS = [
  {
    to: "/images",
    icon: Image,
    name: "Image Studio",
    description:
      "Compress, convert and resize batches of photos. Shrink a 6 MB phone photo to something you can actually email — without uploading it to a stranger's server.",
  },
  {
    to: "/metadata",
    icon: ShieldCheck,
    name: "Metadata Stripper",
    description:
      "See exactly what your photos reveal — camera, date, and GPS location — then remove all of it before you share them anywhere.",
  },
  {
    to: "/video",
    icon: FileAudio,
    name: "Video & Audio Studio",
    description:
      "Convert MP4/WebM, make GIFs, pull the audio out of a video, trim clips and compress big recordings. Powered by ffmpeg, running entirely in this tab.",
  },
  {
    to: "/subtitles",
    icon: Captions,
    name: "Subtitle Tools",
    description:
      "Convert SRT ↔ VTT, shift timings that are out of sync, and strip formatting tags. The small jobs caption files always need.",
  },
  {
    to: "/transcribe",
    icon: Mic,
    name: "Transcribe (Beta)",
    description:
      "Turn speech into a transcript and a subtitle file with a Whisper model that runs on your own machine. English, offline after the first download.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight">
          Media tools that never upload your files.
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          LocalMediaKit is a free, private alternative to Kapwing and the online converter sites.
          Compress, convert, trim and subtitle media <strong>100% in your browser</strong> — the
          processing happens on your device, so there is nothing to sign up for, no file-size
          upsell, and no copy of your files sitting on someone else's server.
        </p>
      </section>

      <section aria-label="Tools" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className="group rounded-xl border border-zinc-200 bg-white p-5 hover:border-teal-600 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <tool.icon className="h-6 w-6 text-teal-700 dark:text-teal-400" aria-hidden />
            <h2 className="mt-3 flex items-center gap-1 font-semibold">
              {tool.name}
              <ArrowRight
                className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tool.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-semibold">Why local matters</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Online converters ask you to upload family photos, work recordings and half-finished
          videos, then process them on machines you know nothing about. LocalMediaKit flips that
          around: modern browsers are fast enough to do this work themselves, so your files stay
          where they belong. Close the tab and everything is gone. You can verify all of this — the
          source code is open, and the network tab of your browser will show you no file ever
          leaves.
        </p>
      </section>
    </div>
  );
}
