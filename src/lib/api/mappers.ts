import type {
  AppNotification,
  DocumentType,
  ElectricityMode,
  Floor,
  HouseholdMember,
  IdType,
  MemberRelation,
  OwnerProfile,
  PaymentMethod,
  Property,
  PropertyDocument,
  RentBill,
  RentPayment,
  Tenant,
  Unit,
  UnitStatus,
} from "@/types";

/**
 * Between the API and the screens.
 *
 * The backend splits what the frontend calls a `Tenant` into three things — a
 * person, a lease, and who is on it — which is the right shape for a database
 * and the wrong one for a tenant card. Rather than rewrite every screen, the
 * translation lives here: the API module hands back exactly the types the app
 * already renders.
 *
 * One consequence worth knowing: a `Tenant.id` is a **lease** id. Payments,
 * bills and documents all hang off the tenancy, so that is the id they key on.
 */

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const ID_KIND_TO_LABEL: Record<string, IdType> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  voter_id: "Voter ID",
  driving_licence: "Driving License",
};

const LABEL_TO_ID_KIND: Record<IdType, string> = {
  Aadhaar: "aadhaar",
  PAN: "pan",
  Passport: "passport",
  "Voter ID": "voter_id",
  "Driving License": "driving_licence",
};

const METHOD_TO_LABEL: Record<string, PaymentMethod> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
};

const LABEL_TO_METHOD: Record<PaymentMethod, string> = {
  "Bank Transfer": "bank_transfer",
  Cash: "cash",
  UPI: "upi",
  Cheque: "cheque",
};

const DOC_KIND_TO_TYPE: Record<string, DocumentType> = {
  agreement: "agreement",
  id_proof: "id-proof",
  police_verification: "police-verification",
  property_doc: "property-doc",
  other: "other",
};

const TYPE_TO_DOC_KIND: Record<DocumentType, string> = {
  agreement: "agreement",
  "id-proof": "id_proof",
  "police-verification": "police_verification",
  "property-doc": "property_doc",
  other: "other",
};

const NOTIFICATION_KIND_TO_TYPE: Record<string, AppNotification["type"]> = {
  rent_reminder: "rent-reminder",
  lease_expiry: "lease-expiry",
  tenant_update: "tenant-update",
  document_update: "document-update",
  payment_received: "payment-received",
};

/** The API sends relations lower-cased; the UI has always shown them capitalised. */
const toRelation = (value: string): MemberRelation =>
  (value.charAt(0).toUpperCase() + value.slice(1)) as MemberRelation;

export const fromRelation = (relation: MemberRelation) => relation.toLowerCase();
export const toIdKind = (idType: IdType) => LABEL_TO_ID_KIND[idType] ?? "aadhaar";
export const toMethod = (method: PaymentMethod) => LABEL_TO_METHOD[method] ?? "cash";
export const toDocKind = (type: DocumentType) => TYPE_TO_DOC_KIND[type] ?? "other";

/* ------------------------------------------------------------------ */
/* Numbers and dates                                                   */
/* ------------------------------------------------------------------ */

/**
 * Money arrives as a string, because NUMERIC does and parsing it early is how
 * rounding errors get in. The screens format rupees from numbers, so it is
 * converted here — once, at the edge, after all the arithmetic is done.
 */
const money = (value: string | number | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

/** "2026-09-01T00:00:00.000Z" or "2026-09-01" → "2026-09-01". */
const day = (value: string | null | undefined): string =>
  value ? value.slice(0, 10) : "";

/** A period column is a date; the screens key months as "2026-09". */
const monthKey = (value: string | null | undefined): string =>
  value ? value.slice(0, 7) : "";

/* ------------------------------------------------------------------ */
/* API shapes — only the fields the mappers read                       */
/* ------------------------------------------------------------------ */

interface ApiUnit {
  id: string;
  floorId: string;
  propertyId: string;
  number: string;
  defaultRent: string;
  defaultDeposit: string;
  underMaintenance: boolean;
  status?: UnitStatus;
}

interface ApiFloor {
  id: string;
  propertyId: string;
  level: number;
  name: string;
  units?: ApiUnit[];
}

interface ApiProperty {
  id: string;
  name: string;
  locality: string;
  address: string;
  kind: string;
  imageKey: string | null;
  floors?: ApiFloor[];
}

interface ApiPerson {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  dateOfBirth: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  idKind: string | null;
  idNumber: string | null;
  photoKey: string | null;
}

interface ApiOccupant {
  id: string;
  personId: string;
  role: "primary" | "member";
  relation: string | null;
  relationNote: string | null;
  movedIn: string | null;
  movedOut: string | null;
  person: ApiPerson;
}

interface ApiLease {
  id: string;
  unitId: string;
  termStart: string;
  termEnd: string | null;
  rent: string;
  deposit: string;
  dueDay: number;
  status: string;
  emergencyName: string | null;
  emergencyPhone: string | null;
  occupants?: ApiOccupant[];
  unit?: ApiUnit & { property?: ApiProperty; floor?: ApiFloor };
}

interface ApiBillLine {
  id: string;
  kind: string;
  label: string | null;
  amount: string;
  electricityMode: string | null;
  meterPrevious: string | null;
  meterCurrent: string | null;
  unitRate: string | null;
}

interface ApiBill {
  id: string;
  leaseId: string;
  period: string;
  dueDate: string;
  note: string | null;
  lines?: ApiBillLine[];
}

interface ApiPayment {
  id: string;
  leaseId: string;
  period: string;
  amount: string;
  paidOn: string;
  method: string;
  reference: string | null;
}

interface ApiDocument {
  id: string;
  kind: string;
  title: string;
  propertyId: string | null;
  leaseId: string | null;
  personId: string | null;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  uploadedAt: string;
}

interface ApiNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  leaseId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ApiOwner {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  photoKey: string | null;
  plan: string;
  electricityRate: string;
}

/* ------------------------------------------------------------------ */
/* Property tree                                                       */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=500&fit=crop&auto=format";

const PLACEHOLDER_PHOTO =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format";

export function toUnit(unit: ApiUnit): Unit {
  return {
    id: unit.id,
    floorId: unit.floorId,
    propertyId: unit.propertyId,
    number: unit.number,
    rent: money(unit.defaultRent),
    deposit: money(unit.defaultDeposit),
    // Occupancy is derived by the API from leases; only maintenance is stored.
    status: unit.status ?? (unit.underMaintenance ? "maintenance" : "vacant"),
  };
}

export function toFloor(floor: ApiFloor): Floor {
  return {
    id: floor.id,
    propertyId: floor.propertyId,
    number: floor.level,
    name: floor.name,
    units: (floor.units ?? []).map(toUnit),
  };
}

export function toProperty(property: ApiProperty): Property {
  return {
    id: property.id,
    name: property.name,
    location: property.locality,
    address: property.address,
    // The UI capitalises these; the API stores them lower-cased.
    type: property.kind.charAt(0).toUpperCase() + property.kind.slice(1),
    image: property.imageKey ?? PLACEHOLDER_PROPERTY_IMAGE,
    floors: (property.floors ?? []).map(toFloor),
  };
}

/* ------------------------------------------------------------------ */
/* Tenancies                                                           */
/* ------------------------------------------------------------------ */

function toMember(occupant: ApiOccupant): HouseholdMember {
  const { person } = occupant;
  return {
    id: occupant.id,
    name: person.fullName,
    relation: occupant.relation ? toRelation(occupant.relation) : "Other",
    relationNote: occupant.relationNote ?? undefined,
    phone: person.phone ?? undefined,
    age: person.dateOfBirth ? ageFrom(person.dateOfBirth) : undefined,
    occupation: person.occupation ?? undefined,
    idType: person.idKind ? ID_KIND_TO_LABEL[person.idKind] : undefined,
    idNumber: person.idNumber ?? undefined,
  };
}

/** The API stores a date of birth; the card shows an age. */
function ageFrom(dateOfBirth: string): number {
  const born = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return Math.max(0, age);
}

/**
 * A lease, flattened into the tenant card the screens render.
 *
 * The id is the lease's, not the person's: a tenancy is what payments,
 * documents and bills attach to, and it survives a change of primary tenant.
 */
export function toTenant(lease: ApiLease): Tenant {
  const occupants = lease.occupants ?? [];
  const primary = occupants.find((o) => o.role === "primary");
  const person = primary?.person;

  return {
    id: lease.id,
    name: person?.fullName ?? "Unnamed tenant",
    photo: person?.photoKey ?? PLACEHOLDER_PHOTO,
    phone: person?.phone ?? "",
    email: person?.email ?? "",
    address: person?.addressLine ?? "",
    city: person?.city ?? "",
    state: person?.state ?? "",
    pincode: person?.pincode ?? "",
    idType: person?.idKind ? (ID_KIND_TO_LABEL[person.idKind] ?? "Aadhaar") : "Aadhaar",
    idNumber: person?.idNumber ?? "",
    unitId: lease.unitId,
    propertyId: lease.unit?.propertyId ?? "",
    floorId: lease.unit?.floorId ?? "",
    rentAmount: money(lease.rent),
    deposit: money(lease.deposit),
    leaseStart: day(lease.termStart),
    leaseEnd: day(lease.termEnd),
    emergencyContact: lease.emergencyName ?? "",
    emergencyPhone: lease.emergencyPhone ?? "",
    occupation: person?.occupation ?? "",
    members: occupants
      .filter((o) => o.role === "member" && !o.movedOut)
      .map(toMember),
  };
}

/* ------------------------------------------------------------------ */
/* Billing                                                            */
/* ------------------------------------------------------------------ */

/**
 * A bill's lines, collapsed back into the flat shape the cards render.
 *
 * The API models charges as line items, which is what lets a month carry water
 * *and* maintenance. The UI still shows rent, electricity and one "other", so
 * anything beyond those two is summed and the first label kept.
 */
export function toBill(bill: ApiBill, unitId: string, propertyId: string): RentBill {
  const lines = bill.lines ?? [];
  const sum = (kind: string) =>
    lines.filter((l) => l.kind === kind).reduce((t, l) => t + money(l.amount), 0);

  const electricity = lines.find((l) => l.kind === "electricity");
  const extras = lines.filter((l) => l.kind !== "rent" && l.kind !== "electricity");

  return {
    id: bill.id,
    tenantId: bill.leaseId,
    unitId,
    propertyId,
    month: monthKey(bill.period),
    rent: sum("rent"),
    electricity: sum("electricity"),
    electricityMode: (electricity?.electricityMode as ElectricityMode) ?? "flat",
    meterPrevious: electricity?.meterPrevious ? money(electricity.meterPrevious) : undefined,
    meterCurrent: electricity?.meterCurrent ? money(electricity.meterCurrent) : undefined,
    unitRate: electricity?.unitRate ? money(electricity.unitRate) : undefined,
    otherCharges: extras.reduce((t, l) => t + money(l.amount), 0),
    otherLabel: extras[0]?.label ?? undefined,
    dueDate: day(bill.dueDate),
    note: bill.note ?? undefined,
  };
}

export function toPayment(
  payment: ApiPayment,
  tenantName: string,
  unitId: string,
  propertyId: string,
  propertyName: string,
): RentPayment {
  return {
    id: payment.id,
    tenantId: payment.leaseId,
    tenantName,
    unitId,
    propertyId,
    propertyName,
    amount: money(payment.amount),
    date: day(payment.paidOn),
    method: METHOD_TO_LABEL[payment.method] ?? "Cash",
    transactionId: payment.reference ?? "",
    // A recorded payment is money that arrived; whether the month is settled
    // is the ledger's call, not this row's.
    status: "paid",
    month: monthKey(payment.period),
  };
}

/* ------------------------------------------------------------------ */
/* Documents, notifications, owner                                     */
/* ------------------------------------------------------------------ */

/** "2.4 MB" — the list shows a size, the API stores bytes. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function toDocument(
  doc: ApiDocument,
  tenantName?: string,
  propertyName?: string,
): PropertyDocument {
  return {
    id: doc.id,
    type: DOC_KIND_TO_TYPE[doc.kind] ?? "other",
    name: doc.title,
    tenantId: doc.leaseId ?? undefined,
    tenantName,
    propertyId: doc.propertyId ?? undefined,
    propertyName,
    uploadDate: day(doc.uploadedAt),
    size: formatBytes(Number(doc.sizeBytes)),
    fileName: doc.originalName,
    mimeType: doc.mimeType,
    // Downloads go through storage, which is not wired up yet.
    previewUrl: undefined,
  };
}

export function toNotification(notification: ApiNotification): AppNotification {
  return {
    id: notification.id,
    type: NOTIFICATION_KIND_TO_TYPE[notification.kind] ?? "tenant-update",
    title: notification.title,
    message: notification.body,
    date: day(notification.createdAt),
    read: notification.readAt !== null,
    tenantId: notification.leaseId ?? undefined,
  };
}

export function toOwnerProfile(owner: ApiOwner): OwnerProfile {
  return {
    name: owner.name,
    email: owner.email,
    phone: owner.phone ?? "",
    photo: owner.photoKey ?? PLACEHOLDER_PHOTO,
    plan: owner.plan.charAt(0).toUpperCase() + owner.plan.slice(1),
    address: owner.address ?? "",
    company: owner.company ?? "",
    electricityRate: money(owner.electricityRate),
  };
}

export type {
  ApiBill, ApiDocument, ApiLease, ApiNotification, ApiOwner,
  ApiPayment, ApiProperty, ApiUnit,
};
