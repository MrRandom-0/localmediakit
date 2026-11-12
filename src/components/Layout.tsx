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
    "rounded-md px-3 py-2 text-sm font-medium",
    isActive
      ? "bg-teal-700 text-white"
      : "text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
  ].join(" ");
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Wrench className="h-4 w-4" aria-hidden />
            </span>
            LocalMediaKit
          </Link>
          <nav aria-label="Tools" className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <p className="ml-auto hidden items-center gap-1.5 text-sm text-teal-800 md:flex dark:text-teal-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Your files never leave this device
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 text-sm text-zinc-600 sm:px-6 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" aria-hidden />
            Your files never leave this device — there is no server to send them to.
          </span>
          <span className="ml-auto">
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
      </footer>
    </div>
  );
}
