"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, UploadCloud, X } from "lucide-react";

/** What the dialog accepts, kept in one place for the input and the check. */
export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp";
export const MAX_BYTES = 20 * 1024 * 1024;

/** "2.4 MB" — sized to the unit that reads naturally. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Why a file was rejected, or null when it is fine. */
export function rejectionReason(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "Only PDF, JPG, PNG or WEBP files can be attached";
  }
  if (file.size > MAX_BYTES) {
    return `That file is ${formatBytes(file.size)} — the limit is 20 MB`;
  }
  if (file.size === 0) return "That file is empty";
  return null;
}

/**
 * Picks one file, by clicking or by dropping onto the area.
 *
 * The drop target is a label wrapping a real file input rather than a div with
 * a click handler, so the keyboard and screen readers get the native control
 * for free.
 */
export function FilePicker({
  file,
  error,
  onPick,
  onClear,
}: {
  file: File | null;
  error?: string;
  /** Called with a valid file, or with the reason it was rejected. */
  onPick: (file: File | null, reason: string | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = (picked: File | undefined) => {
    if (!picked) return;
    const reason = rejectionReason(picked);
    onPick(reason ? null : picked, reason);
  };

  if (file) {
    const isImage = file.type.startsWith("image/");

    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
          {isImage ? (
            <ImageIcon className="size-5 text-blue-600" strokeWidth={1.5} />
          ) : (
            <FileText className="size-5 text-blue-600" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-800">
            {file.name}
          </div>
          <div className="text-xs text-slate-400">
            {formatBytes(file.size)}
            {file.type && ` · ${file.type.split("/")[1]?.toUpperCase()}`}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClear();
            // Without this, re-picking the same file fires no change event.
            if (inputRef.current) inputRef.current.value = "";
          }}
          aria-label={`Remove ${file.name}`}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : error
              ? "border-red-300 bg-red-50/40 hover:border-red-400"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        }`}
      >
        <UploadCloud
          className={`mb-2 size-8 ${dragging ? "text-blue-500" : "text-slate-400"}`}
          strokeWidth={1.5}
          aria-hidden
        />
        <span className="text-sm font-medium text-slate-700">
          {dragging ? "Drop to attach" : "Choose a file or drag it here"}
        </span>
        <span className="mt-0.5 text-xs text-slate-400">
          PDF, JPG, PNG or WEBP up to 20 MB
        </span>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </label>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
