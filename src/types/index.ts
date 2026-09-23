/**
 * Domain types for RentFlow.
 *
 * The shape mirrors the Figma prototype so screens port over unchanged, with
 * the ids kept as plain strings — Mongo ObjectIds serialise that way, which is
 * what the NestJS backend will return.
 */

export type UnitStatus = "occupied" | "vacant" | "maintenance";

export type IdType =
  | "Aadhaar"
  | "PAN"
  | "Passport"
  | "Voter ID"
  | "Driving License";

export type PaymentMethod = "Bank Transfer" | "Cash" | "UPI" | "Cheque";

/**
 * How a household member relates to the primary tenant. "Other" is the escape
 * hatch — the spelled-out relation travels alongside it in `relationNote`.
 */
export type MemberRelation =
  | "Wife"
  | "Husband"
  | "Son"
  | "Daughter"
  | "Father"
  | "Mother"
  | "Brother"
  | "Sister"
  | "Friend"
  | "Other";

/**
 * How a month stands once its payments are set against its charges.
 * "partial" is money received but short of the total, before the due date.
 */
export type PaymentStatus = "paid" | "partial" | "pending" | "overdue";

export type DocumentType =
  | "agreement"
  | "id-proof"
  | "police-verification"
  | "property-doc"
  | "other";

export type NotificationType =
  | "rent-reminder"
  | "lease-expiry"
  | "tenant-update"
  | "document-update"
  | "payment-received";

export interface Unit {
  id: string;
  floorId: string;
  propertyId: string;
  number: string;
  rent: number;
  deposit: number;
  status: UnitStatus;
  tenantId?: string;
}

export interface Floor {
  id: string;
  propertyId: string;
  number: number;
  name: string;
  units: Unit[];
}

export interface Property {
  id: string;
  name: string;
  location: string;
  address: string;
  type: string;
  image: string;
  floors: Floor[];
}

/**
 * Somebody who lives in the unit but is not the person on the lease. Rent, the
 * deposit and the lease dates all stay with the primary tenant; a member only
 * carries the details a landlord needs for occupancy and police verification.
 */
export interface HouseholdMember {
  id: string;
  name: string;
  relation: MemberRelation;
  /** Spelled out, used when `relation` is "Other". */
  relationNote?: string;
  phone?: string;
  age?: number;
  occupation?: string;
  idType?: IdType;
  idNumber?: string;
}

export interface Tenant {
  id: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  idType: IdType;
  idNumber: string;
  unitId: string;
  propertyId: string;
  floorId: string;
  rentAmount: number;
  deposit: number;
  leaseStart: string;
  leaseEnd: string;
  emergencyContact: string;
  emergencyPhone: string;
  occupation: string;
  /** Co-occupants sharing the unit. Empty when the tenant lives alone. */
  members: HouseholdMember[];
}

/**
 * What a tenancy owes for one month: the rent plus whatever else is billed on
 * top of it. Payments are recorded separately and set against this, so a month
 * can be settled in instalments and any shortfall or advance carries forward.
 */
/**
 * How a month's electricity was arrived at. Metered units bill the difference
 * between two readings; a unit with no sub-meter takes a flat figure.
 */
export type ElectricityMode = "meter" | "flat";

export interface RentBill {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  /** "2026-09" — sortable, and unambiguous about which year it belongs to. */
  month: string;
  rent: number;
  /** The rupee figure, derived from the readings when metered. */
  electricity: number;
  electricityMode: ElectricityMode;
  /**
   * Meter readings are cumulative, so the month's consumption is the
   * difference between them. Both are stored rather than just the units used,
   * so a bill can always show its own working.
   *
   * The meter belongs to the unit, not the tenant — it keeps counting across a
   * change of tenancy.
   */
  meterPrevious?: number;
  meterCurrent?: number;
  /** ₹ per unit at the time of billing, so a later tariff change is not retroactive. */
  unitRate?: number;
  /** Maintenance, water, parking — whatever else the landlord adds. */
  otherCharges: number;
  otherLabel?: string;
  /** "2026-09-05" — after this the month counts as overdue, not pending. */
  dueDate: string;
  note?: string;
}

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  unitId: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  transactionId: string;
  status: PaymentStatus;
  /** "2026-09" — the month this money is set against. */
  month: string;
}

export interface PropertyDocument {
  id: string;
  type: DocumentType;
  name: string;
  tenantId?: string;
  tenantName?: string;
  propertyId?: string;
  propertyName?: string;
  uploadDate: string;
  /** Human-readable, e.g. "2.4 MB". Seeded rows carry it as given. */
  size: string;
  /** The file as chosen on disk, when one was picked. */
  fileName?: string;
  mimeType?: string;
  /**
   * An object URL for the picked file, so it can be opened in this session.
   * Storage is not wired up, so it does not survive a reload — which is also
   * true of everything else the mock API holds.
   */
  previewUrl?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  tenantId?: string;
}

export interface OwnerProfile {
  name: string;
  email: string;
  phone: string;
  photo: string;
  plan: string;
  address: string;
  company: string;
  /** Default ₹ per electricity unit, pre-filled into every new bill. */
  electricityRate: number;
}
