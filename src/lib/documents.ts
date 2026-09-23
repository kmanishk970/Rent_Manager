import type { DocumentType } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  agreement: "Rental Agreement",
  "id-proof": "ID Proof",
  "police-verification": "Police Verification",
  "property-doc": "Property Document",
  other: "Other",
};

/**
 * Emoji glyphs come from the OS colour font, so each carries its own metrics
 * and none of them share a baseline. Always render one inside a fixed box that
 * centres it — see `DOCUMENT_ICON_BOX` — rather than letting it sit in the
 * text flow, where the differing heights drag everything around them out of
 * line.
 */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  agreement: "📄",
  "id-proof": "🪪",
  "police-verification": "🔒",
  "property-doc": "🏢",
  other: "📁",
};

export const ALL_DOCUMENTS_ICON = "📂";

/**
 * The box every document emoji sits in.
 *
 * `leading-none` with flex centring is what does the work: it drops the glyph's
 * own line box, so a tall emoji and a short one occupy identical space and the
 * content beneath them lands at the same height in every tile.
 */
export const DOCUMENT_ICON_BOX =
  "flex shrink-0 items-center justify-center rounded-lg leading-none select-none";

export const DOCUMENT_TYPE_TONES: Record<DocumentType, string> = {
  agreement: "bg-blue-100 text-blue-700",
  "id-proof": "bg-green-100 text-green-700",
  "police-verification": "bg-purple-100 text-purple-700",
  "property-doc": "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};
