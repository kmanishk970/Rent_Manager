"use client";

import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEMBER_ID_TYPES,
  RELATIONS,
  type MemberDraft,
  type MemberErrors,
} from "@/lib/members";
import type { IdType, MemberRelation } from "@/types";

/**
 * The controls for one household member. Controlled rather than wired to
 * react-hook-form, because the same group is rendered once inside the add-tenant
 * wizard's list and once on its own in the add-member dialog.
 */
export function MemberFields({
  idPrefix,
  value,
  errors,
  onChange,
}: {
  /** Prefix for input ids, so several groups can coexist on one screen. */
  idPrefix: string;
  value: MemberDraft;
  errors?: MemberErrors;
  onChange: (next: MemberDraft) => void;
}) {
  const set = <K extends keyof MemberDraft>(key: K, next: MemberDraft[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field
        label="Full Name"
        htmlFor={`${idPrefix}-name`}
        error={errors?.name}
        className={value.relation === "Other" ? undefined : "sm:col-span-2"}
      >
        <Input
          id={`${idPrefix}-name`}
          placeholder="Priya Mehta"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>

      <Field
        label="Relation to Primary Tenant"
        htmlFor={`${idPrefix}-relation`}
        error={errors?.relation}
      >
        <Select
          value={value.relation}
          onValueChange={(next) =>
            set("relation", (next as MemberRelation) ?? "Other")
          }
        >
          <SelectTrigger id={`${idPrefix}-relation`} className="w-full">
            <SelectValue placeholder="Select relation..." />
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

      {/* Only "Other" needs spelling out; the rest are self-describing. */}
      {value.relation === "Other" && (
        <Field
          label="Specify Relation"
          htmlFor={`${idPrefix}-relation-note`}
          error={errors?.relationNote}
        >
          <Input
            id={`${idPrefix}-relation-note`}
            placeholder="Cousin, colleague, caretaker…"
            value={value.relationNote}
            onChange={(e) => set("relationNote", e.target.value)}
          />
        </Field>
      )}

      <Field
        label="Mobile Number"
        htmlFor={`${idPrefix}-phone`}
        error={errors?.phone}
      >
        <Input
          id={`${idPrefix}-phone`}
          placeholder="+91 98765 43210"
          value={value.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </Field>

      <Field label="Age" htmlFor={`${idPrefix}-age`} error={errors?.age}>
        <Input
          id={`${idPrefix}-age`}
          inputMode="numeric"
          placeholder="29"
          value={value.age}
          onChange={(e) => set("age", e.target.value)}
        />
      </Field>

      <Field
        label="Occupation"
        htmlFor={`${idPrefix}-occupation`}
        error={errors?.occupation}
      >
        <Input
          id={`${idPrefix}-occupation`}
          placeholder="Architect"
          value={value.occupation}
          onChange={(e) => set("occupation", e.target.value)}
        />
      </Field>

      <Field label="ID Type" htmlFor={`${idPrefix}-idtype`} error={errors?.idType}>
        <Select
          value={value.idType || undefined}
          onValueChange={(next) => set("idType", (next as IdType) ?? "")}
        >
          <SelectTrigger id={`${idPrefix}-idtype`} className="w-full">
            <SelectValue placeholder="Not provided" />
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
        htmlFor={`${idPrefix}-idnumber`}
        error={errors?.idNumber}
      >
        <Input
          id={`${idPrefix}-idnumber`}
          placeholder="Optional"
          value={value.idNumber}
          onChange={(e) => set("idNumber", e.target.value)}
        />
      </Field>
    </div>
  );
}
