import {
  ArrowRight,
  Captions,
  Cpu,
  FileAudio,
  Image,
  Mic,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";

const TOOLS = [
  {
    to: "/images",
    icon: Image,
    name: "Image Studio",
    description:
      "Compress, convert and resize batches of photos. Shrink a 6 MB phone photo to something you can actually email — without uploading it to a stranger's server.",
    wide: true,
  },
  {
    to: "/metadata",
    icon: ShieldCheck,
    name: "Metadata Stripper",
    description:
      "See exactly what your photos reveal — camera, date, and GPS location — then remove all of it before you share them anywhere.",
    wide: false,
  },
  {
    to: "/video",
    icon: FileAudio,
    name: "Video & Audio Studio",
    description:
      "Convert MP4/WebM, make GIFs, pull the audio out of a video, trim clips and compress big recordings. Powered by ffmpeg, running entirely in this tab.",
    wide: false,
  },
  {
    to: "/subtitles",
    icon: Captions,
    name: "Subtitle Tools",
    description:
      "Convert SRT ↔ VTT, shift timings that are out of sync, and strip formatting tags. The small jobs caption files always need.",
    wide: false,
  },
  {
    to: "/transcribe",
    icon: Mic,
    name: "Transcribe",
    badge: "Beta",
    description:
      "Turn speech into a transcript and a subtitle file with a Whisper model that runs on your own machine. English, offline after the first download.",
    wide: false,
  },
];

const STATS = [
  { value: "5", label: "tools, one tab" },
  { value: "0", label: "files uploaded" },
  { value: "0", label: "sign-ups or tracking" },
  { value: "100%", label: "open source (MIT)" },
];

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "There is no upload endpoint to trust — the processing happens in this tab, on your machine, and the network tab proves it.",
  },
  {
    icon: Cpu,
    title: "Your device does the work",
    text: "Modern browsers run real engines locally: canvas for images, ffmpeg for video, Whisper for speech. Fast, and free to run.",
  },
  {
    icon: WifiOff,
    title: "Nothing leaves, nothing lingers",
    text: "Close the tab and everything is gone. No copies of your family photos or recordings sitting on a server you know nothing about.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="dot-grid relative -mx-4 px-4 pt-6 pb-14 sm:-mx-6 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-teal-700/20 bg-teal-50 py-1 pr-3.5 pl-3 text-[13px] font-medium text-teal-800 dark:border-teal-400/25 dark:bg-teal-950 dark:text-teal-200">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            100% private — files never leave your device
          </p>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-balance sm:text-6xl">
            Media tools that <span className="text-teal-700 dark:text-teal-300">never upload</span>{" "}
            your files.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            LocalMediaKit is a free, private alternative to Kapwing and the online converter sites.
            Compress, convert, trim and subtitle media <strong>100% in your browser</strong> — the
            processing happens on your device, so there is nothing to sign up for, no file-size
            upsell, and no copy of your files sitting on someone else's server.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/images"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-pop transition hover:bg-teal-800 active:scale-[0.98]"
            >
              Start with Image Studio
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/metadata"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-100 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              See what your photos reveal
            </Link>
          </div>
          <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="order-2 mt-1 block text-[13px] text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </dt>
                <dd className="text-2xl font-extrabold tracking-tight tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-label="Tools" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            className={`group rounded-2xl border border-zinc-200 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:border-teal-600/50 hover:shadow-lift dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-400/40 ${
              tool.wide ? "lg:col-span-2" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 transition group-hover:bg-teal-700 group-hover:text-white dark:bg-teal-400/10 dark:text-teal-300 dark:group-hover:bg-teal-400 dark:group-hover:text-teal-950">
                <tool.icon className="h-5.5 w-5.5" aria-hidden />
              </span>
              {tool.badge ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  {tool.badge}
                </span>
              ) : null}
            </div>
            <h2 className="mt-4 flex items-center gap-1.5 text-lg font-semibold tracking-tight">
              {tool.name}
              <ArrowRight
                className="h-4 w-4 -translate-x-1 text-teal-700 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 dark:text-teal-300"
                aria-hidden
              />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {tool.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-16">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Why local matters</h2>
          <p className="mt-3 leading-relaxed text-zinc-600 dark:text-zinc-400">
            Online converters ask you to upload family photos, work recordings and half-finished
            videos, then process them on machines you know nothing about. LocalMediaKit flips that
            around: modern browsers are fast enough to do this work themselves, so your files stay
            where they belong. You can verify all of this — the source code is open.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div
              key={principle.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                <principle.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-3.5 font-semibold tracking-tight">{principle.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {principle.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
