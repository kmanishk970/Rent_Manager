"use client";

import Image from "next/image";

import {
  DOCUMENT_ICON_BOX,
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_TYPE_TONES,
} from "@/lib/documents";
import type { PropertyDocument } from "@/types";

/**
 * The tile beside a document in a list.
 *
 * Shows the document itself where there is one to show. A row of identical
 * emoji says only what kind of paper each record claims to be; the image says
 * which card was actually photographed, which is the thing somebody scanning
 * the list is trying to tell apart.
 *
 * The coloured icon stays as the fallback, for rows that predate storage or
 * whose upload never landed.
 */
export function DocumentThumb({
  doc,
  size = 36,
}: {
  doc: PropertyDocument;
  /** Edge length in pixels. The tile is always square. */
  size?: number;
}) {
  if (doc.previewUrl) {
    return (
      <Image
        src={doc.previewUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-lg bg-white object-cover ring-1 ring-slate-200"
        unoptimized
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{ width: size, height: size }}
      className={`${DOCUMENT_ICON_BOX} text-base ${DOCUMENT_TYPE_TONES[doc.type]}`}
    >
      {DOCUMENT_TYPE_ICONS[doc.type]}
    </div>
  );
}
