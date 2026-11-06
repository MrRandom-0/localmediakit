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
        "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragging
          ? "border-teal-600 bg-teal-50 dark:bg-teal-950"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
      ].join(" ")}
    >
      <UploadCloud className="mx-auto h-8 w-8 text-teal-700 dark:text-teal-400" aria-hidden />
      <label htmlFor={inputId} className="mt-3 block cursor-pointer font-medium">
        {label}
      </label>
      {hint ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        or{" "}
        <span className="font-medium text-teal-700 underline dark:text-teal-300">
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
