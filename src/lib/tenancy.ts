import type { Tenant } from "@/types";

/**
 * Who is living in a unit.
 *
 * The API models occupancy as leases, so a unit does not carry a tenant — it
 * is found by looking for the tenancy that points back at it. A unit that has
 * been let more than once has more than one match, and only the current one is
 * wanted: an ended tenancy still exists, because its rent history does.
 *
 * `listTenants` returns newest first, so the fallback is the most recent — the
 * right answer when every lease on a unit has already ended and the question
 * is "who was the last tenant".
 */
export function tenantOfUnit(
  tenants: Tenant[] | undefined,
  unitId: string,
): Tenant | null {
  const onUnit = (tenants ?? []).filter((tenant) => tenant.unitId === unitId);
  if (onUnit.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const current = onUnit.find(
    (tenant) => !tenant.leaseEnd || tenant.leaseEnd >= today,
  );

  return current ?? onUnit[0];
}
