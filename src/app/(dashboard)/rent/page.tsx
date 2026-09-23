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
import { GlowCard } from "@/components/ui/glow-card";
import { usePayments, useTenants } from "@/lib/queries";
import { expandMonth, formatDate, inr, inrK } from "@/lib/format";
import type { PaymentStatus } from "@/types";

const STATUS_TONE: Record<PaymentStatus, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-600",
};

const FILTERS = ["all", "paid", "pending", "overdue"] as const;

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
  const { data: tenants } = useTenants();

  if (isPending || !payments) {
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

  const term = search.trim().toLowerCase();
  const filtered = payments.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch =
      p.tenantName.toLowerCase().includes(term) ||
      p.propertyName.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  });

  const sumBy = (status?: PaymentStatus) =>
    payments
      .filter((p) => !status || p.status === status)
      .reduce((sum, p) => sum + p.amount, 0);

  const countBy = (status?: PaymentStatus) =>
    payments.filter((p) => !status || p.status === status).length;

  const total = sumBy();
  const collected = sumBy("paid");
  const pending = sumBy("pending");
  const overdue = sumBy("overdue");

  const pct = (value: number) => (total ? (value / total) * 100 : 0);

  const period = payments[0]?.month ? expandMonth(payments[0].month) : "";

  // Drawn icons rather than emoji: emoji render in the OS colour font, so they
  // sit at a different weight and baseline from everything around them and are
  // the fastest way to make an interface look unfinished.
  const summary = [
    { label: "Expected Rent", value: total, count: countBy(), tile: "bg-blue-50", tint: "text-blue-600", text: "text-slate-900", Icon: Landmark },
    { label: "Collected", value: collected, count: countBy("paid"), tile: "bg-green-50", tint: "text-green-600", text: "text-green-700", Icon: CheckCircle2 },
    { label: "Pending", value: pending, count: countBy("pending"), tile: "bg-amber-50", tint: "text-amber-600", text: "text-amber-700", Icon: Clock },
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
            {payments.length} transactions
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
            <GlowCard key={card.label} className="content-start p-4">
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
            </GlowCard>
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
                {["Tenant", "Property & Unit", "Amount", "Date", "Method", "Status"].map(
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
              {filtered.map((payment) => {
                const tenant = tenants?.find((t) => t.id === payment.tenantId);

                return (
                  <tr
                    key={payment.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {tenant && (
                          <Image
                            src={tenant.photo}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded-lg bg-slate-100 object-cover"
                            unoptimized
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {payment.tenantName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {payment.month}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {payment.propertyName}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                      {inr(payment.amount)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-600">
                        {payment.method || "—"}
                      </div>
                      {payment.transactionId && (
                        <div className="font-mono text-xs text-slate-400">
                          {payment.transactionId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_TONE[payment.status]}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {tenant && (
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
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
