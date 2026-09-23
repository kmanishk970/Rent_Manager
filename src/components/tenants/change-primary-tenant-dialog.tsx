"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Users } from "lucide-react";
import { Field } from "@/components/form/field";
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
import { useChangePrimaryTenant } from "@/lib/queries";
import {
  MEMBER_ID_TYPES,
  RELATIONS,
  inverseRelation,
  relationLabel,
  relationTone,
} from "@/lib/members";
import type { IdType, MemberRelation, Tenant } from "@/types";

const schema = z
  .object({
    // Identity for the member being promoted — a tenancy needs more than a
    // member record carries, so the gaps get filled in here.
    name: z.string().min(2, "Full name is required"),
    phone: z.string().min(8, "Enter a valid mobile number"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    occupation: z.string().min(2, "Occupation is required"),
    address: z.string().min(3, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code"),
    idType: z.enum(MEMBER_ID_TYPES),
    idNumber: z.string().min(4, "ID number is required"),

    // Where the outgoing primary lands in the household.
    outgoingRelation: z.enum(RELATIONS),
    outgoingRelationNote: z.string(),
  })
  .superRefine((values, ctx) => {
    if (
      values.outgoingRelation === "Other" &&
      values.outgoingRelationNote.trim().length < 2
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["outgoingRelationNote"],
        message: "Describe the relation",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

/**
 * Hands the tenancy to one of the household members.
 *
 * Picking somebody reveals the rest: the details a tenant record needs and a
 * member record did not carry, and how the outgoing primary is now related.
 */
export function ChangePrimaryTenantDialog({
  open,
  onOpenChange,
  tenant,
  initialMemberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  /** Preselects a member, for the promote shortcut on their own row. */
  initialMemberId?: string;
}) {
  const [memberId, setMemberId] = useState<string | null>(null);
  const changePrimary = useChangePrimaryTenant();
  const members = tenant.members ?? [];
  const selected = members.find((m) => m.id === memberId) ?? null;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "", phone: "", email: "", occupation: "",
      address: "", city: "", state: "", pincode: "",
      idType: "Aadhaar", idNumber: "",
      outgoingRelation: "Other", outgoingRelationNote: "",
    },
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  /** Seeds the form from the chosen member, the household and the tenancy. */
  const choose = useCallback(
    (id: string) => {
      const member = (tenant.members ?? []).find((m) => m.id === id);
      if (!member) return;

      setMemberId(id);
      const inverse = inverseRelation(member.relation);

      form.reset({
        name: member.name,
        phone: member.phone ?? "",
        email: "",
        occupation: member.occupation ?? "",
        // They share the unit, so the outgoing primary's address is theirs too.
        address: tenant.address,
        city: tenant.city,
        state: tenant.state,
        pincode: tenant.pincode,
        idType: member.idType ?? "Aadhaar",
        idNumber: member.idNumber ?? "",
        outgoingRelation: inverse.relation,
        outgoingRelationNote: inverse.relationNote,
      });
    },
    [form, tenant],
  );

  // Each opening starts fresh, on the member the caller pointed at if any.
  useEffect(() => {
    if (!open) return;
    if (initialMemberId) {
      choose(initialMemberId);
    } else {
      setMemberId(null);
      form.reset();
    }
  }, [open, initialMemberId, choose, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!memberId) return;

    await changePrimary.mutateAsync({
      tenantId: tenant.id,
      memberId,
      primary: {
        name: values.name,
        phone: values.phone,
        email: values.email,
        occupation: values.occupation,
        address: values.address,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        idType: values.idType,
        idNumber: values.idNumber,
      },
      outgoing: {
        relation: values.outgoingRelation,
        ...(values.outgoingRelation === "Other"
          ? { relationNote: values.outgoingRelationNote.trim() }
          : {}),
        // Nothing the outgoing primary had needs re-entering — it all carries.
        phone: tenant.phone,
        occupation: tenant.occupation,
        idType: tenant.idType,
        idNumber: tenant.idNumber,
      },
    });

    toast.success(`${values.name} is now the primary tenant`);
    onOpenChange(false);
  });

  const outgoingRelation = watch("outgoingRelation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Change Primary Tenant
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            The unit, lease dates, rent, deposit and payment history stay with
            this tenancy — only who it is named after changes.
          </DialogDescription>
        </DialogHeader>

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100">
              <Users className="size-6 text-slate-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-slate-700">
              No household members yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              The tenancy can only be handed to somebody already living in the
              unit. Add a member first, then change the primary tenant.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              {/* Who takes over */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">
                  Hand the tenancy to
                </p>
                {members.map((member) => {
                  const active = member.id === memberId;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => choose(member.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          active
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {active && (
                          <span className="size-1.5 rounded-full bg-white" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {member.name}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${relationTone(member.relation)}`}
                          >
                            {relationLabel(member)}
                          </span>
                        </span>
                        {(member.occupation || member.phone) && (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {[member.occupation, member.phone]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <>
                  <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <span className="truncate font-medium text-slate-500 line-through">
                      {tenant.name}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate font-semibold text-slate-900">
                      {selected.name}
                    </span>
                  </div>

                  {/* A tenancy needs more detail than a member record holds. */}
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-slate-600">
                      {selected.name}&apos;s Details
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Full Name"
                        htmlFor="cp-name"
                        error={errors.name?.message}
                        className="sm:col-span-2"
                      >
                        <Input id="cp-name" {...register("name")} />
                      </Field>

                      <Field
                        label="Mobile Number"
                        htmlFor="cp-phone"
                        error={errors.phone?.message}
                      >
                        <Input
                          id="cp-phone"
                          placeholder="+91 98765 43210"
                          {...register("phone")}
                        />
                      </Field>

                      <Field
                        label="Email Address"
                        htmlFor="cp-email"
                        error={errors.email?.message}
                      >
                        <Input
                          id="cp-email"
                          type="email"
                          placeholder="priya@gmail.com"
                          {...register("email")}
                        />
                      </Field>

                      <Field
                        label="Occupation"
                        htmlFor="cp-occupation"
                        error={errors.occupation?.message}
                      >
                        <Input
                          id="cp-occupation"
                          placeholder="Architect"
                          {...register("occupation")}
                        />
                      </Field>

                      <Field
                        label="PIN Code"
                        htmlFor="cp-pincode"
                        error={errors.pincode?.message}
                      >
                        <Input
                          id="cp-pincode"
                          inputMode="numeric"
                          {...register("pincode")}
                        />
                      </Field>

                      <Field
                        label="Address"
                        htmlFor="cp-address"
                        error={errors.address?.message}
                        className="sm:col-span-2"
                      >
                        <Input id="cp-address" {...register("address")} />
                      </Field>

                      <Field
                        label="City"
                        htmlFor="cp-city"
                        error={errors.city?.message}
                      >
                        <Input id="cp-city" {...register("city")} />
                      </Field>

                      <Field
                        label="State"
                        htmlFor="cp-state"
                        error={errors.state?.message}
                      >
                        <Input id="cp-state" {...register("state")} />
                      </Field>

                      <Field label="ID Type" htmlFor="cp-idtype">
                        <Select
                          value={watch("idType")}
                          onValueChange={(value) =>
                            setValue("idType", (value as IdType) ?? "Aadhaar", {
                              shouldValidate: true,
                            })
                          }
                        >
                          <SelectTrigger id="cp-idtype" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ID_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field
                        label="ID Number"
                        htmlFor="cp-idnumber"
                        error={errors.idNumber?.message}
                      >
                        <Input
                          id="cp-idnumber"
                          placeholder="2345 6789 0123"
                          {...register("idNumber")}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Where the outgoing primary lands. */}
                  <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        {tenant.name} stays in the household
                      </p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        Their phone, occupation and ID carry over. Pick how they
                        relate to {selected.name}.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Relation" htmlFor="cp-outgoing-relation">
                        <Select
                          value={outgoingRelation}
                          onValueChange={(value) =>
                            setValue(
                              "outgoingRelation",
                              (value as MemberRelation) ?? "Other",
                              { shouldValidate: true },
                            )
                          }
                        >
                          <SelectTrigger
                            id="cp-outgoing-relation"
                            className="w-full bg-white"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONS.map((relation) => (
                              <SelectItem key={relation} value={relation}>
                                {relation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      {outgoingRelation === "Other" && (
                        <Field
                          label="Specify Relation"
                          htmlFor="cp-outgoing-note"
                          error={errors.outgoingRelationNote?.message}
                        >
                          <Input
                            id="cp-outgoing-note"
                            className="bg-white"
                            placeholder="Parent, sibling, flatmate…"
                            {...register("outgoingRelationNote")}
                          />
                        </Field>
                      )}
                    </div>

                    {members.length > 1 && (
                      <p className="text-xs text-amber-700">
                        The other {members.length - 1} member
                        {members.length > 2 ? "s are" : " is"} still recorded
                        relative to {tenant.name}. Review their relation
                        {members.length > 2 ? "s" : ""} once the change is made.
                      </p>
                    )}
                  </div>
                </>
              )}
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
              <Button
                type="submit"
                className="flex-1"
                disabled={!selected || changePrimary.isPending}
              >
                {changePrimary.isPending ? "Updating…" : "Make Primary Tenant"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
