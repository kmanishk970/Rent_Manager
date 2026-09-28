"use client";

import Image from "next/image";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DocumentThumb } from "@/components/documents/document-thumb";
import { useDeleteDocument } from "@/lib/queries";
import { apiErrorMessage } from "@/lib/api/http";
import { formatDate } from "@/lib/format";
import type { PropertyDocument } from "@/types";

/** One side of a document, shown rather than linked to. */
function Side({
  url,
  caption,
  name,
}: {
  url: string;
  caption: string;
  name: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open the ${caption.toLowerCase()} of ${name} full size`}
      className="group/side block rounded-lg border border-slate-200 bg-white p-2 transition-colors hover:border-blue-400"
    >
      <Image
        src={url}
        alt={`${caption} of ${name}`}
        width={240}
        height={144}
        className="h-24 w-full rounded object-contain"
        unoptimized
      />
      <div className="mt-1.5 text-center text-xs font-medium text-slate-500 group-hover/side:text-blue-600">
        {caption}
      </div>
    </a>
  );
}

/**
 * A document, with its images on show.
 *
 * Both sides of an ID card are rendered rather than hidden behind "Front" and
 * "Back" links: the images are the document, and a list of names tells nobody
 * which card is which — least of all when two people in a household share one.
 */
export function DocumentCard({ doc }: { doc: PropertyDocument }) {
  const [confirming, setConfirming] = useState(false);
  const deleteDocument = useDeleteDocument();

  const remove = async () => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      // The API removes the images from storage along with the row — both
      // sides — so nothing is left that no record points at.
      toast.success(`${doc.name} deleted`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not delete that document"));
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <DocumentThumb doc={doc} size={36} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-800">
            {doc.name}
          </div>
          <div className="text-xs text-slate-400">
            {doc.size} · {formatDate(doc.uploadDate)}
          </div>
        </div>

        {confirming ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={remove}
              disabled={deleteDocument.isPending}
              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {deleteDocument.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${doc.name}`}
            title="Delete this document"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {doc.previewUrl ? (
        <div
          className={`mt-3 grid gap-2 ${doc.backUrl ? "grid-cols-2" : "grid-cols-1"}`}
        >
          <Side
            url={doc.previewUrl}
            caption={doc.backUrl ? "Front" : "Document"}
            name={doc.name}
          />
          {doc.backUrl && (
            <Side url={doc.backUrl} caption="Back" name={doc.name} />
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white py-3 text-center text-xs text-slate-400">
          No file attached to this record
        </p>
      )}
    </div>
  );
}
