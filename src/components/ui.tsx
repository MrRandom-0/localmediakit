import type { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-8 max-w-3xl">
      {eyebrow ? (
        <p className="mb-2 text-[13px] font-semibold tracking-widest text-teal-700 uppercase dark:text-teal-300">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-4xl font-extrabold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</p>
    </div>
  );
}

/** The standard raised surface: rounded-2xl, hairline border, soft shadow. */
export const cardClass =
  "rounded-2xl border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900";

export const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/25 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-teal-400 dark:focus:ring-teal-400/25";

export const labelClass =
  "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-pop transition hover:bg-teal-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const secondaryButtonClass =
  "inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800";

export const ghostButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 transition hover:bg-teal-700/10 hover:text-teal-800 dark:text-teal-300 dark:hover:bg-teal-400/10 dark:hover:text-teal-200";

export function BetaBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      Beta — local AI, expect mistakes
    </span>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
    >
      {message}
    </p>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span aria-hidden className="tabular-nums text-zinc-500">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
