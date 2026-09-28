"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/format";

export { formatBytes };

/**
 * What the dialog accepts, kept in one place for the input and the check.
 *
 * Images only — an agreement is photographed or scanned rather than attached
 * as a PDF. This matches the API, which refuses anything else.
 */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp";

/**
 * What may be *picked*, which is not what gets sent.
 *
 * Generous on purpose: a photo straight off a phone is several megabytes, and
 * it is re-encoded to a fraction of that before it leaves the browser. The
 * API's own 20 MB ceiling applies to what actually arrives.
 */
export const MAX_BYTES = 25 * 1024 * 1024;

/** Why a file was rejected, or null when it is fine. */
export function rejectionReason(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "Only JPG, PNG or WEBP images can be attached";
  }
  if (file.size > MAX_BYTES) {
    return `That image is ${formatBytes(file.size)} — the limit is 25 MB`;
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
  progress,
  compressing,
  storedUrl,
  onPick,
  onClear,
}: {
  file: File | null;
  error?: string;
  /** 0–100 while the file is going up, null when it is not. */
  progress?: number | null;
  /** True while the image is being re-encoded, before the upload starts. */
  compressing?: boolean;
  /** An image already stored here, shown until a new one is picked. */
  storedUrl?: string;
  /** Called with a valid file, or with the reason it was rejected. */
  onPick: (file: File | null, reason: string | null) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Made and revoked here, so the picker never leaks an object URL. Seeing the
  // image is the only way to know the right one was picked — a file name says
  // nothing about which side of a card was photographed.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (picked: File | undefined) => {
    if (!picked) return;
    const reason = rejectionReason(picked);
    onPick(reason ? null : picked, reason);
  };

  if (file) {
    const sending = compressing || (progress !== null && progress !== undefined);

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-3">
          {preview ? (
            <Image
              src={preview}
              alt={`Preview of ${file.name}`}
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-slate-200"
              unoptimized
            />
          ) : (
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-slate-200" />
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-800">
              {file.name}
            </div>
            <div className="text-xs text-slate-400">
              {formatBytes(file.size)}
              {file.type && ` · ${file.type.split("/")[1]?.toUpperCase()}`}
            </div>
          </div>

          {/* Acting on a file mid-upload would leave the request running with
              nothing to attach it to, so both controls wait until it lands. */}
          {!sending && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label={`Replace ${file.name}`}
                title="Choose a different image"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  // Without this, re-picking the same file fires no change event.
                  if (inputRef.current) inputRef.current.value = "";
                }}
                aria-label={`Remove ${file.name}`}
                title="Remove this image"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {sending && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label={`${compressing ? "Compressing" : "Uploading"} ${file.name}`}
              aria-valuenow={progress ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className={`h-full rounded-full bg-blue-600 ${
                  compressing ? "animate-pulse" : "transition-[width] duration-200"
                }`}
                style={{ width: compressing ? "100%" : `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {compressing
                ? "Compressing…"
                : (progress ?? 0) < 100
                  ? `Uploading… ${progress}%`
                  : "Finishing up…"}
            </p>
          </div>
        )}
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
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed text-center transition-colors ${
          storedUrl ? "p-3" : "p-8"
        } ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : error
              ? "border-red-300 bg-red-50/40 hover:border-red-400"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        }`}
      >
        {storedUrl ? (
          <>
            <Image
              src={storedUrl}
              alt="The image currently on file"
              width={96}
              height={96}
              className="mb-2 h-20 w-full rounded-lg bg-white object-contain ring-1 ring-slate-200"
              unoptimized
            />
            <span className="text-xs font-medium text-slate-600">
              {dragging ? "Drop to replace" : "Click to replace"}
            </span>
          </>
        ) : (
          <>
            <UploadCloud
              className={`mb-2 size-8 ${dragging ? "text-blue-500" : "text-slate-400"}`}
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="text-sm font-medium text-slate-700">
              {dragging ? "Drop to attach" : "Choose an image or drag it here"}
            </span>
            <span className="mt-0.5 text-xs text-slate-400">
              JPG, PNG or WEBP — large photos are compressed automatically
            </span>
          </>
        )}

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
