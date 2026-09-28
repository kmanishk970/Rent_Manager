"use client";

import { useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AddFloorDialog } from "@/components/properties/add-floor-dialog";
import { AddUnitDialog } from "@/components/properties/add-unit-dialog";
import { useDeleteUnit, useProperty, useTenants } from "@/lib/queries";
import { inrK } from "@/lib/format";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/http";
import { tenantOfUnit } from "@/lib/tenancy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Unit, UnitStatus } from "@/types";

const STATUS_CARD: Record<UnitStatus, string> = {
  occupied: "bg-green-100 text-green-700 border-green-200",
  vacant: "bg-red-50 text-red-600 border-red-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_DOT: Record<UnitStatus, string> = {
  occupied: "bg-green-500",
  vacant: "bg-red-500",
  maintenance: "bg-amber-500",
};

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: property, isPending } = useProperty(id);
  const { data: tenants } = useTenants();

  const [showAddFloor, setShowAddFloor] = useState(false);
  // Which floor's "Add Unit" dialog is open, by floor id — one piece of state
  // rather than a boolean per floor.
  const [addUnitFloorId, setAddUnitFloorId] = useState<string | null>(null);
  // The unit being edited, and the one awaiting a delete confirmation.
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmingUnit, setConfirmingUnit] = useState<Unit | null>(null);
  const deleteUnit = useDeleteUnit();

  if (isPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-700">Property not found.</p>
        <Link
          href="/properties"
          className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Back to properties
        </Link>
      </div>
    );
  }

  const allUnits = property.floors.flatMap((f) => f.units);
  const occupied = allUnits.filter((u) => u.status === "occupied").length;
  const vacant = allUnits.filter((u) => u.status === "vacant").length;
  const monthlyRent = allUnits
    .filter((u) => u.status === "occupied")
    .reduce((sum, u) => sum + u.rent, 0);

  const addUnitFloor =
    property.floors.find((f) => f.id === addUnitFloorId) ?? null;
  const editingFloor = editingUnit
    ? (property.floors.find((f) => f.id === editingUnit.floorId) ?? null)
    : null;

  const confirmDelete = async () => {
    if (!confirmingUnit) return;
    try {
      await deleteUnit.mutateAsync(confirmingUnit.id);
      toast.success(`Unit ${confirmingUnit.number} deleted`);
      setConfirmingUnit(null);
    } catch (error) {
      // The database refuses while a lease still points at the unit, which is
      // the right answer — deleting a unit must not take a tenancy and its
      // rent history with it. Show what it said rather than a generic failure.
      toast.error(apiErrorMessage(error, "Could not delete that unit"));
    }
  };

  const summary = [
    { label: "Total Units", value: String(allUnits.length), tone: "text-slate-900" },
    { label: "Occupied", value: String(occupied), tone: "text-green-600" },
    { label: "Vacant", value: String(vacant), tone: "text-red-600" },
    { label: "Monthly Rent", value: inrK(monthlyRent), tone: "text-blue-600" },
  ];

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <li>
            <Link href="/properties" className="transition-colors hover:text-blue-300">
              Properties
            </Link>
          </li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li className="font-semibold text-slate-800 dark:text-white" aria-current="page">
            {property.name}
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card">
        <div className="relative h-48">
          <Image
            src={property.image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute right-5 bottom-4 left-5">
            <h2 className="font-display text-2xl font-bold text-white">
              {property.name}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="size-3.5 shrink-0" />
              {property.address}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          {summary.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-slate-50 p-3 text-center">
              <div className={`font-display text-xl font-bold ${stat.tone}`}>
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend + floor action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {(["occupied", "vacant", "maintenance"] as const).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${STATUS_DOT[status]}`} />
              <span className="capitalize text-slate-600 dark:text-slate-300">
                {status}
              </span>
            </div>
          ))}
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="text-slate-500 dark:text-slate-400">
            Click a unit to view details
          </span>
        </div>

        {property.floors.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowAddFloor(true)}
            className="gap-2"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Add Floor
          </Button>
        )}
      </div>

      {property.floors.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No floors yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add a floor, then add its units — tenants are assigned to units.
          </p>
          <Button onClick={() => setShowAddFloor(true)} className="mt-4 gap-2">
            <Plus className="size-4" strokeWidth={2.5} />
            Add Floor
          </Button>
        </div>
      )}

      {/* Floors, top floor first — matching how the design stacks them. */}
      {property.floors
        .slice()
        .reverse()
        .map((floor) => (
          <div
            key={floor.id}
            className="overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-card"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100">
                  <span className="font-mono text-sm font-bold text-blue-700">
                    {floor.number}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {floor.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {floor.units.length} units
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-medium text-green-600">
                  {floor.units.filter((u) => u.status === "occupied").length}{" "}
                  occupied
                </span>
                <span>·</span>
                <span className="text-red-500">
                  {floor.units.filter((u) => u.status === "vacant").length} vacant
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddUnitFloorId(floor.id)}
                  className="ml-1 gap-1.5"
                >
                  <Plus className="size-3.5" strokeWidth={2.5} />
                  Add Unit
                </Button>
              </div>
            </div>

            {floor.units.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No units on this floor yet.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {floor.units.map((unit) => {
                const tenant = tenantOfUnit(tenants, unit.id);

                return (
                  <div key={unit.id} className="group/unit relative">
                    {/* The actions cannot live inside the Link — a button
                        nested in an anchor is invalid and swallows the click. */}
                    <div className="absolute top-1.5 right-1.5 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover/unit:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => setEditingUnit(unit)}
                        aria-label={`Edit unit ${unit.number}`}
                        title="Edit unit"
                        className="rounded-md bg-white/90 p-1 text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-blue-600"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingUnit(unit)}
                        aria-label={`Delete unit ${unit.number}`}
                        title="Delete unit"
                        className="rounded-md bg-white/90 p-1 text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-red-600"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>

                  <Link
                    href={`/units/${unit.id}`}
                    className={`relative block rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${STATUS_CARD[unit.status]}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-base font-bold">
                        {unit.number}
                      </span>
                      <span
                        className={`size-2 rounded-full ${STATUS_DOT[unit.status]}`}
                      />
                    </div>

                    <div className="text-xs font-medium opacity-80">
                      {inrK(unit.rent)}/mo
                    </div>

                    {tenant && (
                      <div className="mt-2 truncate text-xs leading-tight opacity-70">
                        {tenant.name}
                      </div>
                    )}
                    {unit.status === "vacant" && (
                      <div className="mt-2 text-xs font-medium text-red-500">
                        Available
                      </div>
                    )}
                    {unit.status === "maintenance" && (
                      <div className="mt-2 text-xs font-medium text-amber-600">
                        Maintenance
                      </div>
                    )}
                  </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      <AddFloorDialog
        open={showAddFloor}
        onOpenChange={setShowAddFloor}
        propertyId={property.id}
        // Next number up from the highest existing floor, so the common case
        // needs no typing at all.
        nextFloorNumber={
          property.floors.reduce((max, f) => Math.max(max, f.number), 0) + 1
        }
      />

      {addUnitFloor && (
        <AddUnitDialog
          open
          onOpenChange={(open) => !open && setAddUnitFloorId(null)}
          propertyId={property.id}
          floorId={addUnitFloor.id}
          floorName={addUnitFloor.name}
          // Follows the design's convention: floor 2 → 201, 202, …
          suggestedNumber={`${addUnitFloor.number}0${addUnitFloor.units.length + 1}`}
        />
      )}

      {editingUnit && (
        <AddUnitDialog
          open
          onOpenChange={(open) => !open && setEditingUnit(null)}
          propertyId={property.id}
          floorId={editingUnit.floorId}
          floorName={editingFloor?.name ?? ""}
          suggestedNumber={editingUnit.number}
          unit={editingUnit}
        />
      )}

      <Dialog
        open={Boolean(confirmingUnit)}
        onOpenChange={(open) => !open && setConfirmingUnit(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold text-slate-900">
              Delete unit {confirmingUnit?.number}?
            </DialogTitle>
            <DialogDescription>
              {confirmingUnit?.status === "occupied"
                ? "This unit is occupied. Its tenancy has to be ended before the unit can be removed."
                : "This cannot be undone. Meter readings taken on this unit go with it."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingUnit(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteUnit.isPending}
            >
              {deleteUnit.isPending ? "Deleting…" : "Delete unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
