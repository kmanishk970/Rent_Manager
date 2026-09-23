"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { useDeleteDocument, useDocuments } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import {
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_TONES,
} from "@/lib/documents";
import type { DocumentType } from "@/types";

export default function DocumentsPage() {
  const [search, setSearch] = useQueryState("q", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [typeFilter, setTypeFilter] = useQueryState("type", {
    defaultValue: "all",
    clearOnDefault: true,
  });
  const [showUpload, setShowUpload] = useState(false);

  const { data: documents, isPending } = useDocuments();
  const deleteDocument = useDeleteDocument();

  if (isPending || !documents) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(term) ||
      (doc.tenantName?.toLowerCase().includes(term) ?? false) ||
      (doc.propertyName?.toLowerCase().includes(term) ?? false);
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const presentTypes = Array.from(new Set(documents.map((d) => d.type)));

  const handleDelete = async (id: string, name: string) => {
    await deleteDocument.mutateAsync(id);
    toast.success(`Deleted “${name}”`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Documents
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {documents.length} documents in your repository
          </p>
        </div>

        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Plus className="size-4" strokeWidth={2.5} />
          Upload Document
        </Button>
      </div>

      {/* Type filters */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["all", ...presentTypes] as const).map((type) => {
          const count =
            type === "all"
              ? documents.length
              : documents.filter((d) => d.type === type).length;
          const active = typeFilter === type;

          return (
            <button
              key={type}
              type="button"
              aria-pressed={active}
              onClick={() => setTypeFilter(type)}
              className={`rounded-xl border p-3 text-left transition-all ${
                active
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <div className="mb-1 text-lg" aria-hidden>
                {type === "all"
                  ? "📂"
                  : DOCUMENT_TYPE_ICONS[type as DocumentType]}
              </div>
              <div className="text-base font-bold text-slate-900">{count}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {type === "all"
                  ? "All Documents"
                  : DOCUMENT_TYPE_LABELS[type as DocumentType]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Search documents..."
          aria-label="Search documents"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <div className="mb-3 text-4xl" aria-hidden>
            📭
          </div>
          <p className="text-sm text-slate-500">No documents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-all hover:border-blue-200 hover:shadow-card-hover"
            >
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl transition-colors group-hover:bg-blue-50"
                >
                  {DOCUMENT_TYPE_ICONS[doc.type]}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm leading-tight font-semibold text-slate-900">
                    {doc.name}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_TYPE_TONES[doc.type]}`}
                    >
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-400">
                    {doc.tenantName && <div>Tenant: {doc.tenantName}</div>}
                    {doc.propertyName && <div>Property: {doc.propertyName}</div>}
                    {doc.fileName && doc.fileName !== doc.name && (
                      <div className="truncate">File: {doc.fileName}</div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <span>{doc.size}</span>
                      <span>·</span>
                      <span>{formatDate(doc.uploadDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <a
                  href={doc.previewUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!doc.previewUrl}
                  title={
                    doc.previewUrl
                      ? `Open ${doc.fileName ?? doc.name}`
                      : "No file attached to this record"
                  }
                  onClick={(e) => {
                    if (!doc.previewUrl) e.preventDefault();
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
                    doc.previewUrl
                      ? "text-blue-600 hover:bg-blue-50"
                      : "cursor-not-allowed text-slate-300"
                  }`}
                >
                  View
                </a>
                <a
                  href={doc.previewUrl ?? undefined}
                  download={doc.fileName ?? doc.name}
                  aria-disabled={!doc.previewUrl}
                  onClick={(e) => {
                    if (!doc.previewUrl) e.preventDefault();
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
                    doc.previewUrl
                      ? "text-slate-600 hover:bg-slate-50"
                      : "cursor-not-allowed text-slate-300"
                  }`}
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id, doc.name)}
                  disabled={deleteDocument.isPending}
                  className="flex-1 rounded-lg py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDocumentDialog open={showUpload} onOpenChange={setShowUpload} />
    </div>
  );
}
