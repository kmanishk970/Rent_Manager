"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { MapPin, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddPropertyDialog } from "@/components/properties/add-property-dialog";
import { useProperties } from "@/lib/queries";
import { inrK } from "@/lib/format";

export default function PropertiesPage() {
  // Search lives in the URL, so a filtered view is shareable and survives back.
  const [search, setSearch] = useQueryState("q", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const [showAdd, setShowAdd] = useState(false);

  const { data: properties, isPending } = useProperties();

  const term = search.trim().toLowerCase();
  const filtered = (properties ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.location.toLowerCase().includes(term),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Properties
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {properties?.length ?? 0} properties in your portfolio
          </p>
        </div>

        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" strokeWidth={2.5} />
          Add Property
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Search properties..."
          aria-label="Search properties"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white pl-9"
        />
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">
            No properties match “{search}”
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Try a different name or location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((property) => {
            const units = property.floors.flatMap((f) => f.units);
            const occupied = units.filter((u) => u.status === "occupied").length;
            const vacant = units.filter((u) => u.status === "vacant").length;
            const maintenance = units.filter(
              (u) => u.status === "maintenance",
            ).length;
            const monthlyRent = units
              .filter((u) => u.status === "occupied")
              .reduce((sum, u) => sum + u.rent, 0);
            const pct = units.length
              ? Math.round((occupied / units.length) * 100)
              : 0;

            // These pills sit on a photograph, whose brightness is unknowable —
            // a sunlit facade on one card, a dark corridor on the next. Pastel
            // tints can't be relied on there, so both badges use a dark scrim
            // and carry their meaning in the text colour instead.
            const occupancyTone =
              pct >= 80
                ? "text-green-300"
                : pct >= 50
                  ? "text-amber-300"
                  : "text-red-300";

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-card transition-all hover:border-blue-200 hover:shadow-card-hover"
              >
                {/* The photo is context, not content — it no longer takes more
                    vertical room than the figures underneath it. */}
                <div className="relative h-32 bg-slate-100">
                  <Image
                    src={property.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <span className="absolute top-2.5 left-2.5 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md">
                    {property.type}
                  </span>
                  <span
                    className={`absolute top-2.5 right-2.5 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md ${occupancyTone}`}
                  >
                    {pct}% occupied
                  </span>
                </div>

                <div className="p-3.5">
                  <h3 className="font-display truncate text-[15px] leading-tight font-bold text-slate-900">
                    {property.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin className="size-3 shrink-0" />
                    {property.location}
                  </div>

                  {/* Counts read as one strip rather than three stacked tiles,
                      which halves the height without losing a figure. */}
                  <div className="mt-3 flex items-stretch overflow-hidden rounded-lg border border-slate-100 text-center">
                    {/* Figures and labels are white; the tinted panel behind
                        each segment carries the meaning. Coloured text on a
                        coloured fill was the weaker half of that pairing. */}
                    <div data-numeric className="flex-1 bg-slate-50 py-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {units.length}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-500 dark:text-white/65">
                        Total
                      </span>
                    </div>
                    <div data-numeric className="flex-1 bg-green-50 py-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {occupied}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-500 dark:text-white/65">
                        Occ.
                      </span>
                    </div>
                    <div data-numeric className="flex-1 bg-red-50 py-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">
                        {vacant}
                      </span>
                      <span className="ml-1 text-[11px] text-slate-500 dark:text-white/65">
                        Vac.
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2.5">
                    <div className="text-[11px] text-slate-400">
                      {property.floors.length} Floors
                      {maintenance > 0 && ` · ${maintenance} in maint.`}
                    </div>
                    <div data-numeric className="flex items-baseline gap-1">
                      <span className="text-base font-bold text-slate-900">
                        {inrK(monthlyRent)}
                      </span>
                      <span className="text-[11px] text-slate-400">/mo</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AddPropertyDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
