"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { textField } from "@/lib/validation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
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

  const onSubmit = handleSubmit(async (values) => {
    const tenant = tenants?.find((t) => t.id === values.tenantId);
    await createDocument.mutateAsync({
      name: values.name,
      type: values.type,
      tenantId: values.tenantId || undefined,
      propertyId: tenant?.propertyId,
    });
    toast.success("Document added");
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Upload Document
          </DialogTitle>
          <DialogDescription>
            File storage isn&apos;t wired up yet — this records the metadata
            only.
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

          <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
            <UploadCloud
              className="mx-auto mb-2 size-8 text-slate-400"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-slate-700">
              File upload coming with the backend
            </p>
            <p className="mt-1 text-xs text-slate-400">
              PDF, JPG, PNG up to 20MB
            </p>
          </div>

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
