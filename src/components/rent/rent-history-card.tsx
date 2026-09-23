"use client";

import { useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { AddBillDialog } from "@/components/rent/add-bill-dialog";
import { RecordPaymentDialog } from "@/components/rent/record-payment-dialog";
import { useBills, usePayments } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, monthLabel } from "@/lib/format";
import { meterWorking, readingGapFor } from "@/lib/electricity";
import {
  STATUS_LABEL,
  STATUS_TONE,
  buildStatements,
  newestFirst,
  summarise,
  type MonthlyStatement,
} from "@/lib/rent-ledger";
import type { RentBill, Tenant } from "@/types";

/** One figure in the charge breakdown, with the name of what it is. */
function Term({
  label,
  value,
  note,
  emphasis = false,
}: {
  label: string;
  value: number;
  /** The working behind the figure, e.g. "200 units × ₹10". */
  note?: string | null;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[10px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </div>
      <div
        className={
          emphasis
            ? "text-sm font-bold text-slate-900"
            : "text-xs font-semibold text-slate-700"
        }
      >
        {inr(value)}
      </div>
      {note && (
        <div className="truncate text-[10px] text-slate-400">{note}</div>
      )}
    </div>
  );
}

function Operator({ children }: { children: string }) {
  return (
    <span aria-hidden className="pb-0.5 text-xs text-slate-400">
      {children}
    </span>
  );
}

/**
 * One month's line: what was charged, what arrived, and what it left behind.
 *
 * The carried figures are only printed when they are non-zero — a month that
 * opened and closed square should read as one clean row, not a balance sheet.
 */
function StatementRow({
  statement,
  bills,
  onEdit,
}: {
  statement: MonthlyStatement;
  /** Every bill for the unit, so a broken reading chain can be spotted. */
  bills: RentBill[];
  onEdit: (bill: RentBill) => void;
}) {
  const { rent, electricity, other, total, paid, opening, shortfall, credit } =
    statement;
  const gap = readingGapFor(bills, statement.bill);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(statement.bill)}
          className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline"
        >
          {monthLabel(statement.month)}
        </button>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[statement.status]}`}
        >
          {STATUS_LABEL[statement.status]}
        </span>
      </div>

      {/* rent + electricity ( + other ) = total, every figure named */}
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1.5">
        <Term label="Rent" value={rent} />
        <Operator>+</Operator>
        <Term
          label="Electricity"
          value={electricity}
          note={meterWorking(statement.bill)}
        />
        {other > 0 && (
          <>
            <Operator>+</Operator>
            <Term
              label={statement.bill.otherLabel || "Other"}
              value={other}
            />
          </>
        )}
        <Operator>=</Operator>
        <Term label="Total" value={total} emphasis />
      </div>

      {/* Correcting an older reading leaves later bills alone by design, so
          the break it causes is surfaced rather than silently reconciled. */}
      {gap && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
          Opens at {gap.recorded.toLocaleString("en-IN")}, but{" "}
          {monthLabel(gap.month)} now closes at{" "}
          {gap.expected.toLocaleString("en-IN")}.
        </p>
      )}

      <dl className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs">
        {opening !== 0 && (
          <div className="flex justify-between">
            <dt className="text-slate-400">
              {opening > 0 ? "Advance brought forward" : "Dues brought forward"}
            </dt>
            <dd
              className={opening > 0 ? "text-green-600" : "font-medium text-red-600"}
            >
              {inr(Math.abs(opening))}
            </dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-slate-400">Paid</dt>
          <dd className="font-medium text-slate-700">{inr(paid)}</dd>
        </div>

        {shortfall > 0 && (
          <div className="flex justify-between">
            <dt className="font-medium text-red-600">
              {statement.status === "overdue" ? "Overdue" : "Still owing"}
            </dt>
            <dd className="font-semibold text-red-600">{inr(shortfall)}</dd>
          </div>
        )}

        {credit > 0 && (
          <div className="flex justify-between">
            <dt className="font-medium text-green-700">Balance in advance</dt>
            <dd className="font-semibold text-green-700">{inr(credit)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/**
 * The month-by-month rent record for one tenancy, newest first, with the
 * running balance it has arrived at.
 */
export function RentHistoryCard({ tenant }: { tenant: Tenant }) {
  const { data: bills, isPending: billsPending } = useBills();
  const { data: payments, isPending: paymentsPending } = usePayments();

  const [billOpen, setBillOpen] = useState(false);
  const [editing, setEditing] = useState<RentBill | undefined>();
  const [payOpen, setPayOpen] = useState(false);

  if (billsPending || paymentsPending) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  // Readings follow the unit's meter, which outlives any one tenancy.
  const unitBills = (bills ?? []).filter((b) => b.unitId === tenant.unitId);

  const statements = buildStatements(
    (bills ?? []).filter((b) => b.tenantId === tenant.id),
    (payments ?? []).filter((p) => p.tenantId === tenant.id),
  );
  const summary = summarise(statements);
  const rows = newestFirst(statements);

  const openAdd = () => {
    setEditing(undefined);
    setBillOpen(true);
  };

  const openEdit = (bill: RentBill) => {
    setEditing(bill);
    setBillOpen(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Rent History</h3>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <Plus className="size-3.5" />
          Add Bill
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-slate-100">
            <ReceiptText className="size-5 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-500">Nothing billed yet.</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Add the first bill →
          </button>
        </div>
      ) : (
        <>
          {/* Where the tenancy stands after every month so far. */}
          <div
            className={`mb-3 rounded-lg border p-3 ${
              summary.outstanding > 0
                ? "border-red-200 bg-red-50"
                : summary.advance > 0
                  ? "border-green-200 bg-green-50"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-medium ${
                  summary.outstanding > 0
                    ? "text-red-700"
                    : summary.advance > 0
                      ? "text-green-700"
                      : "text-slate-500"
                }`}
              >
                {summary.outstanding > 0
                  ? "Outstanding"
                  : summary.advance > 0
                    ? "Balance in advance"
                    : "All settled"}
              </span>
              <span
                className={`font-display text-base font-bold ${
                  summary.outstanding > 0
                    ? "text-red-700"
                    : summary.advance > 0
                      ? "text-green-700"
                      : "text-slate-700"
                }`}
              >
                {inr(summary.outstanding || summary.advance || 0)}
              </span>
            </div>
            {summary.monthsOwing > 0 && (
              <p className="mt-0.5 text-xs text-red-600">
                {summary.monthsOwing} month
                {summary.monthsOwing > 1 ? "s" : ""} not fully paid
              </p>
            )}
          </div>

          <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
            {rows.map((statement) => (
              <StatementRow
                key={statement.month}
                statement={statement}
                bills={unitBills}
                onEdit={openEdit}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="mt-3 w-full rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            Record Payment
          </button>
        </>
      )}

      <AddBillDialog
        open={billOpen}
        onOpenChange={setBillOpen}
        tenant={tenant}
        existing={editing}
      />

      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultTenantId={tenant.id}
      />
    </div>
  );
}
