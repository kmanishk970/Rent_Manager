"use client";

import { Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberFields } from "@/components/tenants/member-fields";
import {
  emptyMember,
  relationLabel,
  relationTone,
  type MemberDraft,
  type MemberErrors,
} from "@/lib/members";

/**
 * Edits the list of people sharing the unit with the primary tenant. Each entry
 * is a full card rather than a row, since a member carries enough detail that
 * inline editing would be cramped.
 */
export function MemberListEditor({
  members,
  errors,
  onChange,
}: {
  members: MemberDraft[];
  /** Per-member validation errors, positionally aligned with `members`. */
  errors: MemberErrors[];
  onChange: (next: MemberDraft[]) => void;
}) {
  const add = () => onChange([...members, emptyMember()]);
  const removeAt = (index: number) =>
    onChange(members.filter((_, i) => i !== index));
  const replaceAt = (index: number, next: MemberDraft) =>
    onChange(members.map((m, i) => (i === index ? next : m)));

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100">
            <Users className="size-6 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-slate-700">
            No additional members
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            The lease stays with the primary tenant. Add anyone else living in
            the unit — spouse, children, parents or a flatmate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {member.name.trim() || "New member"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${relationTone(member.relation)}`}
                  >
                    {relationLabel({
                      relation: member.relation,
                      relationNote: member.relationNote,
                    })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${member.name.trim() || `member ${index + 1}`}`}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              <MemberFields
                idPrefix={`member-${index}`}
                value={member}
                errors={errors[index]}
                onChange={(next) => replaceAt(index, next)}
              />
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={add}>
        <UserPlus className="size-4" />
        Add Member
      </Button>
    </div>
  );
}
