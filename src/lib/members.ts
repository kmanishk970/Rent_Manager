import { z } from "zod";
import {
  checkIdNumber,
  formatIdNumber,
  isMobile,
  formatMobile,
  nameField,
} from "@/lib/validation";
import type { HouseholdMember, IdType, MemberRelation } from "@/types";

/** Relation options offered in the picker, in the order landlords use them. */
export const RELATIONS = [
  "Wife",
  "Husband",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Friend",
  "Other",
] as const satisfies readonly MemberRelation[];

export const MEMBER_ID_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Voter ID",
  "Driving License",
] as const satisfies readonly IdType[];

/**
 * What the member form holds while it is being filled in: every control is a
 * string, so an unset number or select stays representable. `validateMember`
 * turns it into the domain shape.
 */
export interface MemberDraft {
  name: string;
  relation: MemberRelation;
  relationNote: string;
  phone: string;
  age: string;
  occupation: string;
  idType: IdType | "";
  idNumber: string;
}

export type MemberErrors = Partial<Record<keyof MemberDraft, string>>;

/**
 * What a validated draft yields: who the person is.
 *
 * Their ids and their photo are deliberately absent — one is assigned by the
 * server, the other arrives from an upload, and neither is something a form
 * can produce by itself.
 */
export type MemberValues = Omit<HouseholdMember, "id" | "personId" | "photo">;

export function emptyMember(): MemberDraft {
  return {
    name: "",
    relation: "Wife",
    relationNote: "",
    phone: "",
    age: "",
    occupation: "",
    idType: "",
    idNumber: "",
  };
}

export function draftFromMember(member: HouseholdMember): MemberDraft {
  return {
    name: member.name,
    relation: member.relation,
    relationNote: member.relationNote ?? "",
    phone: member.phone ?? "",
    age: member.age === undefined ? "" : String(member.age),
    occupation: member.occupation ?? "",
    idType: member.idType ?? "",
    idNumber: member.idNumber ?? "",
  };
}

/**
 * Name and relation are required; everything else is a nice-to-have. The
 * optional fields still have to be right when they are filled in — a half-typed
 * phone number is worse than none at all.
 */
const memberSchema = z
  .object({
    name: nameField("Name is required"),
    relation: z.enum(RELATIONS),
    relationNote: z.string().trim().max(40, "Keep the relation short"),
    phone: z.string().trim(),
    age: z.string().trim(),
    occupation: z.string().trim().max(60, "Occupation is too long"),
    idType: z.union([z.enum(MEMBER_ID_TYPES), z.literal("")]),
    idNumber: z.string().trim(),
  })
  .superRefine((draft, ctx) => {
    if (draft.relation === "Other" && draft.relationNote.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relationNote"],
        message: "Describe the relation",
      });
    }

    if (draft.phone && !isMobile(draft.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter a valid 10-digit Indian mobile number",
      });
    }

    if (draft.age) {
      const age = Number(draft.age);
      if (!/^[0-9]{1,3}$/.test(draft.age) || !Number.isInteger(age) || age > 120) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["age"],
          message: "Enter an age between 0 and 120",
        });
      }
    }

    // An ID number without its type would be unreadable on the record.
    if (draft.idNumber && !draft.idType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["idType"],
        message: "Pick the ID type",
      });
    }

    if (draft.idNumber && draft.idType) {
      const id = checkIdNumber(draft.idType, draft.idNumber);
      if (!id.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["idNumber"],
          message: id.message,
        });
      }
    }
  })
  .transform((draft) => {
    const member: MemberValues = {
      name: draft.name,
      relation: draft.relation,
    };
    // Blank optionals are dropped rather than stored as empty strings.
    if (draft.relation === "Other") member.relationNote = draft.relationNote;
    if (draft.phone) member.phone = formatMobile(draft.phone);
    if (draft.age) member.age = Number(draft.age);
    if (draft.occupation) member.occupation = draft.occupation;
    if (draft.idType) member.idType = draft.idType;
    if (draft.idNumber && draft.idType) {
      member.idNumber = formatIdNumber(draft.idType, draft.idNumber);
    }
    return member;
  });

export type MemberResult =
  | { ok: true; value: MemberValues }
  | { ok: false; errors: MemberErrors };

export function validateMember(draft: MemberDraft): MemberResult {
  const parsed = memberSchema.safeParse(draft);
  if (parsed.success) return { ok: true, value: parsed.data };

  const fieldErrors = parsed.error.flatten().fieldErrors;
  const errors: MemberErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) errors[key as keyof MemberDraft] = messages[0];
  }
  return { ok: false, errors };
}

/** What to print for a relation — the free-text note wins for "Other". */
export function relationLabel(
  member: Pick<HouseholdMember, "relation" | "relationNote">,
): string {
  if (member.relation === "Other") {
    return member.relationNote?.trim() || "Other";
  }
  return member.relation;
}

/** Deterministic tint per relation, so a household reads at a glance. */
export function relationTone(relation: MemberRelation): string {
  switch (relation) {
    case "Wife":
    case "Husband":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "Son":
    case "Daughter":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Father":
    case "Mother":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Brother":
    case "Sister":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Friend":
      return "bg-teal-50 text-teal-700 border-teal-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

/**
 * The relation running the other way, used when a member is promoted to primary
 * and the outgoing primary joins the household.
 *
 * Only the symmetric pairs are determinate: "my wife" inverts to "my husband",
 * but "my son" inverts to father or mother depending on a gender the record
 * never captured. Those fall back to "Other" with the direction spelled out, so
 * the default is honest rather than a guess — and the picker is right there.
 */
export function inverseRelation(relation: MemberRelation): {
  relation: MemberRelation;
  relationNote: string;
} {
  switch (relation) {
    case "Wife":
      return { relation: "Husband", relationNote: "" };
    case "Husband":
      return { relation: "Wife", relationNote: "" };
    case "Friend":
      return { relation: "Friend", relationNote: "" };
    case "Son":
    case "Daughter":
      return { relation: "Other", relationNote: "Parent" };
    case "Father":
    case "Mother":
      return { relation: "Other", relationNote: "Child" };
    case "Brother":
    case "Sister":
      return { relation: "Other", relationNote: "Sibling" };
    default:
      // The old note described the opposite direction, so it is not reused.
      return { relation: "Other", relationNote: "" };
  }
}

/** "Priya Mehta, Aarav Mehta +2" style summary for dense rows. */
export function householdSummary(members: HouseholdMember[]): string {
  if (members.length === 0) return "Lives alone";
  const shown = members.slice(0, 2).map((m) => m.name);
  const rest = members.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}
