import dayjs from "dayjs";
import type { PaymentStatus, RentBill, RentPayment } from "@/types";

/**
 * The rent ledger.
 *
 * A month is not settled by a single payment. It is billed for rent plus
 * electricity plus whatever else, and money arrives against it in whatever
 * instalments the tenant manages. Anything left over rolls into the next month
 * as credit; anything short rolls in as dues.
 *
 * So a month is never read on its own — the statements below are built by
 * walking the months in order and carrying the running balance forward.
 */

export interface MonthlyStatement {
  /** "2026-09". */
  month: string;
  bill: RentBill;

  rent: number;
  electricity: number;
  other: number;
  /** rent + electricity + other, what this month itself asked for. */
  total: number;

  /** Carried in from the month before: positive is credit, negative is dues. */
  opening: number;
  /** Money recorded against this month. */
  paid: number;
  /** opening + paid − total. Positive is credit, negative is dues. */
  closing: number;

  /** −closing when negative, else 0. What the tenant still owes. */
  shortfall: number;
  /** closing when positive, else 0. Money sitting in the tenant's favour. */
  credit: number;

  status: PaymentStatus;
  payments: RentPayment[];
  dueDate: string;
}

/** The charges on a bill, with the optional extras defaulted. */
export function billTotal(bill: RentBill): number {
  return bill.rent + bill.electricity + (bill.otherCharges || 0);
}

/**
 * Decides a month's status once its money is counted.
 *
 * A month that is short is only "overdue" after its due date — before that the
 * tenant is simply not finished paying, which reads as "partial" if some money
 * has arrived and "pending" if none has.
 */
function statusFor(
  shortfall: number,
  paid: number,
  dueDate: string,
  asOf: dayjs.Dayjs,
): PaymentStatus {
  if (shortfall <= 0) return "paid";
  if (dayjs(dueDate).isValid() && asOf.isAfter(dayjs(dueDate), "day")) {
    return "overdue";
  }
  return paid > 0 ? "partial" : "pending";
}

/**
 * Builds one statement per bill, oldest first, carrying the balance forward.
 *
 * `payments` may contain rows for months that were never billed; those are
 * ignored here rather than silently inventing a month.
 */
export function buildStatements(
  bills: RentBill[],
  payments: RentPayment[],
  asOfDate?: string,
): MonthlyStatement[] {
  const asOf = asOfDate ? dayjs(asOfDate) : dayjs();

  const ordered = [...bills].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map<string, RentPayment[]>();
  for (const payment of payments) {
    const list = byMonth.get(payment.month);
    if (list) list.push(payment);
    else byMonth.set(payment.month, [payment]);
  }

  let carry = 0;
  return ordered.map((bill) => {
    const monthPayments = (byMonth.get(bill.month) ?? []).sort((a, b) =>
      (a.date || "").localeCompare(b.date || ""),
    );

    const paid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const total = billTotal(bill);
    const opening = carry;
    const closing = opening + paid - total;
    carry = closing;

    const shortfall = closing < 0 ? -closing : 0;
    const credit = closing > 0 ? closing : 0;

    return {
      month: bill.month,
      bill,
      rent: bill.rent,
      electricity: bill.electricity,
      other: bill.otherCharges || 0,
      total,
      opening,
      paid,
      closing,
      shortfall,
      credit,
      status: statusFor(shortfall, paid, bill.dueDate, asOf),
      payments: monthPayments,
      dueDate: bill.dueDate,
    };
  });
}

export interface LedgerSummary {
  /** The running balance after the last billed month. */
  balance: number;
  /** −balance when in dues, else 0. */
  outstanding: number;
  /** balance when in credit, else 0. */
  advance: number;
  /** Months still carrying a shortfall of their own. */
  monthsOwing: number;
  billed: number;
  collected: number;
}

export function summarise(statements: MonthlyStatement[]): LedgerSummary {
  const last = statements.at(-1);
  const balance = last ? last.closing : 0;

  return {
    balance,
    outstanding: balance < 0 ? -balance : 0,
    advance: balance > 0 ? balance : 0,
    monthsOwing: statements.filter(
      (s) => s.status === "overdue" || s.status === "partial",
    ).length,
    billed: statements.reduce((sum, s) => sum + s.total, 0),
    collected: statements.reduce((sum, s) => sum + s.paid, 0),
  };
}

/** Statements newest first, which is how every screen lists them. */
export function newestFirst(statements: MonthlyStatement[]): MonthlyStatement[] {
  return [...statements].reverse();
}

export const STATUS_TONE: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
  overdue: "bg-red-100 text-red-600",
};

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  overdue: "Overdue",
};
