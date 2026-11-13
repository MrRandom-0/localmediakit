import { ShieldCheck, Wrench } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/images", label: "Images" },
  { to: "/metadata", label: "Metadata" },
  { to: "/video", label: "Video & Audio" },
  { to: "/subtitles", label: "Subtitles" },
  { to: "/transcribe", label: "Transcribe" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
    isActive
      ? "bg-teal-700/10 text-teal-800 dark:bg-teal-400/10 dark:text-teal-200"
      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100",
  ].join(" ");
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-pop">
              <Wrench className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              Local<span className="text-teal-700 dark:text-teal-300">MediaKit</span>
            </span>
          </Link>
          <nav aria-label="Tools" className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <p className="ml-auto hidden items-center gap-1.5 rounded-full border border-teal-700/20 bg-teal-50 px-3 py-1 text-[13px] font-medium text-teal-800 md:inline-flex dark:border-teal-400/20 dark:bg-teal-950 dark:text-teal-200">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Your files never leave this device
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
              </span>
              LocalMediaKit
            </span>
            <span className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden />
              Your files never leave this device — there is no server to send them to.
            </span>
            <span className="ml-auto text-sm text-zinc-600 dark:text-zinc-400">
              MIT licensed · Built for the open web ·{" "}
              <a
                href="https://www.netlify.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-teal-700 hover:underline dark:text-teal-300"
              >
                Deployed on Netlify
              </a>
            </span>
          </div>
          <nav
            aria-label="Tools"
            className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-zinc-100 pt-5 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-500"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition hover:text-teal-700 dark:hover:text-teal-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
