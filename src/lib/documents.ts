import {
  Building2,
  FileSignature,
  FolderOpen,
  IdCard,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { DocumentType } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  agreement: "Rental Agreement",
  "id-proof": "ID Proof",
  "police-verification": "Police Verification",
  "property-doc": "Property Document",
  other: "Other",
};

/**
 * Drawn icons rather than emoji.
 *
 * Emoji render in the OS colour font, so each glyph brings its own metrics —
 * a row of them sits at mismatched sizes and baselines, and drags whatever is
 * under it out of line. These share one weight, one grid and one size.
 */
export const DOCUMENT_TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  agreement: FileSignature,
  "id-proof": IdCard,
  "police-verification": ShieldCheck,
  "property-doc": Building2,
  other: FolderOpen,
};

export const DOCUMENT_TYPE_TONES: Record<DocumentType, string> = {
  agreement: "bg-blue-100 text-blue-700",
  "id-proof": "bg-green-100 text-green-700",
  "police-verification": "bg-purple-100 text-purple-700",
  "property-doc": "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};
