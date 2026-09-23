import { z } from "zod";
import type { IdType } from "@/types";

/**
 * Shared field rules.
 *
 * Every form in the app validates through this module, so "a valid mobile
 * number" means the same thing on the tenant wizard, the member dialog and the
 * settings page. The rules are India-specific because the domain is: rupees,
 * Aadhaar, PAN and six-digit PIN codes.
 */

/* ------------------------------------------------------------------ */
/* Mobile numbers                                                      */
/* ------------------------------------------------------------------ */

/** A subscriber number: ten digits, and Indian mobiles never start below 6. */
const MOBILE = /^[6-9]\d{9}$/;

/**
 * Reduces any accepted spelling — +91 98765 43210, 091-98765-43210,
 * 9876543210 — to the bare ten digits, so the check does not depend on how the
 * number was typed.
 */
export function mobileDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isMobile(value: string): boolean {
  return MOBILE.test(mobileDigits(value));
}

/** Stores every number one way: "+91 98765 43210". */
export function formatMobile(value: string): string {
  const digits = mobileDigits(value);
  if (!MOBILE.test(digits)) return value.trim();
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function mobileField(required = "Mobile number is required") {
  return z
    .string()
    .trim()
    .min(1, required)
    .refine(isMobile, "Enter a valid 10-digit Indian mobile number")
    .transform(formatMobile);
}

/** Same rules, but an empty string is allowed through as an empty string. */
export function optionalMobileField() {
  return z
    .string()
    .trim()
    .refine((v) => v === "" || isMobile(v), "Enter a valid 10-digit mobile number")
    .transform((v) => (v === "" ? "" : formatMobile(v)));
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

/**
 * Zod's own check already rejects the common shapes — no @, no dot in the
 * domain, doubled dots, a leading or trailing dot. This adds a length cap and
 * lowercases, so the same address never lands twice in different cases.
 */
export function emailField(required = "Email is required") {
  return z
    .string()
    .trim()
    .min(1, required)
    .max(254, "Email address is too long")
    .email("Enter a valid email address, e.g. name@gmail.com")
    .transform((v) => v.toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Names, addresses, PIN codes                                         */
/* ------------------------------------------------------------------ */

// Companies rent units too ("TechWave Solutions"), so digits and & are in.
const NAME_CHARS = /^[\p{L}\p{N}][\p{L}\p{N}\s.'&,()/-]*$/u;

export function nameField(required = "Full name is required") {
  return z
    .string()
    .trim()
    .min(2, required)
    .max(80, "That name is too long")
    .regex(NAME_CHARS, "Use letters, numbers, spaces and . ' & - only")
    .refine((v) => /\p{L}/u.test(v), "Name must contain at least one letter");
}

export function textField(
  label: string,
  { min = 2, max = 120 }: { min?: number; max?: number } = {},
) {
  return z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} is too long`);
}

/** Indian PIN codes are six digits and never start with zero. */
export function pincodeField() {
  return z
    .string()
    .trim()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code");
}

/* ------------------------------------------------------------------ */
/* Government ID numbers                                               */
/* ------------------------------------------------------------------ */

interface IdRule {
  /** Applied to the value once spaces and dashes are stripped. */
  pattern: RegExp;
  message: string;
  placeholder: string;
  /** Roomy enough for the separators the formatter puts back in. */
  maxLength: number;
  format: (compact: string) => string;
}

const ID_RULES: Record<IdType, IdRule> = {
  // UIDAI never issues an Aadhaar starting with 0 or 1.
  Aadhaar: {
    pattern: /^[2-9]\d{11}$/,
    message: "Aadhaar is 12 digits and cannot start with 0 or 1",
    placeholder: "2345 6789 0123",
    maxLength: 14,
    format: (v) => `${v.slice(0, 4)} ${v.slice(4, 8)} ${v.slice(8)}`,
  },
  PAN: {
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    message: "PAN looks like ABCDE1234F — five letters, four digits, a letter",
    placeholder: "ABCDE1234F",
    maxLength: 10,
    format: (v) => v,
  },
  // Indian passport numbers are one letter (excluding Q, X, Z) then 7 digits.
  Passport: {
    pattern: /^[A-PR-WY][0-9]{7}$/,
    message: "Passport number looks like K1234567 — a letter then 7 digits",
    placeholder: "K1234567",
    maxLength: 8,
    format: (v) => v,
  },
  "Voter ID": {
    pattern: /^[A-Z]{3}[0-9]{7}$/,
    message: "Voter ID looks like ABC1234567 — three letters then 7 digits",
    placeholder: "ABC1234567",
    maxLength: 10,
    format: (v) => v,
  },
  // State code, RTO code, year of issue, then a seven-digit serial.
  "Driving License": {
    pattern: /^[A-Z]{2}[0-9]{2}(19|20)\d{2}\d{7}$/,
    message: "Licence looks like KA01 2024 1234567",
    placeholder: "KA01 2024 1234567",
    maxLength: 17,
    format: (v) => `${v.slice(0, 4)} ${v.slice(4, 8)} ${v.slice(8)}`,
  },
};

/** Placeholder and length hints, so the field advertises what it will accept. */
export function idFieldHint(idType: IdType): {
  placeholder: string;
  maxLength: number;
} {
  const rule = ID_RULES[idType];
  return { placeholder: rule.placeholder, maxLength: rule.maxLength };
}

export type IdCheck =
  | { ok: true; value: string }
  | { ok: false; message: string };

/**
 * An ID number is only meaningful against its type, so this is a sibling-field
 * check rather than a rule on the field itself. Callers run it from a
 * `superRefine` and store the normalised value it returns.
 */
export function checkIdNumber(idType: IdType, raw: string): IdCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "ID number is required" };

  const rule = ID_RULES[idType];
  const compact = trimmed.replace(/[\s-]/g, "").toUpperCase();

  if (!rule.pattern.test(compact)) return { ok: false, message: rule.message };
  return { ok: true, value: rule.format(compact) };
}

/** The stored spelling of an ID number, or the input untouched if invalid. */
export function formatIdNumber(idType: IdType, raw: string): string {
  const checked = checkIdNumber(idType, raw);
  return checked.ok ? checked.value : raw.trim();
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Ten crore, well past any plausible rent and short of a typo like 1e12. */
const MAX_RUPEES = 100_000_000;

export function moneyField(
  label: string,
  { min = 1 }: { min?: number } = {},
) {
  return z.coerce
    .number({ invalid_type_error: `Enter ${label} as a number` })
    .refine(Number.isFinite, `Enter ${label} as a number`)
    .refine((v) => v >= min, min > 0 ? `Enter ${label}` : `${label} can't be negative`)
    .refine((v) => v <= MAX_RUPEES, `${label} looks too large`)
    .refine(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9,
      "At most two decimal places",
    );
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** Today as yyyy-mm-dd in local time, which is what date inputs exchange. */
export function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function dateField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Enter ${label.toLowerCase()} as a date`)
    .refine((v) => !Number.isNaN(Date.parse(v)), "That date does not exist");
}

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

export function passwordField() {
  return z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Password is too long")
    .regex(/\p{L}/u, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number");
}
