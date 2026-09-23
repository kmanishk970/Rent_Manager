import type { RentBill } from "@/types";

/**
 * Metered electricity.
 *
 * A meter reading is cumulative — it only climbs. So a month's consumption is
 * the difference between its reading and the one before it, and the charge is
 * that difference times the tariff.
 *
 * The meter belongs to the unit rather than the tenancy: it keeps counting
 * when the primary tenant changes, so every lookup here is by `unitId`.
 */

/** Used when nothing else supplies a tariff. */
export const DEFAULT_UNIT_RATE = 10;

/** Units consumed, or null when the bill is not metered or is missing a reading. */
export function unitsUsed(bill: RentBill): number | null {
  if (bill.electricityMode !== "meter") return null;
  if (bill.meterPrevious === undefined || bill.meterCurrent === undefined) {
    return null;
  }
  return bill.meterCurrent - bill.meterPrevious;
}

export interface PreviousReading {
  reading: number;
  /** The month that reading was taken in, for "from Aug 2026". */
  month: string;
}

/**
 * The reading to open a month from: the closing reading of the most recent
 * *earlier* bill for the same unit.
 *
 * Deliberately not "last month" — if a month was never billed, the meter still
 * counted through it, so the next bill must subtract from the last reading
 * actually taken rather than inventing one.
 */
export function previousReadingFor(
  bills: RentBill[],
  unitId: string,
  month: string,
): PreviousReading | null {
  const earlier = bills
    .filter(
      (b) =>
        b.unitId === unitId &&
        b.month < month &&
        b.meterCurrent !== undefined,
    )
    .sort((a, b) => b.month.localeCompare(a.month));

  const latest = earlier[0];
  if (!latest || latest.meterCurrent === undefined) return null;
  return { reading: latest.meterCurrent, month: latest.month };
}

export interface ReadingGap {
  /** What this bill opened from. */
  recorded: number;
  /** What the earlier bill now closes at. */
  expected: number;
  /** The month that earlier reading belongs to. */
  month: string;
}

/**
 * Whether a bill's opening reading still agrees with the bill before it.
 *
 * Correcting an old reading deliberately leaves later bills alone — silently
 * re-deriving months that have already been collected against would be worse.
 * This reports the resulting break so it can be flagged and fixed on purpose.
 */
export function readingGapFor(
  bills: RentBill[],
  bill: RentBill,
): ReadingGap | null {
  if (bill.electricityMode !== "meter" || bill.meterPrevious === undefined) {
    return null;
  }

  const previous = previousReadingFor(bills, bill.unitId, bill.month);
  if (!previous || previous.reading === bill.meterPrevious) return null;

  return {
    recorded: bill.meterPrevious,
    expected: previous.reading,
    month: previous.month,
  };
}

/** The charge for a metered month, rounded to whole rupees. */
export function meterCharge(
  previous: number,
  current: number,
  rate: number,
): number {
  return Math.max(0, Math.round((current - previous) * rate));
}

/** "200 units × ₹10" — the working behind a metered figure. */
export function meterWorking(bill: RentBill): string | null {
  const units = unitsUsed(bill);
  if (units === null) return null;
  const rate = bill.unitRate ?? DEFAULT_UNIT_RATE;
  return `${units} unit${units === 1 ? "" : "s"} × ₹${rate}`;
}
