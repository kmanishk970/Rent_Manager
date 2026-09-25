"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryState } from "nuqs";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Landmark,
  Plus,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordPaymentDialog } from "@/components/rent/record-payment-dialog";
import { LiftCard } from "@/components/ui/lift-card";
import { useBills, usePayments, useProperties, useTenants } from "@/lib/queries";
import { formatDate, inr, inrK, monthLabel, monthLong } from "@/lib/format";
import {
  STATUS_LABEL,
  STATUS_TONE,
  buildStatements,
  type MonthlyStatement,
} from "@/lib/rent-ledger";
import { meterWorking } from "@/lib/electricity";
import type { PaymentStatus, Tenant } from "@/types";

const FILTERS = ["all", "paid", "partial", "pending", "overdue"] as const;

/** One tenant's month, flattened for the table. */
interface LedgerRow {
  key: string;
  tenant: Tenant;
  propertyName: string;
  statement: MonthlyStatement;
}

export default function RentPage() {
  const [search, setSearch] = useQueryState("q", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [filter, setFilter] = useQueryState("status", {
    defaultValue: "all",
    clearOnDefault: true,
  });
  // Deep link from a unit page: /rent?tenant=t3 opens the dialog pre-filled.
  const [tenantParam, setTenantParam] = useQueryState("tenant", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [showDialog, setShowDialog] = useState(false);

  const { data: payments, isPending } = usePayments();
  const { data: bills, isPending: billsPending } = useBills();
  const { data: tenants } = useTenants();
  const { data: properties } = useProperties();

  if (isPending || billsPending || !payments || !bills || !tenants) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // The table lists months, not transactions: a month is what carries a
  // status, since it can be part-paid by several transactions or none at all.
  const rows: LedgerRow[] = tenants
    .flatMap((tenant) => {
      const property = properties?.find((prop) => prop.id === tenant.propertyId);
      return buildStatements(
        bills.filter((b) => b.tenantId === tenant.id),
        payments.filter((pay) => pay.tenantId === tenant.id),
      ).map((statement) => ({
        key: `${tenant.id}-${statement.month}`,
        tenant,
        propertyName: property?.name ?? "",
        statement,
      }));
    })
    // Newest month first, tenants alphabetical within it.
    .sort(
      (a, b) =>
        b.statement.month.localeCompare(a.statement.month) ||
        a.tenant.name.localeCompare(b.tenant.name),
    );

  const term = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const matchesFilter = filter === "all" || row.statement.status === filter;
    const matchesSearch =
      row.tenant.name.toLowerCase().includes(term) ||
      row.propertyName.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const sumBy = (status?: PaymentStatus) =>
    rows
      .filter((r) => !status || r.statement.status === status)
      .reduce(
        (sum, r) => sum + (status ? r.statement.shortfall : r.statement.total),
        0,
      );

  const countBy = (status?: PaymentStatus) =>
    rows.filter((r) => !status || r.statement.status === status).length;

  const total = sumBy();
  const collected = rows.reduce((sum, r) => sum + r.statement.paid, 0);
  // What is still owed, split by how late it is.
  const pending = sumBy("pending") + sumBy("partial");
  const overdue = sumBy("overdue");

  const pct = (value: number) => (total ? (value / total) * 100 : 0);

  const period = rows[0] ? monthLong(rows[0].statement.month) : "";

  // Drawn icons rather than emoji: emoji render in the OS colour font, so they
  // sit at a different weight and baseline from everything around them and are
  // the fastest way to make an interface look unfinished.
  const summary = [
    { label: "Billed", value: total, count: countBy(), tile: "bg-blue-50", tint: "text-blue-600", text: "text-slate-900", Icon: Landmark },
    { label: "Collected", value: collected, count: countBy("paid"), tile: "bg-green-50", tint: "text-green-600", text: "text-green-700", Icon: CheckCircle2 },
    { label: "Pending", value: pending, count: countBy("pending") + countBy("partial"), tile: "bg-amber-50", tint: "text-amber-600", text: "text-amber-700", Icon: Clock },
    { label: "Overdue", value: overdue, count: countBy("overdue"), tile: "bg-red-50", tint: "text-red-600", text: "text-red-600", Icon: AlertTriangle },
  ];

  const openDialog = () => setShowDialog(true);
  const closeDialog = (open: boolean) => {
    setShowDialog(open);
    if (!open && tenantParam) setTenantParam("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Rent Management
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {period && `${period} · `}
            {rows.length} billed month{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        <Button onClick={openDialog} className="gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="size-4" strokeWidth={2.5} />
          Record Payment
        </Button>
      </div>

      {/* Summary — same shape as the dashboard tiles, so the two pages read as
          one system rather than two separate designs. */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summary.map((card) => {
          const share = total ? Math.round((card.value / total) * 100) : 0;

          return (
            <LiftCard key={card.label} className="content-start p-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${card.tile}`}
                >
                  <card.Icon className={`size-4 ${card.tint}`} />
                </span>
                <span className="truncate text-[13px] font-semibold text-slate-500">
                  {card.label}
                </span>
              </div>

              <div
                data-numeric
                className={`mt-3.5 text-[26px] leading-none font-extrabold tracking-[-0.03em] ${card.text}`}
              >
                {inrK(card.value)}
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <span data-numeric>
                  {card.count} tenant{card.count === 1 ? "" : "s"}
                </span>
                {card.label !== "Expected Rent" && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span data-numeric>{share}% of total</span>
                  </>
                )}
              </div>
            </LiftCard>
          );
        })}
      </div>

      {/* Collection progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Collection Progress
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {period || "Current period"} · {inrK(collected)} of{" "}
              {inrK(total)} received
            </p>
          </div>
          <div className="text-right">
            <div
              data-numeric
              className="text-2xl leading-none font-extrabold tracking-[-0.03em] text-green-600"
            >
              {Math.round(pct(collected))}%
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-400">
              collected
            </div>
          </div>
        </div>

        {/* Segments sit in an inset track with a hairline overlay, so the bar
            reads as a filled channel rather than three flat blocks. */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct(collected))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Rent collected this period"
          className="relative flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 inset-ring inset-ring-slate-900/5"
        >
          <div
            className="h-full rounded-l-full bg-gradient-to-b from-green-400 to-green-600 transition-[width] duration-500"
            style={{ width: `${pct(collected)}%` }}
          />
          <div
            className="h-full bg-gradient-to-b from-amber-300 to-amber-500 transition-[width] duration-500"
            style={{ width: `${pct(pending)}%` }}
          />
          <div
            className="h-full rounded-r-full bg-gradient-to-b from-red-400 to-red-600 transition-[width] duration-500"
            style={{ width: `${pct(overdue)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pr-2.5 pl-2 text-xs font-medium text-slate-600">
            <span className="size-2 rounded-full bg-green-500" />
            Collected
            <span data-numeric className="font-bold text-slate-900">
              {inrK(collected)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pr-2.5 pl-2 text-xs font-medium text-slate-600">
            <span className="size-2 rounded-full bg-amber-400" />
            Pending
            <span data-numeric className="font-bold text-slate-900">
              {inrK(pending)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-1 pr-2.5 pl-2 text-xs font-medium text-slate-600">
            <span className="size-2 rounded-full bg-red-500" />
            Overdue
            <span data-numeric className="font-bold text-slate-900">
              {inrK(overdue)}
            </span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search tenant or property..."
            aria-label="Search payments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white pl-9"
          />
        </div>

        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                filter === option
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Tenant", "Property", "Charges", "Paid", "Balance", "Status"].map(
                  (heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3.5 text-left text-xs font-semibold tracking-wider text-slate-500 uppercase first:px-5"
                    >
                      {heading}
                    </th>
                  ),
                )}
                <th scope="col" className="px-4 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ key, tenant, propertyName, statement }) => (
                <tr key={key} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={tenant.photo}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 rounded-lg bg-slate-100 object-cover"
                        unoptimized
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {tenant.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {monthLabel(statement.month)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-700">
                    {propertyName}
                  </td>

                  {/* The total, over a breakdown that names each part */}
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {inr(statement.total)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Rent {inr(statement.rent)} · Electricity{" "}
                      {inr(statement.electricity)}
                      {meterWorking(statement.bill) &&
                        ` (${meterWorking(statement.bill)})`}
                      {statement.other > 0 &&
                        ` · ${statement.bill.otherLabel || "Other"} ${inr(statement.other)}`}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-slate-700">
                      {inr(statement.paid)}
                    </div>
                    {statement.payments.length > 0 && (
                      <div className="text-xs text-slate-400">
                        {formatDate(statement.payments.at(-1)?.date)}
                      </div>
                    )}
                  </td>

                  {/* What the month left behind, in the tenant's favour or not */}
                  <td className="px-4 py-4">
                    {statement.shortfall > 0 ? (
                      <span className="text-sm font-semibold text-red-600">
                        −{inr(statement.shortfall)}
                      </span>
                    ) : statement.credit > 0 ? (
                      <span className="text-sm font-semibold text-green-700">
                        +{inr(statement.credit)}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_TONE[statement.status]}`}
                    >
                      {STATUS_LABEL[statement.status]}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            No payments found.
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={showDialog || Boolean(tenantParam)}
        onOpenChange={closeDialog}
        defaultTenantId={tenantParam || undefined}
      />
    </div>
  );
}
