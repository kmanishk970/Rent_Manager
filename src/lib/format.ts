import dayjs from "dayjs";

/** ₹18,000 — full precision, used in tables and detail rows. */
export function inr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * A short rupee figure, for a tile or a chart axis.
 *
 * Indian scale rather than thousands all the way up: ₹17L reads at a glance
 * where ₹1700K has to be counted. Below a thousand the exact figure is shown,
 * because rounding ₹450 to "₹0K" reported money that exists as nothing at all
 * — worse than being a few characters longer.
 *
 * One decimal only where it changes the answer: ₹9.2K, but ₹18K rather than
 * ₹18.0K.
 */
export function inrK(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const n = Math.abs(amount);

  if (n < 1_000) return `${sign}₹${Math.round(n)}`;

  const scaled = (value: number, suffix: string) => {
    const shown =
      value < 10 ? value.toFixed(1).replace(/\.0$/, "") : String(Math.round(value));
    return `${sign}₹${shown}${suffix}`;
  };

  if (n < 1_00_000) return scaled(n / 1_000, "K");
  if (n < 1_00_00_000) return scaled(n / 1_00_000, "L");
  return scaled(n / 1_00_00_000, "Cr");
}

/** ₹3.2L — always Lakhs. Used only by the dashboard's Monthly Rent tile. */
export function inrL(amount: number): string {
  return `₹${(amount / 100_000).toFixed(1)}L`;
}

/* ------------------------------------------------------------------ */
/* Month keys                                                          */
/* ------------------------------------------------------------------ */

/**
 * Bills and payments key their month as "2026-09" rather than "Sep 2026": it
 * sorts lexicographically, survives a year boundary and never needs parsing
 * back. These turn it into something readable.
 */

/** "2026-09" → "Sep 2026". */
export function monthLabel(key: string): string {
  const d = dayjs(`${key}-01`);
  return d.isValid() ? d.format("MMM YYYY") : key;
}

/** "2026-09" → "September 2026". */
export function monthLong(key: string): string {
  const d = dayjs(`${key}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : key;
}

/** The month a date falls in, as a key. Defaults to this month. */
export function monthKey(value?: string | Date): string {
  const d = value ? dayjs(value) : dayjs();
  return (d.isValid() ? d : dayjs()).format("YYYY-MM");
}

/** Steps a month key forwards or backwards. */
export function shiftMonth(key: string, months: number): string {
  return dayjs(`${key}-01`).add(months, "month").format("YYYY-MM");
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

export interface TenancyYear {
  /** 1 while inside the first twelve months, 2 in the second, and so on. */
  year: number;
  /** Anniversary this year runs from, "2026-04-01". */
  start: string;
  /** The next anniversary, one year on. */
  end: string;
  /** How far through this year, 0–100. */
  progress: number;
  /** Days left until the anniversary; 0 once it has passed. */
  daysLeft: number;
  /** True when the lease itself ends before the anniversary does. */
  endsBeforeAnniversary: boolean;
}

/**
 * The twelve-month window the tenancy is currently in, counted from the lease
 * start's anniversary.
 *
 * A tenant three years in is shown their fourth year rather than a progress bar
 * that has read 100% since 2024. Before the tenancy begins, year one is
 * reported at 0%.
 */
export function tenancyYear(start: string, leaseEnd?: string): TenancyYear {
  const from = dayjs(start).startOf("day");
  const now = dayjs().startOf("day");

  // Whole years elapsed, floored, so the window always contains today.
  const elapsed = Math.max(0, now.diff(from, "year"));
  const yearStart = from.add(elapsed, "year");
  const yearEnd = yearStart.add(1, "year");

  const span = yearEnd.diff(yearStart, "day");
  const done = now.diff(yearStart, "day");

  return {
    year: elapsed + 1,
    start: yearStart.format("YYYY-MM-DD"),
    end: yearEnd.format("YYYY-MM-DD"),
    progress: Math.min(100, Math.max(0, Math.round((done / span) * 100))),
    daysLeft: Math.max(0, yearEnd.diff(now, "day")),
    endsBeforeAnniversary: Boolean(
      leaseEnd && dayjs(leaseEnd).isValid() && dayjs(leaseEnd).isBefore(yearEnd),
    ),
  };
}

/** "2.4 MB" — sized to whichever unit reads naturally. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
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
