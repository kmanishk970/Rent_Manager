"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { textField } from "@/lib/validation";
import { toast } from "sonner";
import { FilePicker, formatBytes } from "@/components/documents/file-picker";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDocument, useTenants } from "@/lib/queries";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import type { DocumentType } from "@/types";

const schema = z.object({
  name: textField("Document name", { min: 3, max: 120 }),
  type: z.enum([
    "agreement",
    "id-proof",
    "police-verification",
    "property-doc",
    "other",
  ]),
  tenantId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function UploadDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createDocument = useCreateDocument();
  const { data: tenants } = useTenants();

  // The file lives outside the form: react-hook-form would only carry a
  // FileList around, and the picker needs its own rejection message anyway.
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "agreement", tenantId: "" },
  });

  const clearFile = () => {
    setFile(null);
    setFileError(undefined);
  };

  const closeAndReset = () => {
    reset();
    clearFile();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!file) {
      setFileError("Choose a file to attach");
      return;
    }

    const tenant = tenants?.find((t) => t.id === values.tenantId);

    await createDocument.mutateAsync({
      name: values.name,
      type: values.type,
      tenantId: values.tenantId || undefined,
      propertyId: tenant?.propertyId,
      fileName: file.name,
      mimeType: file.type,
      size: formatBytes(file.size),
      // Lets the document be opened in this session. Storage is still the
      // backend's job, so it does not outlive a reload.
      previewUrl: URL.createObjectURL(file),
    });

    toast.success(`${values.name} attached`);
    closeAndReset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndReset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Attach a file and file it against a tenant. It opens from the
            documents list; permanent storage arrives with the backend.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Document Name"
            htmlFor="doc-name"
            error={errors.name?.message}
          >
            <Input
              id="doc-name"
              placeholder="e.g. Rental Agreement - Arjun Mehta"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <Field label="Document Type" htmlFor="doc-type">
            <Select
              value={watch("type")}
              onValueChange={(value) =>
                setValue("type", value as DocumentType, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="doc-type" className="w-full">
                <SelectValue>
                  {(value: DocumentType) =>
                    DOCUMENT_TYPE_LABELS[value] ?? "Select a type"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Linked Tenant (optional)" htmlFor="doc-tenant">
            <Select
              value={watch("tenantId") || "none"}
              onValueChange={(value) =>
                setValue("tenantId", !value || value === "none" ? "" : value)
              }
            >
              <SelectTrigger id="doc-tenant" className="w-full">
                <SelectValue placeholder="Not linked">
                  {(value: string) =>
                    tenants?.find((t) => t.id === value)?.name ?? "Not linked"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {(tenants ?? []).map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <FilePicker
            file={file}
            error={fileError}
            onPick={(picked, reason) => {
              setFile(picked);
              setFileError(reason ?? undefined);
              // Saves retyping what the file is already called.
              if (picked && !watch("name")) {
                setValue("name", picked.name.replace(/[.][^.]+$/, ""), {
                  shouldValidate: true,
                });
              }
            }}
            onClear={clearFile}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDocument.isPending}>
              {createDocument.isPending ? "Saving…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
