"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MemberFields } from "@/components/tenants/member-fields";
import {
  useAddHouseholdMember,
  useUpdateHouseholdMember,
} from "@/lib/queries";
import {
  draftFromMember,
  emptyMember,
  validateMember,
  type MemberDraft,
  type MemberErrors,
} from "@/lib/members";
import type { HouseholdMember } from "@/types";

/**
 * Adds a member to an existing tenant's household, or edits one in place when
 * `member` is supplied.
 */
export function MemberDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  /** Omit to add; pass a member to edit it. */
  member?: HouseholdMember;
}) {
  const [draft, setDraft] = useState<MemberDraft>(emptyMember);
  const [errors, setErrors] = useState<MemberErrors>({});

  const addMember = useAddHouseholdMember();
  const updateMember = useUpdateHouseholdMember();
  const editing = Boolean(member);
  const pending = addMember.isPending || updateMember.isPending;

  // Re-seed whenever the dialog opens, so a cancelled edit leaves nothing over.
  useEffect(() => {
    if (!open) return;
    setDraft(member ? draftFromMember(member) : emptyMember());
    setErrors({});
  }, [open, member]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = validateMember(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    if (member) {
      await updateMember.mutateAsync({
        tenantId,
        memberId: member.id,
        ...result.value,
      });
      toast.success(`${result.value.name} updated`);
    } else {
      await addMember.mutateAsync({ tenantId, ...result.value });
      toast.success(`${result.value.name} added to ${tenantName}'s household`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            {editing ? "Edit Member" : "Add Household Member"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {editing
              ? `Update this member of ${tenantName}'s household.`
              : `Someone else living with ${tenantName}. The lease and rent stay with the primary tenant.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <MemberFields
              idPrefix="member"
              value={draft}
              errors={errors}
              onChange={(next) => {
                setDraft(next);
                setErrors({});
              }}
            />
          </div>

          <div className="mt-4 flex gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
