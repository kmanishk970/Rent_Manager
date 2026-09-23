"use client";

import { useState } from "react";
import { ArrowUpDown, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { MemberDialog } from "@/components/tenants/member-dialog";
import { ChangePrimaryTenantDialog } from "@/components/tenants/change-primary-tenant-dialog";
import { useRemoveHouseholdMember } from "@/lib/queries";
import { relationLabel, relationTone } from "@/lib/members";
import type { HouseholdMember, Tenant } from "@/types";

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

function MemberRow({
  tenant,
  member,
  onEdit,
  onPromote,
}: {
  tenant: Tenant;
  member: HouseholdMember;
  onEdit: () => void;
  onPromote: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const removeMember = useRemoveHouseholdMember();

  const remove = async () => {
    await removeMember.mutateAsync({
      tenantId: tenant.id,
      memberId: member.id,
    });
    toast.success(`${member.name} removed from the household`);
  };

  // Age, occupation and ID are all optional, so the meta line is built from
  // whatever the record actually has.
  const meta = [
    member.age !== undefined ? `${member.age} yrs` : null,
    member.occupation || null,
    member.phone || null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
      <div
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
      >
        {initials(member.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {member.name}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${relationTone(member.relation)}`}
          >
            {relationLabel(member)}
          </span>
        </div>

        {meta.length > 0 && (
          <div className="mt-0.5 text-xs text-slate-500">
            {meta.join(" · ")}
          </div>
        )}

        {member.idType && member.idNumber && (
          <div className="mt-1 font-mono text-xs text-slate-400">
            {member.idType} {maskId(member.idNumber)}
          </div>
        )}
      </div>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={remove}
            disabled={removeMember.isPending}
            className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {removeMember.isPending ? "Removing…" : "Remove"}
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
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onPromote}
            aria-label={`Make ${member.name} the primary tenant`}
            title="Make primary tenant"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-amber-600"
          >
            <ArrowUpDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${member.name}`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${member.name}`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The people sharing a unit with the primary tenant, with add, edit and remove.
 * Rendered on both the tenant profile and the unit page.
 */
export function HouseholdMembersCard({ tenant }: { tenant: Tenant }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HouseholdMember | undefined>();
  const [changingPrimary, setChangingPrimary] = useState(false);
  // Set when the swap is started from a member's row rather than the header.
  const [promoting, setPromoting] = useState<string | undefined>();

  const members = tenant.members ?? [];

  const openAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (member: HouseholdMember) => {
    setEditing(member);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Household Members
          </h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {members.length}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {members.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPromoting(undefined);
                setChangingPrimary(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <ArrowUpDown className="size-3.5" />
              Change Primary
            </button>
          )}

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <UserPlus className="size-3.5" />
            Add Member
          </button>
        </div>
      </div>

      {/* The lease-holder is listed first so the hierarchy is unambiguous. */}
      <div className="mb-2.5 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
        <div
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-blue-700 ring-1 ring-blue-200"
        >
          {initials(tenant.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">
              {tenant.name}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Primary Tenant
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {[tenant.occupation, tenant.phone].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      {members.length > 0 ? (
        <div className="space-y-2.5">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              tenant={tenant}
              member={member}
              onEdit={() => openEdit(member)}
              onPromote={() => {
                setPromoting(member.id);
                setChangingPrimary(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-slate-100">
            <Users className="size-5 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-500">
            No additional members recorded.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Add a member →
          </button>
        </div>
      )}

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantId={tenant.id}
        tenantName={tenant.name}
        member={editing}
      />

      <ChangePrimaryTenantDialog
        open={changingPrimary}
        onOpenChange={setChangingPrimary}
        tenant={tenant}
        initialMemberId={promoting}
      />
    </div>
  );
}
