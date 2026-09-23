"use client";

import { useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
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
import { MemberListEditor } from "@/components/tenants/member-list-editor";
import { useCreateTenant, useProperties } from "@/lib/queries";
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
import {
  validateMember,
  type MemberDraft,
  type MemberErrors,
} from "@/lib/members";
import type { HouseholdMember, IdType } from "@/types";

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

const STEP_COUNT = 4;

/**
 * Which react-hook-form fields each step owns, used to validate incrementally.
 * Step 3 is absent because the household members it edits live outside the
 * form — they are a list, and validated by `validateMember` instead.
 */
const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ["name", "phone", "email", "occupation", "address", "city", "state", "pincode", "idType", "idNumber"],
  2: ["propertyId", "floorId", "unitId", "rentAmount", "deposit", "leaseStart", "leaseEnd"],
  4: ["emergencyContact", "emergencyPhone"],
};

/**
 * Validates every member, collecting the ones that parse and the errors for the
 * ones that do not, so a single pass drives both the submit and the step gate.
 */
function validateMembers(drafts: MemberDraft[]): {
  ok: boolean;
  errors: MemberErrors[];
  values: Omit<HouseholdMember, "id">[];
} {
  const errors: MemberErrors[] = [];
  const values: Omit<HouseholdMember, "id">[] = [];

  drafts.forEach((draft, index) => {
    const result = validateMember(draft);
    if (result.ok) {
      errors[index] = {};
      values.push(result.value);
    } else {
      errors[index] = result.errors;
    }
  });

  return { ok: values.length === drafts.length, errors, values };
}

function StepOne({
  form,
  photo,
  photoError,
  onPhotoChange,
}: {
  form: UseFormReturn<FormValues>;
  photo: File | null;
  photoError?: string;
  onPhotoChange: (file: File | null, reason: string | null) => void;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-600">
        Primary Tenant — Personal Information
      </p>
      <p className="-mt-2 text-xs text-slate-400">
        This is the person on the lease. Anyone else living with them is added in
        step 3.
      </p>

      <PhotoPicker
        file={photo}
        error={photoError}
        onPick={onPhotoChange}
        onClear={() => onPhotoChange(null, null)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}

function StepTwo({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
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

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-600">
        Property &amp; Unit Assignment
      </p>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Monthly Rent (₹)" htmlFor="t-rent" error={errors.rentAmount?.message}>
          <Input id="t-rent" type="number" placeholder="18000" {...register("rentAmount")} />
        </Field>

        <Field label="Security Deposit (₹)" htmlFor="t-deposit" error={errors.deposit?.message}>
          <Input id="t-deposit" type="number" placeholder="54000" {...register("deposit")} />
        </Field>

        <Field label="Lease Start" htmlFor="t-start" error={errors.leaseStart?.message}>
          <Input id="t-start" type="date" {...register("leaseStart")} />
        </Field>

        <Field label="Lease End" htmlFor="t-end" error={errors.leaseEnd?.message}>
          <Input id="t-end" type="date" {...register("leaseEnd")} />
        </Field>
      </div>
    </div>
  );
}

function StepThree({
  members,
  errors,
  onMembersChange,
}: {
  members: MemberDraft[];
  errors: MemberErrors[];
  onMembersChange: (next: MemberDraft[]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-600">Household Members</p>
        <p className="mt-1 text-xs text-slate-400">
          Optional. Record everyone else who will occupy the unit and how they
          relate to the primary tenant.
        </p>
      </div>

      <MemberListEditor
        members={members}
        errors={errors}
        onChange={onMembersChange}
      />
    </div>
  );
}

function StepFour({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = form;

  const documentSlots = [
    { label: "Rental Agreement", icon: "📄", required: true },
    { label: "ID Proof (Aadhaar/PAN/Passport)", icon: "🪪", required: true },
    { label: "Police Verification Form", icon: "🔒", required: false },
    { label: "Cheque / Payment Screenshot", icon: "💳", required: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-600">Emergency Contact</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <p className="pt-2 text-sm font-medium text-slate-600">Documents</p>
      <div className="space-y-3">
        {documentSlots.map((doc) => (
          <div
            key={doc.label}
            className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4"
          >
            <span className="text-2xl" aria-hidden>
              {doc.icon}
            </span>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800">{doc.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                {doc.required ? "Required" : "Optional"} · Upload arrives with the
                backend
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AddTenantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  // Members are a list of sub-records, which react-hook-form models awkwardly,
  // so they are kept beside the form and validated on their own.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [memberErrors, setMemberErrors] = useState<MemberErrors[]>([]);
  const createTenant = useCreateTenant();

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

  const reset = () => {
    form.reset();
    setPhoto(null);
    setPhotoError(undefined);
    setMembers([]);
    setMemberErrors([]);
    setStep(1);
  };

  // Only advance once the current step's own fields pass validation.
  const next = async () => {
    if (step === 3) {
      const result = validateMembers(members);
      setMemberErrors(result.errors);
      if (!result.ok) return;
    } else {
      const valid = await form.trigger(STEP_FIELDS[step]);
      if (!valid) return;
    }
    setStep((s) => Math.min(STEP_COUNT, s + 1));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    // Members were checked on step 3, but a re-edit could have broken one.
    const household = validateMembers(members);
    if (!household.ok) {
      setMemberErrors(household.errors);
      setStep(3);
      return;
    }

    const parsed = schema.parse(values);
    await createTenant.mutateAsync({
      ...parsed,
      members: household.values,
      // The picker revokes its own preview, so the stored photo gets its own
      // URL. Undefined leaves the API's placeholder in place.
      photo: photo ? URL.createObjectURL(photo) : undefined,
    });
    toast.success(
      household.values.length > 0
        ? `${parsed.name} and ${household.values.length} member${household.values.length > 1 ? "s" : ""} added`
        : `${parsed.name} added`,
    );
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Add New Tenant
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add a tenant in four steps: personal details, unit assignment,
            household members, then emergency contact and documents.
          </DialogDescription>

          <div className="flex items-center gap-2" aria-hidden>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step
                    ? "w-6 bg-blue-600"
                    : s < step
                      ? "w-4 bg-blue-300"
                      : "w-4 bg-slate-200"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-slate-400">
              Step {step} of {STEP_COUNT}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {step === 1 && (
              <StepOne
                form={form}
                photo={photo}
                photoError={photoError}
                onPhotoChange={(file, reason) => {
                  setPhoto(file);
                  setPhotoError(reason ?? undefined);
                }}
              />
            )}
            {step === 2 && <StepTwo form={form} />}
            {step === 3 && (
              <StepThree
                members={members}
                errors={memberErrors}
                onMembersChange={(next) => {
                  setMembers(next);
                  // Stale messages would otherwise sit under a fixed field.
                  setMemberErrors([]);
                }}
              />
            )}
            {step === 4 && <StepFour form={form} />}
          </div>

          <div className="mt-4 flex gap-3 border-t border-slate-200 pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}

            {step < STEP_COUNT ? (
              <Button type="button" className="flex-1" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={createTenant.isPending}
              >
                {createTenant.isPending ? "Adding…" : "Add Tenant"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
