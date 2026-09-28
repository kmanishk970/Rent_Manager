"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { PhotoPicker } from "@/components/form/photo-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useUpdateTenant } from "@/lib/queries";
import { useUpload } from "@/lib/use-upload";
import { apiErrorMessage } from "@/lib/api/http";
import {
  checkIdNumber,
  dateField,
  emailField,
  formatIdNumber,
  idFieldHint,
  mobileField,
  moneyField,
  nameField,
  pincodeField,
  textField,
} from "@/lib/validation";
import type { IdType, Tenant } from "@/types";

const ID_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Voter ID",
  "Driving License",
] as const;

/**
 * The same rules the add form uses, minus the unit.
 *
 * Moving a tenancy to another unit is refused by the API — that is a new lease
 * with its own rent history, not an edit — so it is not offered here.
 */
const schema = z
  .object({
    name: nameField(),
    phone: mobileField(),
    email: emailField(),
    occupation: textField("Occupation"),
    address: textField("Address", { min: 5, max: 160 }),
    city: textField("City"),
    state: textField("State"),
    pincode: pincodeField(),
    idType: z.enum(ID_TYPES),
    idNumber: z.string().trim().min(1, "ID number is required"),
    rentAmount: moneyField("the monthly rent"),
    deposit: moneyField("the deposit", { min: 0 }),
    leaseStart: dateField("Lease start"),
    leaseEnd: dateField("Lease end"),
    emergencyContact: nameField("Emergency contact name is required"),
    emergencyPhone: mobileField("Emergency contact phone is required"),
  })
  .superRefine((data, ctx) => {
    const id = checkIdNumber(data.idType, data.idNumber);
    if (!id.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idNumber"],
        message: id.message,
      });
    }

    if (data.leaseEnd <= data.leaseStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["leaseEnd"],
        message: "Lease end must be after the start date",
      });
    }
  })
  .transform((data) => ({
    ...data,
    idNumber: formatIdNumber(data.idType, data.idNumber),
  }));

type FormValues = z.input<typeof schema>;

/** The tenant as the form holds it. */
function valuesFrom(tenant: Tenant): FormValues {
  return {
    name: tenant.name,
    phone: tenant.phone,
    email: tenant.email,
    occupation: tenant.occupation,
    address: tenant.address,
    city: tenant.city,
    state: tenant.state,
    pincode: tenant.pincode,
    idType: tenant.idType,
    idNumber: tenant.idNumber,
    rentAmount: tenant.rentAmount,
    deposit: tenant.deposit,
    leaseStart: tenant.leaseStart,
    leaseEnd: tenant.leaseEnd,
    emergencyContact: tenant.emergencyContact,
    emergencyPhone: tenant.emergencyPhone,
  };
}

export function EditTenantDialog({
  open,
  onOpenChange,
  tenant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
}) {
  const updateTenant = useUpdateTenant();
  const { upload, cancel, progress, compressing, uploading } =
    useUpload("photos");

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: valuesFrom(tenant),
  });

  // Re-seed on open, so a cancelled edit leaves nothing behind, and a tenant
  // changed elsewhere is picked up rather than shown stale.
  useEffect(() => {
    if (!open) return;
    reset(valuesFrom(tenant));
    setPhoto(null);
    setPhotoError(undefined);
  }, [open, tenant, reset]);

  const busy = compressing || uploading || updateTenant.isPending;

  const onSubmit = handleSubmit(
    async (values) => {
      const parsed = schema.parse(values);

      // The photo goes up first, so the record is never pointed at a file that
      // failed to arrive.
      let uploaded;
      if (photo) {
        uploaded = await upload(photo);
        if (!uploaded) return;
      }

      try {
        await updateTenant.mutateAsync({
          id: tenant.id,
          personId: tenant.personId,
          ...parsed,
          photo: uploaded,
        });
      } catch (error) {
        toast.error(apiErrorMessage(error, "Could not save those changes"));
        return;
      }

      toast.success(`${parsed.name} updated`);
      onOpenChange(false);
    },
    () => toast.error("Check the highlighted fields"),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Edit Tenant
          </DialogTitle>
          <DialogDescription>
            Their details and the agreed terms. To move them to another unit,
            end this tenancy and start a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <div className="space-y-5">
            <div className="space-y-3">
              <PhotoPicker
                file={photo}
                currentUrl={tenant.photo}
                error={photoError}
                progress={progress}
                compressing={compressing}
                onPick={(file, reason) => {
                  setPhoto(file);
                  setPhotoError(reason ?? undefined);
                }}
                onClear={() => {
                  setPhoto(null);
                  setPhotoError(undefined);
                }}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Full Name"
                  htmlFor="e-name"
                  error={errors.name?.message}
                  className="sm:col-span-2"
                >
                  <Input id="e-name" {...register("name")} />
                </Field>

                <Field label="Mobile Number" htmlFor="e-phone" error={errors.phone?.message}>
                  <Input id="e-phone" type="tel" inputMode="tel" maxLength={18} {...register("phone")} />
                </Field>

                <Field label="Email Address" htmlFor="e-email" error={errors.email?.message}>
                  <Input id="e-email" type="email" {...register("email")} />
                </Field>

                <Field label="Occupation" htmlFor="e-occupation" error={errors.occupation?.message}>
                  <Input id="e-occupation" {...register("occupation")} />
                </Field>

                <Field label="PIN Code" htmlFor="e-pincode" error={errors.pincode?.message}>
                  <Input id="e-pincode" inputMode="numeric" maxLength={6} {...register("pincode")} />
                </Field>

                <Field
                  label="Address"
                  htmlFor="e-address"
                  error={errors.address?.message}
                  className="sm:col-span-2"
                >
                  <Input id="e-address" {...register("address")} />
                </Field>

                <Field label="City" htmlFor="e-city" error={errors.city?.message}>
                  <Input id="e-city" {...register("city")} />
                </Field>

                <Field label="State" htmlFor="e-state" error={errors.state?.message}>
                  <Input id="e-state" {...register("state")} />
                </Field>

                <Field label="ID Type" htmlFor="e-idtype">
                  <Select
                    value={watch("idType")}
                    onValueChange={(value) => {
                      setValue("idType", value as IdType);
                      if (getValues("idNumber")) void trigger("idNumber");
                    }}
                  >
                    <SelectTrigger id="e-idtype" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="ID Number" htmlFor="e-idnumber" error={errors.idNumber?.message}>
                  <Input
                    id="e-idnumber"
                    autoComplete="off"
                    {...idFieldHint(watch("idType"))}
                    {...register("idNumber")}
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-600">Lease Terms</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Monthly Rent (₹)" htmlFor="e-rent" error={errors.rentAmount?.message}>
                  <Input id="e-rent" type="number" {...register("rentAmount")} />
                </Field>

                <Field label="Security Deposit (₹)" htmlFor="e-deposit" error={errors.deposit?.message}>
                  <Input id="e-deposit" type="number" {...register("deposit")} />
                </Field>

                <Field label="Lease Start" htmlFor="e-start" error={errors.leaseStart?.message}>
                  <Input id="e-start" type="date" {...register("leaseStart")} />
                </Field>

                <Field label="Lease End" htmlFor="e-end" error={errors.leaseEnd?.message}>
                  <Input id="e-end" type="date" {...register("leaseEnd")} />
                </Field>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-600">
                Emergency Contact
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Contact Name"
                  htmlFor="e-emergency-name"
                  error={errors.emergencyContact?.message}
                >
                  <Input id="e-emergency-name" {...register("emergencyContact")} />
                </Field>

                <Field
                  label="Contact Phone"
                  htmlFor="e-emergency-phone"
                  error={errors.emergencyPhone?.message}
                >
                  <Input id="e-emergency-phone" {...register("emergencyPhone")} />
                </Field>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-5 border-t border-slate-200 bg-popover px-4 pt-3 pb-1">
            <Button type="submit" className="w-full" disabled={busy}>
              {compressing
                ? "Compressing…"
                : uploading
                  ? `Uploading photo… ${progress ?? 0}%`
                  : updateTenant.isPending
                    ? "Saving…"
                    : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
