import type { DocumentType } from "@/types";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  agreement: "Rental Agreement",
  "id-proof": "ID Proof",
  "police-verification": "Police Verification",
  "property-doc": "Property Document",
  other: "Other",
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, string> = {
  agreement: "📄",
  "id-proof": "🪪",
  "police-verification": "🔒",
  "property-doc": "🏢",
  other: "📁",
};

export const DOCUMENT_TYPE_TONES: Record<DocumentType, string> = {
  agreement: "bg-blue-100 text-blue-700",
  "id-proof": "bg-green-100 text-green-700",
  "police-verification": "bg-purple-100 text-purple-700",
  "property-doc": "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-600",
};
