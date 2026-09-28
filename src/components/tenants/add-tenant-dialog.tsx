"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { PhotoPicker } from "@/components/form/photo-picker";
import { IdPhotos } from "@/components/documents/id-photos";
import { useUpload } from "@/lib/use-upload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { HouseholdMembersCard } from "@/components/tenants/household-members-card";
import {
  useCreateDocument,
  useCreateTenant,
  useProperties,
  useTenant,
} from "@/lib/queries";
import { apiErrorMessage } from "@/lib/api/http";
import { inrK } from "@/lib/format";
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
import type { IdType } from "@/types";

const ID_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Voter ID",
  "Driving License",
] as const;

const schema = z
  .object({
    // Step 1 — identity
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

    // Step 2 — assignment
    propertyId: z.string().min(1, "Select a property"),
    floorId: z.string().min(1, "Select a floor"),
    unitId: z.string().min(1, "Select a vacant unit"),
    rentAmount: moneyField("the monthly rent"),
    deposit: moneyField("the deposit", { min: 0 }),
    leaseStart: dateField("Lease start"),
    leaseEnd: dateField("Lease end"),

    // Step 4 — emergency contact
    emergencyContact: nameField("Emergency contact name is required"),
    emergencyPhone: mobileField("Emergency contact phone is required"),
  })
  .superRefine((data, ctx) => {
    // An ID number only means anything alongside the type it belongs to.
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
  // Stored the way the issuing authority prints it.
  .transform((data) => ({
    ...data,
    idNumber: formatIdNumber(data.idType, data.idNumber),
  }));

type FormValues = z.input<typeof schema>;



function PersonalSection({
  form,
  photo,
  photoError,
  photoProgress,
  photoCompressing,
  onPhotoChange,
  idProof,
  idProofError,
  idProofProgress,
  idProofCompressing,
  onIdProofChange,
  idBack,
  idBackError,
  idBackProgress,
  idBackCompressing,
  onIdBackChange,
}: {
  form: UseFormReturn<FormValues>;
  photo: File | null;
  photoError?: string;
  photoProgress?: number | null;
  photoCompressing?: boolean;
  onPhotoChange: (file: File | null, reason: string | null) => void;
  idProof: File | null;
  idProofError?: string;
  idProofProgress?: number | null;
  idProofCompressing?: boolean;
  onIdProofChange: (file: File | null, reason: string | null) => void;
  idBack: File | null;
  idBackError?: string;
  idBackProgress?: number | null;
  idBackCompressing?: boolean;
  onIdBackChange: (file: File | null, reason: string | null) => void;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-600">
        Primary Tenant — Personal Information
      </p>
      <p className="-mt-2 text-xs text-slate-400">
        This is the person on the lease. Anyone else living with them is added
        once the tenant is saved.
      </p>

      <PhotoPicker
        file={photo}
        error={photoError}
        progress={photoProgress}
        compressing={photoCompressing}
        onPick={onPhotoChange}
        onClear={() => onPhotoChange(null, null)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Full Name"
          htmlFor="t-name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input id="t-name" placeholder="Arjun Mehta" {...register("name")} />
        </Field>

        <Field label="Mobile Number" htmlFor="t-phone" error={errors.phone?.message}>
          <Input
            id="t-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={18}
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
        </Field>

        <Field label="Email Address" htmlFor="t-email" error={errors.email?.message}>
          <Input id="t-email" type="email" placeholder="arjun@gmail.com" {...register("email")} />
        </Field>

        <Field label="Occupation" htmlFor="t-occupation" error={errors.occupation?.message}>
          <Input id="t-occupation" placeholder="Software Engineer" {...register("occupation")} />
        </Field>

        <Field label="PIN Code" htmlFor="t-pincode" error={errors.pincode?.message}>
          <Input
            id="t-pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="560001"
            {...register("pincode")}
          />
        </Field>

        <Field
          label="Address"
          htmlFor="t-address"
          error={errors.address?.message}
          className="sm:col-span-2"
        >
          <Input id="t-address" placeholder="Street address" {...register("address")} />
        </Field>

        <Field label="City" htmlFor="t-city" error={errors.city?.message}>
          <Input id="t-city" placeholder="Bangalore" {...register("city")} />
        </Field>

        <Field label="State" htmlFor="t-state" error={errors.state?.message}>
          <Input id="t-state" placeholder="Karnataka" {...register("state")} />
        </Field>

        <Field label="ID Type" htmlFor="t-idtype">
          <Select
            value={watch("idType")}
            onValueChange={(value) => {
              setValue("idType", value as IdType);
              if (form.getValues("idNumber")) form.trigger("idNumber");
            }}
          >
            <SelectTrigger id="t-idtype" className="w-full">
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

        <Field label="ID Number" htmlFor="t-idnumber" error={errors.idNumber?.message}>
          <Input
            id="t-idnumber"
            autoComplete="off"
            {...idFieldHint(watch("idType"))}
            {...register("idNumber")}
          />
        </Field>

        <div className="sm:col-span-2">
          <IdPhotos
            label={watch("idType")}
            front={{
              file: idProof,
              error: idProofError,
              progress: idProofProgress,
              compressing: idProofCompressing,
            }}
            back={{
              file: idBack,
              error: idBackError,
              progress: idBackProgress,
              compressing: idBackCompressing,
            }}
            onFrontChange={onIdProofChange}
            onBackChange={onIdBackChange}
          />
        </div>
      </div>
    </div>
  );
}

function UnitSection({
  form,
  locked,
  onUnlock,
}: {
  form: UseFormReturn<FormValues>;
  /** The unit this was opened for, already chosen elsewhere. */
  locked?: { property: string; floor: string; unit: string };
  onUnlock: () => void;
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { data: properties } = useProperties();

  const propertyId = watch("propertyId");
  const floorId = watch("floorId");
  const unitId = watch("unitId");

  const property = properties?.find((p) => p.id === propertyId);
  const floor = property?.floors.find((f) => f.id === floorId);

  // Arriving from a unit page, the answer is already known — three selects
  // asking it again is work the person has done. It stays changeable, because
  // picking the wrong unit and having to start over would be worse.
  if (locked) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Unit</div>
            <div className="truncate text-sm font-medium text-slate-800">
              {locked.property} · {locked.floor} · Unit {locked.unit}
            </div>
          </div>
          <button
            type="button"
            onClick={onUnlock}
            className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
          >
            Change
          </button>
        </div>

        <LeaseTerms form={form} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Property" htmlFor="t-property" error={errors.propertyId?.message}>
        <Select
          value={propertyId}
          onValueChange={(value) => {
            setValue("propertyId", value ?? "", { shouldValidate: true });
            // Parent changed, so the child selections no longer apply.
            setValue("floorId", "");
            setValue("unitId", "");
          }}
        >
          <SelectTrigger id="t-property" className="w-full">
            <SelectValue placeholder="Select property...">
              {(value: string) => {
                const match = properties?.find((p) => p.id === value);
                return match ? `${match.name} — ${match.location}` : "Select property...";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(properties ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {property && (
        <Field label="Floor" htmlFor="t-floor" error={errors.floorId?.message}>
          <Select
            value={floorId}
            onValueChange={(value) => {
              setValue("floorId", value ?? "", { shouldValidate: true });
              setValue("unitId", "");
            }}
          >
            <SelectTrigger id="t-floor" className="w-full">
              <SelectValue placeholder="Select floor...">
                {(value: string) =>
                  property?.floors.find((f) => f.id === value)?.name ??
                  "Select floor..."
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {property.floors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {floor && (
        <Field label="Unit" error={errors.unitId?.message}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {floor.units.map((unit) => {
              const vacant = unit.status === "vacant";
              const selected = unitId === unit.id;

              return (
                <button
                  key={unit.id}
                  type="button"
                  disabled={!vacant}
                  onClick={() => {
                    setValue("unitId", unit.id, { shouldValidate: true });
                    // Contracted figures default from the unit itself.
                    setValue("rentAmount", unit.rent as unknown as FormValues["rentAmount"]);
                    setValue("deposit", unit.deposit as unknown as FormValues["deposit"]);
                  }}
                  className={`rounded-lg border p-3 text-sm font-medium transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : vacant
                        ? "border-green-200 bg-green-50 text-green-700 hover:border-green-400"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {unit.number}
                  <div className="mt-0.5 text-xs font-normal">
                    {vacant ? inrK(unit.rent) : "Occupied"}
                  </div>
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <LeaseTerms form={form} />
    </div>
  );
}

/** Rent, deposit and term — asked whether or not the unit was preselected. */
/**
 * The last day of a one-year term: the day before the anniversary.
 *
 * A lease starting 1 Oct 2026 runs to 30 Sep 2027, not 1 Oct — the term is a
 * year, and the anniversary belongs to the next one.
 *
 * Built on Date's overflow rather than a date library's clamping, because the
 * two disagree exactly where February does. A term from 29 Feb 2028 has no
 * anniversary: overflowing to 1 Mar and stepping back lands on 28 Feb 2029,
 * while clamping to 28 Feb first and then stepping back loses a day. Going the
 * other way — stepping back before adding the year — fixes that case and
 * breaks 1 Mar 2027, which should end on the leap day itself.
 *
 * Returns null for anything that is not a full date, which is what a
 * half-typed one looks like while somebody is still typing it.
 */
function oneYearTerm(start: string): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  if (!parts) return null;

  const end = new Date(
    Date.UTC(Number(parts[1]) + 1, Number(parts[2]) - 1, Number(parts[3])),
  );
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

function LeaseTerms({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  // What the end date was last filled in with automatically. A date the person
  // typed themselves is theirs to keep, so the suggestion only replaces one
  // that is empty or still exactly as suggested.
  const suggested = useRef<string>("");

  const startField = register("leaseStart");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Monthly Rent (₹)" htmlFor="t-rent" error={errors.rentAmount?.message}>
        <Input id="t-rent" type="number" placeholder="18000" {...register("rentAmount")} />
      </Field>

      <Field label="Security Deposit (₹)" htmlFor="t-deposit" error={errors.deposit?.message}>
        <Input id="t-deposit" type="number" placeholder="54000" {...register("deposit")} />
      </Field>

      <Field label="Lease Start" htmlFor="t-start" error={errors.leaseStart?.message}>
        <Input
          id="t-start"
          type="date"
          {...startField}
          onChange={(event) => {
            void startField.onChange(event);

            const term = oneYearTerm(event.target.value);
            if (!term) return;

            const end = getValues("leaseEnd");
            if (end && end !== suggested.current) return;

            suggested.current = term;
            setValue("leaseEnd", term, { shouldValidate: true });
          }}
        />
      </Field>

      <Field
        label="Lease End"
        htmlFor="t-end"
        error={errors.leaseEnd?.message}
        hint="Filled in as one year, change it for any other term"
      >
        <Input id="t-end" type="date" {...register("leaseEnd")} />
      </Field>
    </div>
  );
}

function EmergencySection({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-600">Emergency Contact</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Contact Name"
          htmlFor="t-emergency-name"
          error={errors.emergencyContact?.message}
        >
          <Input id="t-emergency-name" placeholder="Priya Mehta" {...register("emergencyContact")} />
        </Field>

        <Field
          label="Contact Phone"
          htmlFor="t-emergency-phone"
          error={errors.emergencyPhone?.message}
        >
          <Input id="t-emergency-phone" placeholder="+91 98765 11111" {...register("emergencyPhone")} />
        </Field>
      </div>
    </div>
  );
}

export function AddTenantDialog({
  open,
  onOpenChange,
  unitId: preselectedUnit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opened from a unit page: that unit is the assignment, already decided. */
  unitId?: string;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [idProof, setIdProof] = useState<File | null>(null);
  const [idProofError, setIdProofError] = useState<string>();
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idBackError, setIdBackError] = useState<string>();
  // Set once the tenancy exists. The dialog then stops being a form and
  // becomes the household, so more people can be added without reopening it.
  const [addedId, setAddedId] = useState<string | null>(null);
  const [unitLocked, setUnitLocked] = useState(true);

  const createTenant = useCreateTenant();
  const createDocument = useCreateDocument();
  const { data: properties } = useProperties();
  const { data: added } = useTenant(addedId ?? "");
  const {
    upload: uploadPhoto,
    cancel: cancelPhoto,
    progress: photoProgress,
    compressing: photoCompressing,
    uploading: photoUploading,
  } = useUpload("photos");
  const {
    upload: uploadIdProof,
    cancel: cancelIdProof,
    progress: idProofProgress,
    compressing: idProofCompressing,
    uploading: idProofUploading,
  } = useUpload("documents");
  const {
    upload: uploadIdBack,
    cancel: cancelIdBack,
    progress: idBackProgress,
    compressing: idBackCompressing,
    uploading: idBackUploading,
  } = useUpload("documents");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "", phone: "", email: "", occupation: "",
      address: "", city: "", state: "", pincode: "",
      idType: "Aadhaar", idNumber: "",
      propertyId: "", floorId: "", unitId: "",
      rentAmount: "" as unknown as number,
      deposit: "" as unknown as number,
      leaseStart: "", leaseEnd: "",
      emergencyContact: "", emergencyPhone: "",
    },
  });

  /**
   * Where the preselected unit sits, once the property tree has loaded.
   *
   * A unit id on its own is not enough to fill the form — the lease needs the
   * property and floor it belongs to, and the person needs to see which unit
   * they are letting rather than a UUID.
   */
  const placed = useMemo(() => {
    if (!preselectedUnit || !properties) return null;
    for (const property of properties) {
      for (const floor of property.floors) {
        const unit = floor.units.find((u) => u.id === preselectedUnit);
        if (unit) return { property, floor, unit };
      }
    }
    return null;
  }, [preselectedUnit, properties]);

  // Fill the assignment in as soon as it is known, including the rent and
  // deposit the unit already carries.
  useEffect(() => {
    if (!open || !placed) return;
    form.setValue("propertyId", placed.property.id);
    form.setValue("floorId", placed.floor.id);
    form.setValue("unitId", placed.unit.id);
    form.setValue("rentAmount", placed.unit.rent as unknown as FormValues["rentAmount"]);
    form.setValue("deposit", placed.unit.deposit as unknown as FormValues["deposit"]);
  }, [open, placed, form]);

  const reset = () => {
    cancelPhoto();
    cancelIdProof();
    cancelIdBack();
    form.reset();
    setPhoto(null);
    setPhotoError(undefined);
    setIdProof(null);
    setIdProofError(undefined);
    setIdBack(null);
    setIdBackError(undefined);
    setAddedId(null);
    setUnitLocked(true);
  };

  const busy =
    photoCompressing ||
    photoUploading ||
    idProofCompressing ||
    idProofUploading ||
    idBackCompressing ||
    idBackUploading ||
    createTenant.isPending ||
    createDocument.isPending;

  const onSubmit = form.handleSubmit(
    async (values) => {
      const parsed = schema.parse(values);

      // Both files go up before the tenancy is created, so every record is
      // saved with a URL already known to work. A failed upload stops here
      // rather than filing a tenant against a file that never arrived.
      let uploaded;
      if (photo) {
        uploaded = await uploadPhoto(photo);
        if (!uploaded) return;
      }

      let idProofMedia;
      if (idProof) {
        idProofMedia = await uploadIdProof(idProof);
        if (!idProofMedia) return;
      }

      let idBackMedia;
      if (idBack) {
        idBackMedia = await uploadIdBack(idBack);
        if (!idBackMedia) return;
      }

      let tenant;
      try {
        tenant = await createTenant.mutateAsync({ ...parsed, photo: uploaded });
      } catch (error) {
        // Without this the rejection goes nowhere: the dialog stays open, the
        // button un-presses, and the person is left to guess. A unit already
        // let, an ID already on file — the API says so, so repeat it.
        toast.error(apiErrorMessage(error, "Could not add that tenant"));
        return;
      }

      // The ID photo is filed against the tenancy, which only has an id now
      // that it exists. Failing here must not undo a tenant who was added
      // correctly — the file is stored, so the worst case is a document to
      // attach by hand, and saying so beats losing the tenant.
      if (idProofMedia) {
        try {
          await createDocument.mutateAsync({
            name: `${parsed.idType} — ${parsed.name}`,
            type: "id-proof",
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            file: idProofMedia,
            back: idBackMedia,
          });
        } catch (error) {
          toast.error(
            apiErrorMessage(
              error,
              `${parsed.name} was added, but the ${parsed.idType} photo could not be filed. Attach it from Documents.`,
            ),
          );
        }
      }

      toast.success(`${parsed.name} added`);
      setAddedId(tenant.id);
    },

    // Every field is on screen now, so react-hook-form focuses the first bad
    // one; this only says that something is wrong, for anyone who missed it.
    () => toast.error("Check the highlighted fields"),
  );

  const close = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            {addedId ? `${added?.name ?? "Tenant"} added` : "Add New Tenant"}
          </DialogTitle>
          <DialogDescription>
            {addedId
              ? "Add anyone else living with them, or close when you are done."
              : "Personal details, the unit they are taking, and their ID."}
          </DialogDescription>
        </DialogHeader>

        {addedId ? (
          <>
            {added ? (
              <HouseholdMembersCard tenant={added} />
            ) : (
              <Skeleton className="h-48 rounded-xl" />
            )}
            <div className="flex justify-end">
              <Button type="button" onClick={close}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="space-y-5">
              <PersonalSection
                form={form}
                photo={photo}
                photoError={photoError}
                photoProgress={photoProgress}
                photoCompressing={photoCompressing}
                onPhotoChange={(file, reason) => {
                  setPhoto(file);
                  setPhotoError(reason ?? undefined);
                }}
                idProof={idProof}
                idProofError={idProofError}
                idProofProgress={idProofProgress}
                idProofCompressing={idProofCompressing}
                onIdProofChange={(file, reason) => {
                  setIdProof(file);
                  setIdProofError(reason ?? undefined);
                }}
                idBack={idBack}
                idBackError={idBackError}
                idBackProgress={idBackProgress}
                idBackCompressing={idBackCompressing}
                onIdBackChange={(file, reason) => {
                  setIdBack(file);
                  setIdBackError(reason ?? undefined);
                }}
              />

              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm font-medium text-slate-600">
                  Unit &amp; Lease
                </p>
                <UnitSection
                  form={form}
                  locked={
                    placed && unitLocked
                      ? {
                          property: placed.property.name,
                          floor: placed.floor.name,
                          unit: placed.unit.number,
                        }
                      : undefined
                  }
                  onUnlock={() => setUnitLocked(false)}
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <EmergencySection form={form} />
              </div>
            </div>

            {/* Submit alone: the dialog's own ✕ already backs out, and a
                Cancel beside it only halves the target for the one action
                anybody opened this to take. */}
            <div className="sticky bottom-0 -mx-4 mt-5 border-t border-slate-200 bg-popover px-4 pt-3 pb-1">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={busy}
              >
                {photoCompressing || idProofCompressing || idBackCompressing
                  ? "Compressing…"
                  : photoUploading
                    ? `Uploading photo… ${photoProgress ?? 0}%`
                    : idProofUploading || idBackUploading
                      ? `Uploading ID… ${idProofProgress ?? idBackProgress ?? 0}%`
                      : createTenant.isPending || createDocument.isPending
                        ? "Adding…"
                        : "Add Tenant"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
