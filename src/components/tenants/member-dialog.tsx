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
import { PhotoPicker } from "@/components/form/photo-picker";
import { IdPhotos } from "@/components/documents/id-photos";
import { useUpload } from "@/lib/use-upload";
import { apiErrorMessage } from "@/lib/api/http";
import {
  useAddHouseholdMember,
  useCreateDocument,
  useDocuments,
  useUpdateDocument,
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
  const [idProof, setIdProof] = useState<File | null>(null);
  const [idProofError, setIdProofError] = useState<string>();
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idBackError, setIdBackError] = useState<string>();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();

  const addMember = useAddHouseholdMember();
  const updateMember = useUpdateHouseholdMember();
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const { data: documents } = useDocuments();

  // The ID already on file for this person, if there is one. Re-photographing
  // it replaces those images instead of filing a second identical-looking row.
  const existingId = member?.personId
    ? documents?.find(
        (d) => d.type === "id-proof" && d.personId === member.personId,
      )
    : undefined;
  const { upload, cancel, progress, compressing, uploading } =
    useUpload("documents");
  const {
    upload: uploadBack,
    cancel: cancelBack,
    progress: backProgress,
    compressing: backCompressing,
    uploading: backUploading,
  } = useUpload("documents");
  const {
    upload: uploadPhoto,
    cancel: cancelPhoto,
    progress: photoProgress,
    compressing: photoCompressing,
    uploading: photoUploading,
  } = useUpload("photos");
  const editing = Boolean(member);
  const pending =
    addMember.isPending ||
    updateMember.isPending ||
    createDocument.isPending ||
    updateDocument.isPending ||
    compressing ||
    uploading ||
    backCompressing ||
    backUploading ||
    photoCompressing ||
    photoUploading;

  // Re-seed whenever the dialog opens, so a cancelled edit leaves nothing over.
  useEffect(() => {
    if (!open) return;
    setDraft(member ? draftFromMember(member) : emptyMember());
    setErrors({});
    setIdProof(null);
    setIdProofError(undefined);
    setIdBack(null);
    setIdBackError(undefined);
    setPhoto(null);
    setPhotoError(undefined);
  }, [open, member]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = validateMember(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    // Both files go up before anything is saved, so a member is never
    // recorded alongside a file that failed to arrive.
    let photoMedia;
    if (photo) {
      photoMedia = await uploadPhoto(photo);
      if (!photoMedia) return;
    }

    let uploaded;
    if (idProof) {
      uploaded = await upload(idProof);
      if (!uploaded) return;
    }

    let uploadedBack;
    if (idBack) {
      uploadedBack = await uploadBack(idBack);
      if (!uploadedBack) return;
    }

    let personId = member?.personId;

    try {
      if (member) {
        await updateMember.mutateAsync({
          tenantId,
          memberId: member.id,
          personId: member.personId,
          ...result.value,
          photo: photoMedia,
        });
        toast.success(`${result.value.name} updated`);
      } else {
        const tenant = await addMember.mutateAsync({
          tenantId,
          ...result.value,
          photo: photoMedia,
        });
        // The mutation resolves to the whole tenancy, which is the only place
        // the new person's id appears — the member id is the occupancy.
        personId = (tenant.members ?? []).find(
          (m) => m.name === result.value.name,
        )?.personId;
        toast.success(`${result.value.name} added to ${tenantName}'s household`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not save that member"));
      return;
    }

    // Filed after the person exists, and against them specifically rather than
    // just the tenancy. A failure here is worth saying but must not read as
    // though the member was not saved, because they were.
    if (uploaded || uploadedBack) {
      const title = `${draft.idType || "ID"} — ${result.value.name}`;

      try {
        if (existingId) {
          // An edit of the ID already on file. The images it replaces are
          // deleted server-side, so nothing is orphaned in storage.
          await updateDocument.mutateAsync({
            id: existingId.id,
            name: title,
            file: uploaded,
            back: uploadedBack,
          });
        } else if (uploaded) {
          await createDocument.mutateAsync({
            name: title,
            type: "id-proof",
            tenantId,
            personId,
            file: uploaded,
            back: uploadedBack,
          });
        } else {
          // A back with no front and nothing on file: there is no document to
          // hang it on, and a record whose only image is the reverse would be
          // a puzzle to whoever opened it later.
          toast.error("Add the front of the ID as well");
        }
      } catch (error) {
        toast.error(
          apiErrorMessage(
            error,
            `${result.value.name} was saved, but their ID photo could not be filed.`,
          ),
        );
      }
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
            <div className="mb-4">
              <PhotoPicker
                file={photo}
                currentUrl={member?.photo}
                error={photoError}
                progress={photoProgress}
                compressing={photoCompressing}
                onPick={(file, reason) => {
                  setPhoto(file);
                  setPhotoError(reason ?? undefined);
                }}
                onClear={() => {
                  setPhoto(null);
                  setPhotoError(undefined);
                }}
              />
            </div>

            <MemberFields
              idPrefix="member"
              value={draft}
              errors={errors}
              onChange={(next) => {
                setDraft(next);
                setErrors({});
              }}
            />

            <div className="mt-4">
              <IdPhotos
                label={draft.idType || "ID"}
                front={{
                  file: idProof,
                  error: idProofError,
                  progress,
                  compressing,
                  storedUrl: existingId?.previewUrl,
                }}
                back={{
                  file: idBack,
                  error: idBackError,
                  progress: backProgress,
                  compressing: backCompressing,
                  storedUrl: existingId?.backUrl,
                }}
                onFrontChange={(file, reason) => {
                  setIdProof(file);
                  setIdProofError(reason ?? undefined);
                }}
                onBackChange={(file, reason) => {
                  setIdBack(file);
                  setIdBackError(reason ?? undefined);
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                cancel();
                cancelBack();
                cancelPhoto();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {compressing || photoCompressing
                ? "Compressing…"
                : photoUploading
                  ? `Uploading photo… ${photoProgress ?? 0}%`
                  : uploading || backUploading
                  ? `Uploading ID… ${progress ?? backProgress ?? 0}%`
                  : pending
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Add Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
