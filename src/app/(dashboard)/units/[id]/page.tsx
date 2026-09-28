"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseholdMembersCard } from "@/components/tenants/household-members-card";
import { DocumentCard } from "@/components/documents/document-card";
import { RentHistoryCard } from "@/components/rent/rent-history-card";
import { useDocuments, useProperties, useTenants } from "@/lib/queries";
import { formatDate, inr, tenancyYear } from "@/lib/format";
import { householdSummary } from "@/lib/members";
import { tenantOfUnit } from "@/lib/tenancy";
import type { UnitStatus } from "@/types";

const STATUS_PILL: Record<UnitStatus, string> = {
  occupied: "text-green-600 bg-green-50 border-green-200",
  vacant: "text-red-600 bg-red-50 border-red-200",
  maintenance: "text-amber-600 bg-amber-50 border-amber-200",
};

/** Shows only the final group of an ID number, e.g. ●●●● ●●●● 0123. */
function maskId(value: string): string {
  const groups = value.trim().split(/\s+/);
  if (groups.length < 2) {
    return value.length <= 4 ? value : `●●●●${value.slice(-4)}`;
  }
  return [...groups.slice(0, -1).map((g) => "●".repeat(g.length)), groups.at(-1)].join(
    " ",
  );
}

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: properties, isPending } = useProperties();
  const { data: tenants } = useTenants();
  const { data: documents } = useDocuments();

  if (isPending || !properties) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-5 w-64" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // Walk the tree once to recover the unit together with its parents.
  const located = properties.flatMap((property) =>
    property.floors.flatMap((floor) =>
      floor.units
        .filter((unit) => unit.id === id)
        .map((unit) => ({ unit, floor, property })),
    ),
  )[0];

  if (!located) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-700">Unit not found.</p>
        <Link
          href="/properties"
          className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Back to properties
        </Link>
      </div>
    );
  }

  const { unit, floor, property } = located;
  const tenant = tenantOfUnit(tenants, unit.id);
  // Filed against the tenancy: the lease itself, plus the primary tenant's own
  // papers. A member's documents live on the member — see their View button in
  // the household card — or the list reads as duplicates of one another.
  const tenantDocs = tenant
    ? (documents ?? []).filter(
        (d) =>
          d.tenantId === tenant.id &&
          (!d.personId || d.personId === tenant.personId),
      )
    : [];

  // Counted from the lease start's anniversary, so a long tenancy shows the
  // year it is actually in rather than a bar stuck at 100%.
  const year = tenant ? tenancyYear(tenant.leaseStart, tenant.leaseEnd) : null;

  const members = tenant?.members ?? [];

  const facts = [
    { label: "Monthly Rent", value: inr(unit.rent) },
    { label: "Security Deposit", value: inr(unit.deposit) },
    { label: "Floor", value: floor.name },
    { label: "Property", value: property.type },
    // The primary tenant counts towards occupancy alongside their household.
    {
      label: "Occupants",
      value: tenant ? String(members.length + 1) : "—",
    },
    { label: "Household", value: tenant ? householdSummary(members) : "—" },
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <li>
            <Link href="/properties" className="hover:text-blue-300">
              Properties
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li>
            <Link
              href={`/properties/${property.id}`}
              className="hover:text-blue-600"
            >
              {property.name}
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li className="font-semibold text-slate-800 dark:text-white" aria-current="page">
            {floor.name} · Unit {unit.number}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Unit facts */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Unit {unit.number}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {floor.name} · {property.name}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_PILL[unit.status]}`}
              >
                {unit.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 text-xs text-slate-400">{fact.label}</div>
                  <div className="truncate text-sm font-semibold text-slate-800">
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant */}
          {tenant ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Current Tenant
                  </h3>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Primary
                  </span>
                </div>
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  View Profile →
                </Link>
              </div>

              <div className="flex items-start gap-4">
                <Image
                  src={tenant.photo}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-xl bg-slate-100 object-cover"
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold text-slate-900">
                    {tenant.name}
                  </h4>
                  <p className="text-sm text-slate-500">{tenant.occupation}</p>

                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Phone</dt>
                      <dd className="font-medium text-slate-700">
                        {tenant.phone}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-400">Email</dt>
                      <dd className="truncate font-medium text-slate-700">
                        {tenant.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Lease Start</dt>
                      <dd className="font-medium text-slate-700">
                        {formatDate(tenant.leaseStart)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Lease End</dt>
                      <dd className="font-medium text-slate-700">
                        {formatDate(tenant.leaseEnd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">{tenant.idType}</dt>
                      <dd className="font-mono text-xs font-medium text-slate-700">
                        {maskId(tenant.idNumber)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Deposit Paid</dt>
                      <dd className="font-medium text-slate-700">
                        {inr(tenant.deposit)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/tenants/${tenant.id}`}
                  className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  Edit Details
                </Link>
                <Link
                  href={`/rent?tenant=${tenant.id}`}
                  className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  Record Rent
                </Link>
                <Link
                  href="/documents"
                  className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
                >
                  Upload Document
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-slate-100">
                <Users className="size-6 text-slate-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-slate-500">No tenant assigned</p>
              <Link
                href={`/tenants?add=1&unit=${unit.id}`}
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Add Tenant →
              </Link>
            </div>
          )}

          {/* Household */}
          {tenant && <HouseholdMembersCard tenant={tenant} />}

          {/* Documents */}
          {tenantDocs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="font-display mb-4 text-base font-semibold text-slate-900">
                Documents
              </h3>
              <div className="space-y-2.5">
                {tenantDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {tenant ? (
            <RentHistoryCard tenant={tenant} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-slate-700">
                Rent History
              </h3>
              <p className="text-sm text-slate-400">No tenant assigned</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Lease Duration
              </h3>
              {year && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  Year {year.year}
                </span>
              )}
            </div>

            {tenant && year ? (
              <div className="space-y-2 text-sm">
                <div>
                  <div className="mb-0.5 text-xs text-slate-400">
                    {year.year > 1 ? "Year started" : "Start Date"}
                  </div>
                  <div className="font-medium text-slate-800">
                    {formatDate(year.start)}
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 text-xs text-slate-400">
                    Completes one year on
                  </div>
                  <div className="font-medium text-slate-800">
                    {formatDate(year.end)}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <div className="mb-1 text-xs text-slate-400">Progress</div>
                  <div
                    role="progressbar"
                    aria-valuenow={year.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Year ${year.year} progress`}
                    className="h-2 w-full rounded-full bg-slate-100"
                  >
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${year.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>{year.progress}% complete</span>
                    <span>
                      {year.daysLeft === 0
                        ? "Anniversary today"
                        : `${year.daysLeft} days left`}
                    </span>
                  </div>
                </div>

                {/* The agreement can run out before the year does. */}
                {year.endsBeforeAnniversary && (
                  <p className="border-t border-slate-100 pt-2 text-xs text-amber-700">
                    Lease ends {formatDate(tenant.leaseEnd)}, before this year
                    completes.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No active lease</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
