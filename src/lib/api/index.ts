import {
  documents as seedDocuments,
  notifications as seedNotifications,
  ownerProfile as seedOwner,
  properties as seedProperties,
  rentBills as seedBills,
  rentPayments as seedPayments,
  tenants as seedTenants,
} from "@/lib/mock-data";
import type {
  AppNotification,
  DocumentType,
  Floor,
  HouseholdMember,
  OwnerProfile,
  Property,
  PropertyDocument,
  RentBill,
  RentPayment,
  Tenant,
  Unit,
} from "@/types";

/**
 * The mock API.
 *
 * Every screen reads and writes through this module — never through the seed
 * data directly. Each function is shaped like the HTTP call that will replace
 * it, so swapping in NestJS means rewriting these bodies and nothing else.
 *
 * State lives in module-level arrays, so it survives client-side navigation but
 * resets on a full reload. That is deliberate: it keeps the mock honest about
 * being a mock.
 */

const LATENCY_MS = 120;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let properties: Property[] = clone(seedProperties);
let tenants: Tenant[] = clone(seedTenants);
let bills: RentBill[] = clone(seedBills);
let payments: RentPayment[] = clone(seedPayments);
let documents: PropertyDocument[] = clone(seedDocuments);
let notifications: AppNotification[] = clone(seedNotifications);
let owner: OwnerProfile = clone(seedOwner);

/** Monotonic id generator, standing in for the database's id assignment. */
let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}${++idCounter}`;

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export function listProperties(): Promise<Property[]> {
  return delay(clone(properties));
}

export function getProperty(id: string): Promise<Property | null> {
  return delay(clone(properties.find((p) => p.id === id) ?? null));
}

export interface NewPropertyInput {
  name: string;
  location: string;
  address: string;
  type: string;
}

export function createProperty(input: NewPropertyInput): Promise<Property> {
  const property: Property = {
    id: nextId("p"),
    ...input,
    image:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop&auto=format",
    floors: [],
  };
  properties = [...properties, property];
  return delay(clone(property));
}

export interface NewFloorInput {
  propertyId: string;
  name: string;
  number: number;
}

export function createFloor(input: NewFloorInput): Promise<Floor> {
  const floor: Floor = {
    id: nextId("f"),
    propertyId: input.propertyId,
    number: input.number,
    name: input.name,
    units: [],
  };

  properties = properties.map((p) =>
    p.id === input.propertyId
      ? // Kept ordered by floor number so the detail page, which renders them
        // in reverse, always shows the top floor first.
        { ...p, floors: [...p.floors, floor].sort((a, b) => a.number - b.number) }
      : p,
  );

  return delay(clone(floor));
}

export interface NewUnitInput {
  propertyId: string;
  floorId: string;
  number: string;
  rent: number;
  deposit: number;
}

export function createUnit(input: NewUnitInput): Promise<Unit> {
  const unit: Unit = {
    id: nextId("u"),
    floorId: input.floorId,
    propertyId: input.propertyId,
    number: input.number,
    rent: input.rent,
    deposit: input.deposit,
    // A new unit has nobody in it; assigning a tenant is what occupies it.
    status: "vacant",
  };

  properties = properties.map((p) =>
    p.id === input.propertyId
      ? {
          ...p,
          floors: p.floors.map((f) =>
            f.id === input.floorId ? { ...f, units: [...f.units, unit] } : f,
          ),
        }
      : p,
  );

  return delay(clone(unit));
}

/** Flattens the property → floor → unit tree, which most screens want. */
export function listUnits(): Promise<Unit[]> {
  const units = properties.flatMap((p) => p.floors.flatMap((f) => f.units));
  return delay(clone(units));
}

export function getUnit(id: string): Promise<Unit | null> {
  const unit = properties
    .flatMap((p) => p.floors.flatMap((f) => f.units))
    .find((u) => u.id === id);
  return delay(clone(unit ?? null));
}

/* ------------------------------------------------------------------ */
/* Tenants                                                             */
/* ------------------------------------------------------------------ */

export function listTenants(): Promise<Tenant[]> {
  return delay(clone(tenants));
}

export function getTenant(id: string): Promise<Tenant | null> {
  return delay(clone(tenants.find((t) => t.id === id) ?? null));
}

/** A member as the form supplies it — the id is the server's to assign. */
export type NewMemberInput = Omit<HouseholdMember, "id">;

export type NewTenantInput = Omit<Tenant, "id" | "photo" | "members"> &
  Partial<Pick<Tenant, "photo">> & { members?: NewMemberInput[] };

export function createTenant(input: NewTenantInput): Promise<Tenant> {
  const tenant: Tenant = {
    ...input,
    id: nextId("t"),
    photo:
      input.photo ??
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format",
    // Members arrive without ids, the same way they will from the API client.
    members: (input.members ?? []).map((m) => ({ ...m, id: nextId("m") })),
  };
  tenants = [...tenants, tenant];

  // Occupying a unit is part of the same transaction on the backend.
  properties = properties.map((p) => ({
    ...p,
    floors: p.floors.map((f) => ({
      ...f,
      units: f.units.map((u) =>
        u.id === tenant.unitId
          ? { ...u, status: "occupied" as const, tenantId: tenant.id }
          : u,
      ),
    })),
  }));

  return delay(clone(tenant));
}

/* ------------------------------------------------------------------ */
/* Household members                                                   */
/* ------------------------------------------------------------------ */

/** Replaces one tenant's member list, returning the updated tenant. */
function withMembers(
  tenantId: string,
  update: (members: HouseholdMember[]) => HouseholdMember[],
): Tenant {
  const current = tenants.find((t) => t.id === tenantId);
  if (!current) throw new Error(`Unknown tenant: ${tenantId}`);

  const next: Tenant = { ...current, members: update(current.members) };
  tenants = tenants.map((t) => (t.id === tenantId ? next : t));
  return next;
}

export interface AddMemberInput extends NewMemberInput {
  tenantId: string;
}

export function addHouseholdMember(input: AddMemberInput): Promise<Tenant> {
  const { tenantId, ...member } = input;
  const next = withMembers(tenantId, (members) => [
    ...members,
    { ...member, id: nextId("m") },
  ]);
  return delay(clone(next));
}

export interface UpdateMemberInput extends Partial<NewMemberInput> {
  tenantId: string;
  memberId: string;
}

export function updateHouseholdMember(
  input: UpdateMemberInput,
): Promise<Tenant> {
  const { tenantId, memberId, ...patch } = input;
  const next = withMembers(tenantId, (members) =>
    members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
  );
  return delay(clone(next));
}

export function removeHouseholdMember(input: {
  tenantId: string;
  memberId: string;
}): Promise<Tenant> {
  const next = withMembers(input.tenantId, (members) =>
    members.filter((m) => m.id !== input.memberId),
  );
  return delay(clone(next));
}

/**
 * Swaps which person the tenancy is named after.
 *
 * The tenant record itself survives — same id, same unit, same lease dates and
 * figures — because the rent ledger, the documents and the unit's `tenantId`
 * all point at it. Only the person on it changes: the chosen member moves into
 * the primary slot, and the outgoing primary takes their place in the household.
 */
export interface ChangePrimaryTenantInput {
  tenantId: string;
  /** The household member being promoted. */
  memberId: string;
  /** Identity for the incoming primary — a member record carries less than a tenant needs. */
  primary: Pick<
    Tenant,
    | "name"
    | "phone"
    | "email"
    | "occupation"
    | "address"
    | "city"
    | "state"
    | "pincode"
    | "idType"
    | "idNumber"
  > &
    Partial<Pick<Tenant, "photo">>;
  /** How the outgoing primary now relates to the incoming one. */
  outgoing: Omit<NewMemberInput, "name">;
}

export function changePrimaryTenant(
  input: ChangePrimaryTenantInput,
): Promise<Tenant> {
  const current = tenants.find((t) => t.id === input.tenantId);
  if (!current) throw new Error(`Unknown tenant: ${input.tenantId}`);

  const promoted = current.members.find((m) => m.id === input.memberId);
  if (!promoted) throw new Error(`Unknown member: ${input.memberId}`);

  const next: Tenant = {
    ...current,
    ...input.primary,
    photo: input.primary.photo ?? current.photo,
    members: [
      // The outgoing primary is listed first, mirroring where they came from.
      { ...input.outgoing, id: nextId("m"), name: current.name },
      ...current.members.filter((m) => m.id !== input.memberId),
    ],
  };

  tenants = tenants.map((t) => (t.id === next.id ? next : t));

  // Both of these denormalise the tenant's name rather than snapshotting it, so
  // they follow the rename instead of going stale.
  payments = payments.map((p) =>
    p.tenantId === next.id ? { ...p, tenantName: next.name } : p,
  );
  documents = documents.map((d) =>
    d.tenantId === next.id ? { ...d, tenantName: next.name } : d,
  );

  return delay(clone(next));
}

/* ------------------------------------------------------------------ */
/* Rent                                                                */
/* ------------------------------------------------------------------ */

export function listPayments(): Promise<RentPayment[]> {
  return delay(clone(payments));
}

export function listBills(): Promise<RentBill[]> {
  return delay(clone(bills));
}

export interface NewBillInput {
  tenantId: string;
  month: string;
  rent: number;
  electricity: number;
  otherCharges?: number;
  otherLabel?: string;
  dueDate?: string;
  note?: string;
}

export function createBill(input: NewBillInput): Promise<RentBill> {
  const tenant = tenants.find((t) => t.id === input.tenantId);
  if (!tenant) throw new Error(`Unknown tenant: ${input.tenantId}`);

  // One bill per tenancy per month — re-billing a month replaces it rather
  // than doubling what is owed.
  const existing = bills.find(
    (b) => b.tenantId === tenant.id && b.month === input.month,
  );

  const bill: RentBill = {
    id: existing?.id ?? nextId("b"),
    tenantId: tenant.id,
    unitId: tenant.unitId,
    propertyId: tenant.propertyId,
    month: input.month,
    rent: input.rent,
    electricity: input.electricity,
    otherCharges: input.otherCharges ?? 0,
    otherLabel: input.otherLabel,
    dueDate: input.dueDate || `${input.month}-05`,
    note: input.note,
  };

  bills = existing
    ? bills.map((b) => (b.id === existing.id ? bill : b))
    : [...bills, bill];

  return delay(clone(bill));
}

export function deleteBill(id: string): Promise<{ id: string }> {
  bills = bills.filter((b) => b.id !== id);
  return delay({ id });
}

export interface NewPaymentInput {
  tenantId: string;
  /** "2026-09" — which month the money settles. */
  month: string;
  amount: number;
  date: string;
  method: RentPayment["method"];
  transactionId: string;
}

export function recordPayment(input: NewPaymentInput): Promise<RentPayment> {
  const tenant = tenants.find((t) => t.id === input.tenantId);
  if (!tenant) throw new Error(`Unknown tenant: ${input.tenantId}`);

  const property = properties.find((p) => p.id === tenant.propertyId);

  const payment: RentPayment = {
    id: nextId("r"),
    tenantId: tenant.id,
    tenantName: tenant.name,
    unitId: tenant.unitId,
    propertyId: tenant.propertyId,
    propertyName: property?.name ?? "",
    amount: input.amount,
    date: input.date,
    method: input.method,
    transactionId: input.transactionId,
    // A recorded payment is money that arrived; whether the month is settled
    // is the ledger's call, not this row's.
    status: "paid",
    month: input.month,
  };

  // Payments accumulate — a month may be settled in several instalments.
  payments = [payment, ...payments];

  return delay(clone(payment));
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export function listDocuments(): Promise<PropertyDocument[]> {
  return delay(clone(documents));
}

export interface NewDocumentInput {
  name: string;
  type: DocumentType;
  tenantId?: string;
  propertyId?: string;
}

export function createDocument(
  input: NewDocumentInput,
): Promise<PropertyDocument> {
  const tenant = tenants.find((t) => t.id === input.tenantId);
  const property = properties.find((p) => p.id === input.propertyId);

  const doc: PropertyDocument = {
    id: nextId("d"),
    name: input.name,
    type: input.type,
    tenantId: tenant?.id,
    tenantName: tenant?.name,
    propertyId: property?.id,
    propertyName: property?.name,
    uploadDate: new Date().toISOString().slice(0, 10),
    size: "—",
  };
  documents = [doc, ...documents];
  return delay(clone(doc));
}

export function deleteDocument(id: string): Promise<{ id: string }> {
  documents = documents.filter((d) => d.id !== id);
  return delay({ id });
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function listNotifications(): Promise<AppNotification[]> {
  return delay(clone(notifications));
}

export function markNotificationRead(id: string): Promise<AppNotification[]> {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n,
  );
  return delay(clone(notifications));
}

export function markAllNotificationsRead(): Promise<AppNotification[]> {
  notifications = notifications.map((n) => ({ ...n, read: true }));
  return delay(clone(notifications));
}

/* ------------------------------------------------------------------ */
/* Owner                                                               */
/* ------------------------------------------------------------------ */

export function getOwnerProfile(): Promise<OwnerProfile> {
  return delay(clone(owner));
}

export function updateOwnerProfile(
  patch: Partial<OwnerProfile>,
): Promise<OwnerProfile> {
  owner = { ...owner, ...patch };
  return delay(clone(owner));
}
