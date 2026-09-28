"use client";

import { useState } from "react";
import { Eye, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddBillDialog } from "@/components/rent/add-bill-dialog";
import { RecordPaymentDialog } from "@/components/rent/record-payment-dialog";
import { MonthDetailsDialog } from "@/components/rent/month-details-dialog";
import { useBills, useDeleteBill, usePayments } from "@/lib/queries";
import { apiErrorMessage } from "@/lib/api/http";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, monthKey, monthLabel } from "@/lib/format";
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
  onView,
  onEdit,
  onPay,
}: {
  statement: MonthlyStatement;
  /** Every bill for the unit, so a broken reading chain can be spotted. */
  bills: RentBill[];
  onView: () => void;
  onEdit: (bill: RentBill) => void;
  onPay: (month: string) => void;
}) {
  const { rent, electricity, other, total, paid, opening, shortfall, credit } =
    statement;
  const gap = readingGapFor(bills, statement.bill);
  const [confirming, setConfirming] = useState(false);
  const deleteBill = useDeleteBill();

  // Only the month in progress is editable. A closed month is what was
  // actually billed and paid, and correcting one after the fact rewrites a
  // figure the running balance has already carried forward.
  const editable = statement.month === monthKey();

  const remove = async () => {
    try {
      await deleteBill.mutateAsync(statement.bill.id);
      toast.success(`${monthLabel(statement.month)} bill deleted`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not delete that bill"));
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">
          {monthLabel(statement.month)}
        </span>

        {confirming ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {/* The ledger is built from bills, so removing one takes its
                month off the record — including money already recorded
                against it, which stays in the database and reappears if the
                month is billed again. Worth saying before, not after. */}
            <span className="text-xs text-slate-500">
              {paid > 0
                ? `Delete? ${inr(paid)} paid will be hidden`
                : "Delete this bill?"}
            </span>
            <button
              type="button"
              onClick={remove}
              disabled={deleteBill.isPending}
              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {deleteBill.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONE[statement.status]}`}
            >
              {STATUS_LABEL[statement.status]}
            </span>
            {editable && (
              <button
                type="button"
                onClick={() => onEdit(statement.bill)}
                aria-label={`Edit the ${monthLabel(statement.month)} bill`}
                title="Edit this month's charges"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onView}
              aria-label={`View the ${monthLabel(statement.month)} statement`}
              title="See this month in full"
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-blue-600"
            >
              <Eye className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Delete the ${monthLabel(statement.month)} bill`}
              title="Delete this month's bill"
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
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

      {shortfall > 0 && (
        <button
          type="button"
          onClick={() => onPay(statement.month)}
          className="mt-2 w-full rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        >
          Record payment for {monthLabel(statement.month)}
        </button>
      )}
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
  const [payMonth, setPayMonth] = useState<string | undefined>();
  const [viewingMonth, setViewingMonth] = useState<string | undefined>();

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
  const viewing = statements.find((s) => s.month === viewingMonth);

  // Only ever opened on a month that exists: correcting a bill, never raising
  // one. Raising happens with the payment that settles it.
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
          onClick={() => {
            setPayMonth(undefined);
            setPayOpen(true);
          }}
          className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        >
          <Plus className="size-3.5" />
          Record Payment
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
            onClick={() => {
              setPayMonth(undefined);
              setPayOpen(true);
            }}
            className="mt-2 text-sm font-medium text-green-700 hover:underline"
          >
            Record the first payment →
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
                onView={() => setViewingMonth(statement.month)}
                onEdit={openEdit}
                onPay={(month) => {
                  setPayMonth(month);
                  setPayOpen(true);
                }}
              />
            ))}
          </div>

          {/* Statuses are derived from payments rather than set by hand, so
              say where they come from instead of offering a status control. */}
          <p className="mt-3 text-center text-[11px] text-slate-400">
            A month turns Paid once payments cover it.
          </p>
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
        defaultMonth={payMonth}
      />

      {viewing && (
        <MonthDetailsDialog
          open={Boolean(viewing)}
          onOpenChange={(next) => !next && setViewingMonth(undefined)}
          statement={viewing}
          tenantName={tenant.name}
        />
      )}
    </div>
  );
}
