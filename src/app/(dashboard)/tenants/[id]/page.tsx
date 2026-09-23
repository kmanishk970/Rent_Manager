"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordPaymentDialog } from "@/components/rent/record-payment-dialog";
import { HouseholdMembersCard } from "@/components/tenants/household-members-card";
import { RentHistoryCard } from "@/components/rent/rent-history-card";
import { useDocuments, useProperties, useTenant } from "@/lib/queries";
import { daysUntil, formatDate, inr, tenancyYear } from "@/lib/format";
import { DOCUMENT_TYPE_ICONS, DOCUMENT_TYPE_TONES } from "@/lib/documents";

/** Replaces every character except the last four, keeping spacing intact. */
function maskId(value: string): string {
  const keep = 4;
  return value
    .split("")
    .map((char, i) =>
      i < value.length - keep && char !== " " ? "●" : char,
    )
    .join("");
}

export default function TenantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [showId, setShowId] = useState(false);
  const [showRentDialog, setShowRentDialog] = useState(false);

  const { data: tenant, isPending } = useTenant(id);
  const { data: properties } = useProperties();
  const { data: documents } = useDocuments();

  if (isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl" />
          <div className="space-y-5 lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-700">Tenant not found.</p>
        <Link
          href="/tenants"
          className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Back to tenants
        </Link>
      </div>
    );
  }

  const property = properties?.find((p) => p.id === tenant.propertyId);
  const floor = property?.floors.find((f) => f.id === tenant.floorId);
  const unit = floor?.units.find((u) => u.id === tenant.unitId);

  const tenantDocs = (documents ?? []).filter((d) => d.tenantId === tenant.id);

  const left = daysUntil(tenant.leaseEnd);
  const expired = left <= 0;
  const expiring = left > 0 && left <= 60;
  // The twelve months the tenancy is currently in, counted from the lease
  // start's anniversary rather than across the whole agreement.
  const year = tenancyYear(tenant.leaseStart, tenant.leaseEnd);

  const rentalFacts = [
    { label: "Property", value: property?.name ?? "—" },
    { label: "Floor", value: floor?.name ?? "—" },
    { label: "Unit", value: unit ? `Unit ${unit.number}` : "—" },
    { label: "Monthly Rent", value: inr(tenant.rentAmount) },
    { label: "Security Deposit", value: inr(tenant.deposit) },
    { label: "Emergency Contact", value: tenant.emergencyContact },
    {
      label: "Occupants",
      value: String((tenant.members ?? []).length + 1),
    },
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <li>
            <Link href="/tenants" className="hover:text-blue-300">
              Tenants
            </Link>
          </li>
          <ChevronRight className="size-3" aria-hidden />
          <li className="font-semibold text-slate-800 dark:text-white" aria-current="page">
            {tenant.name}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Profile column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-col items-center text-center">
              <Image
                src={tenant.photo}
                alt=""
                width={80}
                height={80}
                className="mb-3 size-20 rounded-2xl bg-slate-100 object-cover shadow-md"
                unoptimized
              />
              <h2 className="font-display text-lg font-bold text-slate-900">
                {tenant.name}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {tenant.occupation}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    expired
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {expired ? "Lease Expired" : "Active Tenant"}
                </span>
                {expiring && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Expiring Soon
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Phone className="size-4 text-slate-500" />
                </div>
                <a
                  href={`tel:${tenant.phone.replace(/\s/g, "")}`}
                  className="text-slate-700 hover:text-blue-600"
                >
                  {tenant.phone}
                </a>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Mail className="size-4 text-slate-500" />
                </div>
                <a
                  href={`mailto:${tenant.email}`}
                  className="truncate text-xs text-slate-700 hover:text-blue-600"
                >
                  {tenant.email}
                </a>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <MapPin className="size-4 text-slate-500" />
                </div>
                <span className="text-xs leading-relaxed text-slate-700">
                  {tenant.address}, {tenant.city}, {tenant.state} -{" "}
                  {tenant.pincode}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">{tenant.idType}</div>
                  <div className="mt-0.5 font-mono text-sm text-slate-800">
                    {showId ? tenant.idNumber : maskId(tenant.idNumber)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowId((s) => !s)}
                  aria-pressed={showId}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {showId ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Actions
            </h3>

            <button
              type="button"
              onClick={() => setShowRentDialog(true)}
              className="flex w-full items-center gap-3 rounded-lg bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              <span aria-hidden>💰</span>
              Record Rent Payment
            </button>

            <Link
              href="/documents"
              className="flex w-full items-center gap-3 rounded-lg bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <span aria-hidden>📎</span>
              Upload Document
            </Link>

            {unit && (
              <Link
                href={`/units/${unit.id}`}
                className="flex w-full items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <span aria-hidden>🏠</span>
                View Unit
              </Link>
            )}
          </div>
        </div>

        {/* Details column */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <h3 className="font-display mb-4 text-base font-semibold text-slate-900">
              Rental Details
            </h3>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {rentalFacts.map((fact) => (
                <div key={fact.label} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 text-xs text-slate-400">{fact.label}</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-blue-900">
                  Lease Information
                </h4>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    expired
                      ? "bg-red-100 text-red-600"
                      : expiring
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {expired ? "Expired" : `${left} days left`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-0.5 text-xs text-blue-500">Start Date</div>
                  <div className="font-semibold text-blue-900">
                    {formatDate(tenant.leaseStart)}
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 text-xs text-blue-500">End Date</div>
                  <div className="font-semibold text-blue-900">
                    {formatDate(tenant.leaseEnd)}
                  </div>
                </div>
              </div>

              {/* Progress through the current twelve months, not the whole
                  agreement — that bar reads 100% for years on a long lease. */}
              <div className="mt-3 border-t border-blue-100 pt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-900">
                    Year {year.year} · {formatDate(year.start)} →{" "}
                    {formatDate(year.end)}
                  </span>
                  <span className="text-blue-500">
                    {year.daysLeft === 0
                      ? "Anniversary today"
                      : `${year.daysLeft} days to anniversary`}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={year.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Year ${year.year} progress`}
                  className="h-2 rounded-full bg-blue-100"
                >
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${year.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-blue-500">
                  {year.progress}% of year {year.year} complete
                </div>
              </div>
            </div>
          </div>

          <HouseholdMembersCard tenant={tenant} />

          <RentHistoryCard tenant={tenant} />

          {/* Documents */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Documents
              </h3>
              <Link
                href="/documents"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Upload New
              </Link>
            </div>

            {tenantDocs.length > 0 ? (
              <div className="space-y-2.5">
                {tenantDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                  >
                    <div
                      aria-hidden
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${DOCUMENT_TYPE_TONES[doc.type]}`}
                    >
                      {(() => {
                        const Icon = DOCUMENT_TYPE_ICONS[doc.type];
                        return <Icon className="size-4" strokeWidth={1.75} />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {doc.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {doc.size} · {formatDate(doc.uploadDate)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                No documents uploaded.
              </p>
            )}
          </div>
        </div>
      </div>

      <RecordPaymentDialog
        open={showRentDialog}
        onOpenChange={setShowRentDialog}
        defaultTenantId={tenant.id}
      />
    </div>
  );
}
