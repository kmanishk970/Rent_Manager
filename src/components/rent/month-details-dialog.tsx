"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { inr, formatDate, monthLabel } from "@/lib/format";
import { meterWorking } from "@/lib/electricity";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/rent-ledger";
import type { MonthlyStatement } from "@/lib/rent-ledger";

/** One line of the month's arithmetic. */
function Line({
  label,
  value,
  note,
  strong,
  tone,
}: {
  label: string;
  value: string;
  note?: string | null;
  strong?: boolean;
  tone?: "credit" | "due";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div
          className={`text-sm ${strong ? "font-semibold text-slate-800" : "text-slate-600"}`}
        >
          {label}
        </div>
        {note && <div className="text-xs text-slate-400">{note}</div>}
      </div>
      <div
        className={`shrink-0 text-sm tabular-nums ${
          tone === "credit"
            ? "font-semibold text-green-700"
            : tone === "due"
              ? "font-semibold text-red-600"
              : strong
                ? "font-semibold text-slate-900"
                : "text-slate-700"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * One month, in full: what was charged, what arrived, and where that leaves
 * the tenancy.
 *
 * The row in the card shows the shape of a month; this shows its working —
 * the meter arithmetic, each payment with its reference, and the balance
 * carried in and out. A disputed month is settled by reading this, not by
 * recomputing it from a summary.
 */
export function MonthDetailsDialog({
  open,
  onOpenChange,
  statement,
  tenantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: MonthlyStatement;
  tenantName: string;
}) {
  const {
    month,
    bill,
    rent,
    electricity,
    other,
    total,
    opening,
    paid,
    shortfall,
    credit,
    status,
    payments,
    dueDate,
  } = statement;

  const working = meterWorking(bill);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-lg font-semibold text-slate-900">
            {monthLabel(month)}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}
            >
              {STATUS_LABEL[status]}
            </span>
          </DialogTitle>
          <DialogDescription>
            {tenantName}
            {dueDate ? ` · due ${formatDate(dueDate)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              Charged
            </p>
            <Line label="Rent" value={inr(rent)} />
            <Line label="Electricity" value={inr(electricity)} note={working} />
            {other > 0 && (
              <Line
                label={bill.otherLabel || "Other charges"}
                value={inr(other)}
              />
            )}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <Line label="Total for the month" value={inr(total)} strong />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              Paid
            </p>

            {payments.length > 0 ? (
              payments.map((payment) => (
                <Line
                  key={payment.id}
                  label={formatDate(payment.date)}
                  value={inr(payment.amount)}
                  note={[payment.method, payment.transactionId]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))
            ) : (
              <p className="py-2 text-sm text-slate-400">
                Nothing recorded against this month yet.
              </p>
            )}

            {payments.length > 1 && (
              <div className="mt-1 border-t border-slate-100 pt-1">
                <Line label="Received" value={inr(paid)} strong />
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">
              Balance
            </p>
            {/* Only when there was one: a month that opened square should not
                carry a line saying so. */}
            {opening !== 0 && (
              <Line
                label={opening > 0 ? "Advance brought forward" : "Dues brought forward"}
                value={inr(Math.abs(opening))}
                tone={opening > 0 ? "credit" : "due"}
              />
            )}
            <Line label="Charged" value={`− ${inr(total)}`} />
            <Line label="Paid" value={`+ ${inr(paid)}`} />
            <div className="mt-1 border-t border-slate-200 pt-1">
              {shortfall > 0 ? (
                <Line label="Still owed" value={inr(shortfall)} strong tone="due" />
              ) : credit > 0 ? (
                <Line
                  label="Balance in advance"
                  value={inr(credit)}
                  strong
                  tone="credit"
                />
              ) : (
                <Line label="Settled" value={inr(0)} strong />
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-end border-t border-slate-200 pt-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
