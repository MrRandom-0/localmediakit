import { UploadCloud } from "lucide-react";
import { useId, useState, type DragEvent } from "react";

interface DropzoneProps {
  /** Value for the file input's accept attribute, e.g. "image/*". */
  accept: string;
  multiple?: boolean;
  /** Short instruction, e.g. "Drop images here". */
  label: string;
  /** Smaller hint, e.g. "JPEG, PNG or WebP — as many as you like". */
  hint?: string;
  onFiles: (files: File[]) => void;
}

/**
 * Accessible drag-and-drop file picker. The whole area is a <label> for a
 * real file input, so keyboard and screen-reader users get the same control
 * as mouse users who drag files in.
 */
export default function Dropzone({
  accept,
  multiple = false,
  label,
  hint,
  onFiles,
}: DropzoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        "rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200",
        dragging
          ? "border-teal-600 bg-teal-50 ring-4 ring-teal-600/15 dark:border-teal-400 dark:bg-teal-950 dark:ring-teal-400/15"
          : "border-zinc-300 bg-white hover:border-teal-600/60 hover:bg-teal-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-teal-400/50 dark:hover:bg-teal-950/40",
      ].join(" ")}
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
        <UploadCloud className="h-6 w-6" aria-hidden />
      </span>
      <label htmlFor={inputId} className="mt-4 block cursor-pointer text-base font-semibold">
        {label}
      </label>
      {hint ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        or{" "}
        <span className="font-semibold text-teal-700 underline decoration-teal-600/40 underline-offset-2 dark:text-teal-300">
          browse your files
        </span>
      </p>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
