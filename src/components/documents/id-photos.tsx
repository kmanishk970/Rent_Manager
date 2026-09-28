"use client";

import { FilePicker } from "@/components/documents/file-picker";

/**
 * The two sides of an ID card.
 *
 * An Aadhaar or a driving licence carries the number on one side and the
 * address on the other, so both get photographed. They belong to one document
 * rather than two: filed separately, a tenant's list reads as duplicates of
 * the same title with nothing saying which image is which.
 *
 * The back is optional throughout — a PAN card or a passport page has nothing
 * worth keeping on the reverse.
 */
export interface IdPhotoState {
  file: File | null;
  error?: string;
  /** 0–100 while going up, null when not. */
  progress?: number | null;
  compressing?: boolean;
  /** Already stored, shown as "replacing" rather than "adding". */
  storedUrl?: string;
}

export function IdPhotos({
  label,
  front,
  back,
  onFrontChange,
  onBackChange,
}: {
  /** What the ID is — "Aadhaar", "PAN". Names both sides. */
  label: string;
  front: IdPhotoState;
  back: IdPhotoState;
  onFrontChange: (file: File | null, reason: string | null) => void;
  onBackChange: (file: File | null, reason: string | null) => void;
}) {
  const sides: {
    key: string;
    caption: string;
    state: IdPhotoState;
    onChange: (file: File | null, reason: string | null) => void;
  }[] = [
    { key: "front", caption: "Front", state: front, onChange: onFrontChange },
    { key: "back", caption: "Back (optional)", state: back, onChange: onBackChange },
  ];

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-sm font-medium text-slate-700">
          {label} photo
        </span>
        <span className="text-xs text-slate-400">
          Front and back, if it has one
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sides.map((side) => (
          <div key={side.key}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-500">
                {side.caption}
              </span>
              {side.state.storedUrl && !side.state.file && (
                <a
                  href={side.state.storedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Full size
                </a>
              )}
            </div>

            <FilePicker
              file={side.state.file}
              error={side.state.error}
              progress={side.state.progress}
              compressing={side.state.compressing}
              storedUrl={side.state.storedUrl}
              onPick={side.onChange}
              onClear={() => side.onChange(null, null)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
