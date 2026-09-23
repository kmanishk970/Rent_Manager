import dayjs from "dayjs";

/** ₹18,000 — full precision, used in tables and detail rows. */
export function inr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * ₹158K — always thousands, never promoted to Lakhs.
 *
 * The design fixes the unit per slot rather than picking one by magnitude, so
 * a column of figures stays comparable at a glance. Every compact figure in the
 * app uses this except the dashboard's Monthly Rent tile.
 */
export function inrK(amount: number): string {
  return `₹${Math.round(amount / 1_000)}K`;
}

/** ₹3.2L — always Lakhs. Used only by the dashboard's Monthly Rent tile. */
export function inrL(amount: number): string {
  return `₹${(amount / 100_000).toFixed(1)}L`;
}

/**
 * "Sep 2026" → "September 2026".
 *
 * Payment rows carry the abbreviated form; the design spells it out in the
 * dashboard greeting and the rent subtitle.
 */
export function expandMonth(value: string): string {
  const [abbr, year] = value.split(" ");
  const names: Record<string, string> = {
    Jan: "January", Feb: "February", Mar: "March", Apr: "April",
    May: "May", Jun: "June", Jul: "July", Aug: "August",
    Sep: "September", Oct: "October", Nov: "November", Dec: "December",
  };
  return names[abbr] ? `${names[abbr]} ${year}` : value;
}

/** 5 Sep 2026 — blank input renders an em dash rather than "Invalid Date". */
export function formatDate(value?: string): string {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
}

/** Whole days from today until `value`; negative once the date has passed. */
export function daysUntil(value: string): number {
  return dayjs(value).startOf("day").diff(dayjs().startOf("day"), "day");
}

/** How far through a lease we are, clamped to 0–100 for progress bars. */
export function leaseProgress(start: string, end: string): number {
  const total = dayjs(end).diff(dayjs(start), "day");
  if (total <= 0) return 100;
  const elapsed = dayjs().diff(dayjs(start), "day");
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/** "AM" for Arjun Mehta — avatar fallback initials. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
