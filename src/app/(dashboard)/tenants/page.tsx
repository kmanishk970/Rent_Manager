"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { Plus, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTenantDialog } from "@/components/tenants/add-tenant-dialog";
import { useProperties, useTenants } from "@/lib/queries";
import { daysUntil, formatDate, inr } from "@/lib/format";

const FILTERS = ["all", "active", "expiring"] as const;
const EXPIRING_WINDOW_DAYS = 60;

export default function TenantsPage() {
  const [search, setSearch] = useQueryState("q", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [filter, setFilter] = useQueryState("filter", {
    defaultValue: "all",
    clearOnDefault: true,
  });
  // /tenants?add=1 opens the form, so "Add Tenant" links elsewhere work.
  const [addParam, setAddParam] = useQueryState("add", {
    defaultValue: "",
    clearOnDefault: true,
  });
  // …and &unit=<id> says which unit it is for, when the link came from one.
  const [unitParam, setUnitParam] = useQueryState("unit", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (addParam) setShowAdd(true);
  }, [addParam]);

  const { data: tenants, isPending } = useTenants();
  const { data: properties } = useProperties();

  if (isPending || !tenants) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-11 w-full max-w-sm" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const term = search.trim().toLowerCase();

  const filtered = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(term) ||
      tenant.phone.includes(term) ||
      tenant.email.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    const left = daysUntil(tenant.leaseEnd);
    // The prototype's "active" filter was identical to "all"; here it means a
    // lease that hasn't run out yet.
    if (filter === "active") return left > 0;
    if (filter === "expiring") return left <= EXPIRING_WINDOW_DAYS && left > 0;
    return true;
  });

  const locate = (tenant: (typeof tenants)[number]) => {
    const property = properties?.find((p) => p.id === tenant.propertyId);
    const floor = property?.floors.find((f) => f.id === tenant.floorId);
    const unit = floor?.units.find((u) => u.id === tenant.unitId);
    return { property, floor, unit };
  };

  const closeAdd = (open: boolean) => {
    setShowAdd(open);
    if (!open && addParam) setAddParam("");
    if (!open && unitParam) setUnitParam("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Tenants
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {tenants.length} tenants across all properties
          </p>
        </div>

        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" strokeWidth={2.5} />
          Add Tenant
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, phone or email..."
            aria-label="Search tenants"
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
              {option === "expiring" ? "Expiring Soon" : option}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card">
        {/* Phones: one card per tenant.
            Six columns cannot be read on a 390px screen — three of them sit
            off the edge, and sideways scrolling inside a card is something
            people have to discover before they can use it. The same facts
            stack instead, and the whole card is the link. */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {filtered.map((tenant) => {
            const { property, unit } = locate(tenant);
            const left = daysUntil(tenant.leaseEnd);
            const expiring = left <= EXPIRING_WINDOW_DAYS && left > 0;
            const expired = left <= 0;

            return (
              <li key={tenant.id}>
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="flex gap-3 p-4 transition-colors active:bg-slate-50"
                >
                  <Image
                    src={tenant.photo}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-lg bg-slate-100 object-cover"
                    unoptimized
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {tenant.name}
                          </span>
                          {(tenant.members ?? []).length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                              <Users className="size-3" aria-hidden />
                              {tenant.members.length}
                            </span>
                          )}
                        </div>
                        {/* Unit first: the line truncates on a narrow
                            screen, and losing which unit somebody rents is
                            worse than losing the floor it is on. */}
                        <div className="truncate text-xs text-slate-400">
                          Unit {unit?.number} · {property?.name ?? "—"}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {inr(tenant.rentAmount)}
                        </div>
                        <div className="text-[11px] text-slate-400">/month</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="text-slate-500">{tenant.phone}</span>
                      <span
                        className={
                          expired
                            ? "font-medium text-red-600"
                            : expiring
                              ? "font-medium text-amber-600"
                              : "text-slate-400"
                        }
                      >
                        {expired
                          ? "Lease expired"
                          : expiring
                            ? `${left}d left`
                            : `Ends ${formatDate(tenant.leaseEnd)}`}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Tenant", "Contact", "Property & Unit", "Rent", "Lease Ends"].map(
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
              {filtered.map((tenant) => {
                const { property, floor, unit } = locate(tenant);
                const left = daysUntil(tenant.leaseEnd);
                const expiring = left <= EXPIRING_WINDOW_DAYS && left > 0;
                const expired = left <= 0;

                return (
                  <tr
                    key={tenant.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Image
                          src={tenant.photo}
                          alt=""
                          width={36}
                          height={36}
                          className="size-9 shrink-0 rounded-lg bg-slate-100 object-cover"
                          unoptimized
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {tenant.name}
                            </span>
                            {(tenant.members ?? []).length > 0 && (
                              <span
                                title={`${tenant.members.length} household member${tenant.members.length > 1 ? "s" : ""}`}
                                className="flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                              >
                                <Users className="size-3" aria-hidden />
                                +{tenant.members.length}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            {tenant.occupation}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{tenant.phone}</div>
                      <div className="max-w-[180px] truncate text-xs text-slate-400">
                        {tenant.email}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-800">
                        {property?.name ?? "—"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {floor?.name} · Unit {unit?.number}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {inr(tenant.rentAmount)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Dep: {inr(tenant.deposit)}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-medium ${
                          expired
                            ? "text-red-600"
                            : expiring
                              ? "text-amber-600"
                              : "text-slate-700"
                        }`}
                      >
                        {formatDate(tenant.leaseEnd)}
                      </div>
                      {expiring && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          {left}d left
                        </span>
                      )}
                      {expired && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                          Expired
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="text-xs font-medium whitespace-nowrap text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            No tenants found.
          </div>
        )}
      </div>

      <AddTenantDialog
        open={showAdd}
        onOpenChange={closeAdd}
        unitId={unitParam || undefined}
      />
    </div>
  );
}
