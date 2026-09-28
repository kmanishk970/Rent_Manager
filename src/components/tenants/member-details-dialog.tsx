"use client";

import Image from "next/image";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/lib/queries";
import { relationLabel, relationTone } from "@/lib/members";
import { DocumentCard } from "@/components/documents/document-card";
import type { HouseholdMember } from "@/types";

/** First letters of the first two words, e.g. "Priya Mehta" → "PM". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Hides everything but the last four characters of an ID number. */
function maskId(value: string): string {
  const keep = 4;
  return value
    .split("")
    .map((char, i) => (i < value.length - keep && char !== " " ? "●" : char))
    .join("");
}

/**
 * Everything on file about one member of a household.
 *
 * Their documents are filed against them rather than the tenancy, so this is
 * where they belong: on the tenant's own card they were indistinguishable from
 * the primary tenant's, and several people's ID cards read as duplicates of
 * each other.
 */
export function MemberDetailsDialog({
  open,
  onOpenChange,
  member,
  tenantName,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: HouseholdMember;
  tenantName: string;
  onEdit: () => void;
}) {
  const { data: documents } = useDocuments();
  const [showId, setShowId] = useState(false);

  const theirs = (documents ?? []).filter(
    (doc) => member.personId && doc.personId === member.personId,
  );

  const facts = [
    { label: "Relation", value: relationLabel(member) },
    { label: "Age", value: member.age === undefined ? "—" : `${member.age}` },
    { label: "Occupation", value: member.occupation || "—" },
    { label: "Phone", value: member.phone || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            {member.name}
          </DialogTitle>
          <DialogDescription>
            Living with {tenantName} as their {relationLabel(member).toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {member.photo ? (
              <Image
                src={member.photo}
                alt=""
                width={64}
                height={64}
                className="size-16 rounded-xl object-cover ring-1 ring-slate-200"
                unoptimized
              />
            ) : (
              <div
                aria-hidden
                className="flex size-16 items-center justify-center rounded-xl bg-slate-100 text-base font-semibold text-slate-500 ring-1 ring-slate-200"
              >
                {initials(member.name)}
              </div>
            )}

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${relationTone(member.relation)}`}
            >
              {relationLabel(member)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-lg bg-slate-50 p-3">
                <div className="mb-0.5 text-xs text-slate-400">{fact.label}</div>
                <div className="text-sm font-medium text-slate-800">
                  {fact.value}
                </div>
              </div>
            ))}
          </div>

          {member.idType && member.idNumber && (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div>
                <div className="text-xs text-slate-400">{member.idType}</div>
                <div className="mt-0.5 font-mono text-sm text-slate-800">
                  {showId ? member.idNumber : maskId(member.idNumber)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowId((s) => !s)}
                aria-pressed={showId}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showId ? "Hide" : "Show"}
              </button>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Documents</p>

            {theirs.length > 0 ? (
              <div className="space-y-2">
                {theirs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 py-4 text-center text-sm text-slate-400">
                Nothing on file for {member.name}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex gap-3 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
          >
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
