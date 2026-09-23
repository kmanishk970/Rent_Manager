"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, User, X } from "lucide-react";
import { formatBytes } from "@/lib/format";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp";

/** Smaller than the document limit — this is an avatar, not an attachment. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Why a photo was rejected, or null when it is fine. */
export function photoRejectionReason(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number])) {
    return "Choose a JPG, PNG or WEBP image";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `That image is ${formatBytes(file.size)} — the limit is 5 MB`;
  }
  if (file.size === 0) return "That image is empty";
  return null;
}

/**
 * Picks a profile photo, by clicking the thumbnail or dropping onto it.
 *
 * The preview object URL is created and revoked here, so the picker never
 * leaks one; callers that need to keep the image make their own URL from the
 * file they are handed.
 */
export function PhotoPicker({
  file,
  currentUrl,
  error,
  onPick,
  onClear,
  label = "Photo",
  hint = "JPG, PNG or WEBP up to 5 MB",
}: {
  file: File | null;
  /** An already-stored photo, shown until a new one is picked. */
  currentUrl?: string;
  error?: string;
  onPick: (file: File | null, reason: string | null) => void;
  onClear: () => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
    const reason = photoRejectionReason(picked);
    onPick(reason ? null : picked, reason);
  };

  const shown = preview ?? currentUrl ?? null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
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
            aria-label={`${label}: choose an image`}
            className={`group relative flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : error
                  ? "border-red-300 bg-red-50/40"
                  : "border-slate-300 bg-slate-100 hover:border-blue-400"
            }`}
          >
            {shown ? (
              <>
                <Image
                  src={shown}
                  alt=""
                  width={64}
                  height={64}
                  className="size-full object-cover"
                  unoptimized
                />
                {/* Says the thumbnail is clickable without a second control. */}
                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/40">
                  <Camera className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </>
            ) : (
              <User className="size-7 text-slate-400" strokeWidth={1.5} />
            )}

            <input
              ref={inputRef}
              type="file"
              accept={PHOTO_ACCEPT}
              className="sr-only"
              onChange={(e) => accept(e.target.files?.[0])}
            />
          </label>

          {file && (
            <button
              type="button"
              onClick={() => {
                onClear();
                // Otherwise re-picking the same file fires no change event.
                if (inputRef.current) inputRef.current.value = "";
              }}
              aria-label="Remove photo"
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition-colors hover:text-red-600"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="min-w-0">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-slate-700">
                {file.name}
              </p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">
                {dragging ? "Drop to use this image" : "Add a photo"}
              </p>
              <p className="text-xs text-slate-400">
                Click the thumbnail or drag an image onto it. {hint}
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
