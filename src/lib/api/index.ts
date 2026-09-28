import { http } from "./http";
import type { UploadedMedia } from "./media";
import {
  fromRelation,
  toBill,
  toDocKind,
  toDocument,
  toIdKind,
  toMethod,
  toNotification,
  toOwnerProfile,
  toPayment,
  toProperty,
  toTenant,
  toUnit,
  type ApiBill,
  type ApiDocument,
  type ApiLease,
  type ApiNotification,
  type ApiOwner,
  type ApiPayment,
  type ApiProperty,
  type ApiUnit,
} from "./mappers";
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
 * The API client.
 *
 * Every screen reads and writes through this module and nothing else, which is
 * what made replacing the in-memory mock a change to this one file. The
 * signatures are unchanged; only the bodies moved from arrays to HTTP.
 *
 * Shapes are translated in ./mappers: the API splits a tenancy into a person,
 * a lease and its occupants, and the screens still want the flat tenant card
 * they were designed around.
 *
 * Files are the one thing that does not go through here first: they are sent
 * to /media/upload by ./media, and the URL that comes back is passed into
 * whichever call below saves the row.
 */

export { deleteMedia, downloadUrl, uploadMedia } from "./media";
export type { MediaFolder, UploadedMedia, UploadOptions } from "./media";

const get = async <T>(url: string, params?: object): Promise<T> =>
  (await http.get<T>(url, { params })).data;

/* ------------------------------------------------------------------ */
/* Properties                                                          */
/* ------------------------------------------------------------------ */

export async function listProperties(): Promise<Property[]> {
  const data = await get<ApiProperty[]>("/properties");
  return data.map(toProperty);
}

export async function getProperty(id: string): Promise<Property | null> {
  const data = await get<ApiProperty>(`/properties/${id}`);
  return data ? toProperty(data) : null;
}

export interface NewPropertyInput {
  name: string;
  location: string;
  address: string;
  type: string;
}

export async function createProperty(input: NewPropertyInput): Promise<Property> {
  const { data } = await http.post<ApiProperty>("/properties", {
    name: input.name,
    locality: input.location,
    address: input.address,
    kind: input.type.toLowerCase(),
  });
  return toProperty(data);
}

export interface NewFloorInput {
  propertyId: string;
  name: string;
  number: number;
}

export async function createFloor(input: NewFloorInput): Promise<Floor> {
  const { data } = await http.post<{ id: string; propertyId: string; level: number; name: string }>(
    `/properties/${input.propertyId}/floors`,
    { level: input.number, name: input.name },
  );
  return { id: data.id, propertyId: data.propertyId, number: data.level, name: data.name, units: [] };
}

export interface NewUnitInput {
  propertyId: string;
  floorId: string;
  number: string;
  rent: number;
  deposit: number;
}

export async function createUnit(input: NewUnitInput): Promise<Unit> {
  const { data } = await http.post<ApiUnit>(`/properties/${input.propertyId}/units`, {
    floorId: input.floorId,
    number: input.number,
    defaultRent: input.rent.toFixed(2),
    defaultDeposit: input.deposit.toFixed(2),
  });
  return toUnit(data);
}

export async function listUnits(): Promise<Unit[]> {
  const data = await get<ApiUnit[]>("/units");
  return data.map(toUnit);
}

export async function getUnit(id: string): Promise<Unit | null> {
  const data = await get<ApiUnit>(`/units/${id}`);
  return data ? toUnit(data) : null;
}

export interface UpdateUnitInput {
  id: string;
  number?: string;
  rent?: number;
  deposit?: number;
  underMaintenance?: boolean;
}

export async function updateUnit(input: UpdateUnitInput): Promise<Unit> {
  const { id, ...patch } = input;
  const { data } = await http.patch<ApiUnit>(`/units/${id}`, {
    number: patch.number,
    defaultRent: patch.rent?.toFixed(2),
    defaultDeposit: patch.deposit?.toFixed(2),
    underMaintenance: patch.underMaintenance,
  });
  return toUnit(data);
}

/**
 * Removing a unit is refused by the database while a lease still references
 * it, which is the answer you want: deleting a unit should never quietly take
 * a tenancy and its rent history with it.
 */
export async function deleteUnit(id: string): Promise<{ id: string }> {
  await http.delete(`/units/${id}`);
  return { id };
}

export async function deleteFloor(input: {
  propertyId: string;
  floorId: string;
}): Promise<{ id: string }> {
  await http.delete(`/properties/${input.propertyId}/floors/${input.floorId}`);
  return { id: input.floorId };
}

/* ------------------------------------------------------------------ */
/* Tenancies                                                           */
/* ------------------------------------------------------------------ */

export async function listTenants(): Promise<Tenant[]> {
  const data = await get<ApiLease[]>("/leases");
  return data.map(toTenant);
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const data = await get<ApiLease>(`/leases/${id}`);
  return data ? toTenant(data) : null;
}

export type NewMemberInput = Omit<
  HouseholdMember,
  "id" | "personId" | "photo"
> & {
  /** Their photo, already uploaded. */
  photo?: UploadedMedia;
};

export type NewTenantInput = Omit<
  Tenant,
  "id" | "personId" | "photo" | "members"
> & {
  members?: NewMemberInput[];
  /** The tenant's photo, already uploaded. */
  photo?: UploadedMedia;
};

/** A member, in the shape the leases endpoint takes. */
function memberPayload(member: NewMemberInput) {
  return {
    person: {
      fullName: member.name,
      photoUrl: member.photo?.url,
      photoKey: member.photo?.publicId,
      phone: member.phone || undefined,
      occupation: member.occupation || undefined,
      // The API stores a date of birth; the form collects an age. An age with
      // no birthday is only good to the year, which is what this reflects.
      dateOfBirth:
        member.age === undefined
          ? undefined
          : `${new Date().getFullYear() - member.age}-01-01`,
      idKind: member.idType ? toIdKind(member.idType) : undefined,
      idNumber: member.idNumber || undefined,
    },
    relation: fromRelation(member.relation),
    relationNote: member.relationNote || undefined,
  };
}

export async function createTenant(input: NewTenantInput): Promise<Tenant> {
  const { data } = await http.post<ApiLease>("/leases", {
    unitId: input.unitId,
    primaryPerson: {
      fullName: input.name,
      phone: input.phone,
      email: input.email,
      occupation: input.occupation,
      addressLine: input.address,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      idKind: toIdKind(input.idType),
      idNumber: input.idNumber,
      photoUrl: input.photo?.url,
      photoKey: input.photo?.publicId,
    },
    termStart: input.leaseStart,
    termEnd: input.leaseEnd || undefined,
    rent: input.rentAmount.toFixed(2),
    deposit: input.deposit.toFixed(2),
    emergencyName: input.emergencyContact || undefined,
    emergencyPhone: input.emergencyPhone || undefined,
    members: (input.members ?? []).map(memberPayload),
  });
  return toTenant(data);
}

/**
 * What can be changed about an existing tenancy.
 *
 * Not the unit: the API refuses to move a lease to another unit, because a
 * tenancy of a different unit is a different tenancy — with its own rent
 * history — not an edit of this one.
 */
export interface UpdateTenantInput {
  /** The lease. */
  id: string;
  /** The primary tenant's person record, which holds the personal details. */
  personId: string;
  name?: string;
  phone?: string;
  email?: string;
  occupation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  idType?: Tenant["idType"];
  idNumber?: string;
  photo?: UploadedMedia;
  rentAmount?: number;
  deposit?: number;
  leaseStart?: string;
  leaseEnd?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

/**
 * Saves an edit to a tenancy.
 *
 * Two records, because the app's flat "tenant" is a person and a lease: who
 * they are goes to /people, what they agreed to goes to /leases. Both are
 * sent before either is read back, so a half-applied edit cannot be shown as
 * though it were complete.
 */
export async function updateTenant(input: UpdateTenantInput): Promise<Tenant> {
  const person = {
    fullName: input.name,
    phone: input.phone,
    email: input.email,
    occupation: input.occupation,
    addressLine: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    idKind: input.idType ? toIdKind(input.idType) : undefined,
    idNumber: input.idNumber,
    photoUrl: input.photo?.url,
    photoKey: input.photo?.publicId,
  };

  const lease = {
    rent: input.rentAmount?.toFixed(2),
    deposit: input.deposit?.toFixed(2),
    termStart: input.leaseStart,
    termEnd: input.leaseEnd || undefined,
    emergencyName: input.emergencyContact,
    emergencyPhone: input.emergencyPhone,
  };

  await Promise.all([
    http.patch(`/people/${input.personId}`, person),
    http.patch(`/leases/${input.id}`, lease),
  ]);

  return getTenant(input.id) as Promise<Tenant>;
}

export interface AddMemberInput extends NewMemberInput {
  tenantId: string;
}

export async function addHouseholdMember(input: AddMemberInput): Promise<Tenant> {
  const { tenantId, ...member } = input;
  const { data } = await http.post<ApiLease>(
    `/leases/${tenantId}/occupants`,
    memberPayload(member),
  );
  return toTenant(data);
}

export interface UpdateMemberInput extends Partial<NewMemberInput> {
  tenantId: string;
  memberId: string;
  /** Needed to change anything about the person rather than the occupancy. */
  personId?: string;
}

/**
 * Edits a member.
 *
 * Two records again: the occupancy holds how they relate to the primary
 * tenant, the person holds who they are. Without a personId only the relation
 * can move — which is all this endpoint ever offered before.
 */
export async function updateHouseholdMember(input: UpdateMemberInput): Promise<Tenant> {
  const { tenantId, memberId, personId, ...patch } = input;

  if (personId) {
    await http.patch(`/people/${personId}`, {
      fullName: patch.name,
      phone: patch.phone || undefined,
      occupation: patch.occupation || undefined,
      dateOfBirth:
        patch.age === undefined
          ? undefined
          : `${new Date().getFullYear() - patch.age}-01-01`,
      idKind: patch.idType ? toIdKind(patch.idType) : undefined,
      idNumber: patch.idNumber || undefined,
      photoUrl: patch.photo?.url,
      photoKey: patch.photo?.publicId,
    });
  }

  const { data } = await http.patch<ApiLease>(
    `/leases/${tenantId}/occupants/${memberId}`,
    {
      relation: patch.relation ? fromRelation(patch.relation) : undefined,
      relationNote: patch.relationNote || undefined,
    },
  );
  return toTenant(data);
}

export async function removeHouseholdMember(input: {
  tenantId: string;
  memberId: string;
}): Promise<Tenant> {
  const { data } = await http.delete<ApiLease>(
    `/leases/${input.tenantId}/occupants/${input.memberId}`,
  );
  return toTenant(data);
}

export interface ChangePrimaryTenantInput {
  tenantId: string;
  memberId: string;
  primary: Pick<
    Tenant,
    "name" | "phone" | "email" | "occupation" | "address" | "city" | "state" | "pincode" | "idType" | "idNumber"
  > & { photo?: UploadedMedia };
  outgoing: Omit<NewMemberInput, "name">;
}

/**
 * Hands the tenancy to a household member.
 *
 * The API moves the roles; the promoted person's own record is updated
 * separately, because the dialog collects details a member record never had —
 * an email address, an ID number.
 */
export async function changePrimaryTenant(
  input: ChangePrimaryTenantInput,
): Promise<Tenant> {
  const { data } = await http.post<ApiLease>(`/leases/${input.tenantId}/primary`, {
    occupantId: input.memberId,
    outgoingRelation: fromRelation(input.outgoing.relation),
    outgoingRelationNote: input.outgoing.relationNote || undefined,
  });

  const promoted = (data.occupants ?? []).find((o) => o.role === "primary");
  if (promoted) {
    await http.patch(`/people/${promoted.personId}`, {
      fullName: input.primary.name,
      phone: input.primary.phone,
      email: input.primary.email,
      occupation: input.primary.occupation,
      addressLine: input.primary.address,
      city: input.primary.city,
      state: input.primary.state,
      pincode: input.primary.pincode,
      idKind: toIdKind(input.primary.idType),
      idNumber: input.primary.idNumber,
      photoUrl: input.primary.photo?.url,
      photoKey: input.primary.photo?.publicId,
    });
  }

  return getTenant(input.tenantId) as Promise<Tenant>;
}

/* ------------------------------------------------------------------ */
/* Rent                                                                */
/* ------------------------------------------------------------------ */

/** Bills and payments carry only ids; the cards want the unit and property too. */
async function tenancyIndex() {
  const leases = await get<ApiLease[]>("/leases");
  return new Map(
    leases.map((lease) => [
      lease.id,
      {
        unitId: lease.unitId,
        propertyId: lease.unit?.propertyId ?? "",
        propertyName: lease.unit?.property?.name ?? "",
        tenantName:
          (lease.occupants ?? []).find((o) => o.role === "primary")?.person.fullName ??
          "",
      },
    ]),
  );
}

export async function listBills(): Promise<RentBill[]> {
  const [bills, index] = await Promise.all([
    get<ApiBill[]>("/bills"),
    tenancyIndex(),
  ]);
  return bills.map((bill) => {
    const context = index.get(bill.leaseId);
    return toBill(bill, context?.unitId ?? "", context?.propertyId ?? "");
  });
}

export async function listPayments(): Promise<RentPayment[]> {
  const [payments, index] = await Promise.all([
    get<ApiPayment[]>("/payments"),
    tenancyIndex(),
  ]);
  return payments.map((payment) => {
    const context = index.get(payment.leaseId);
    return toPayment(
      payment,
      context?.tenantName ?? "",
      context?.unitId ?? "",
      context?.propertyId ?? "",
      context?.propertyName ?? "",
    );
  });
}

export interface NewBillInput {
  tenantId: string;
  month: string;
  rent: number;
  electricity: number;
  electricityMode?: "meter" | "flat";
  meterPrevious?: number;
  meterCurrent?: number;
  unitRate?: number;
  otherCharges?: number;
  otherLabel?: string;
  dueDate?: string;
  note?: string;
}

export async function createBill(input: NewBillInput): Promise<RentBill> {
  const metered = input.electricityMode === "meter";

  const lines: Record<string, unknown>[] = [
    { kind: "rent", amount: input.rent.toFixed(2) },
    metered
      ? {
          kind: "electricity",
          electricityMode: "meter",
          meterPrevious: (input.meterPrevious ?? 0).toFixed(2),
          meterCurrent: (input.meterCurrent ?? 0).toFixed(2),
          unitRate: (input.unitRate ?? 0).toFixed(2),
        }
      : {
          kind: "electricity",
          electricityMode: "flat",
          amount: input.electricity.toFixed(2),
        },
  ];

  if (input.otherCharges && input.otherCharges > 0) {
    lines.push({
      kind: "maintenance",
      label: input.otherLabel || "Other charges",
      amount: input.otherCharges.toFixed(2),
    });
  }

  const { data } = await http.post<ApiBill>("/bills", {
    leaseId: input.tenantId,
    period: input.month,
    dueDate: input.dueDate || undefined,
    note: input.note || undefined,
    lines,
  });

  const tenant = await getTenant(input.tenantId);
  return toBill(data, tenant?.unitId ?? "", tenant?.propertyId ?? "");
}

export async function deleteBill(id: string): Promise<{ id: string }> {
  await http.delete(`/bills/${id}`);
  return { id };
}

export interface NewPaymentInput {
  tenantId: string;
  month: string;
  amount: number;
  date: string;
  method: RentPayment["method"];
  transactionId: string;
}

export async function recordPayment(input: NewPaymentInput): Promise<RentPayment> {
  const { data } = await http.post<ApiPayment>("/payments", {
    leaseId: input.tenantId,
    period: input.month,
    amount: input.amount.toFixed(2),
    paidOn: input.date,
    method: toMethod(input.method),
    reference: input.transactionId || undefined,
  });

  const tenant = await getTenant(input.tenantId);
  return toPayment(
    data,
    tenant?.name ?? "",
    tenant?.unitId ?? "",
    tenant?.propertyId ?? "",
    "",
  );
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export async function listDocuments(): Promise<PropertyDocument[]> {
  const [documents, index] = await Promise.all([
    get<ApiDocument[]>("/documents"),
    tenancyIndex(),
  ]);
  return documents.map((doc) =>
    toDocument(
      doc,
      doc.leaseId ? index.get(doc.leaseId)?.tenantName : undefined,
      doc.leaseId ? index.get(doc.leaseId)?.propertyName : undefined,
    ),
  );
}

export interface NewDocumentInput {
  name: string;
  type: DocumentType;
  tenantId?: string;
  propertyId?: string;
  /** Whose document it is, when it belongs to one person on the lease. */
  personId?: string;
  /** The attached file, already uploaded through `uploadMedia`. */
  file: UploadedMedia;
  /** The other side of an ID card, when it was photographed too. */
  back?: UploadedMedia;
}

/**
 * Records a file that has already been uploaded.
 *
 * The order matters: the upload happens first, and this is only called with
 * what it returned, so a failed upload never leaves a document row pointing at
 * a file that is not there.
 */
export async function createDocument(
  input: NewDocumentInput,
): Promise<PropertyDocument> {
  const { data } = await http.post<ApiDocument>("/documents", {
    kind: toDocKind(input.type),
    title: input.name,
    leaseId: input.tenantId || undefined,
    propertyId: input.propertyId || undefined,
    personId: input.personId || undefined,
    storageKey: input.file.publicId,
    url: input.file.url,
    resourceType: input.file.resourceType,
    originalName: input.file.originalName,
    mimeType: input.file.mimeType,
    sizeBytes: input.file.bytes,
    backStorageKey: input.back?.publicId,
    backUrl: input.back?.url,
    backResourceType: input.back?.resourceType,
  });
  return toDocument(data);
}

export interface UpdateDocumentInput {
  id: string;
  name?: string;
  /** A replacement front image. The one it replaces is deleted from storage. */
  file?: UploadedMedia;
  /** A replacement, or first, back image. */
  back?: UploadedMedia;
}

/**
 * Re-files an existing document.
 *
 * Photographing an ID card again is an edit: without this every re-upload
 * added another row, and a tenant's list filled with rows of one name where
 * only the last was current.
 */
export async function updateDocument(
  input: UpdateDocumentInput,
): Promise<PropertyDocument> {
  const { data } = await http.patch<ApiDocument>(`/documents/${input.id}`, {
    title: input.name,
    storageKey: input.file?.publicId,
    url: input.file?.url,
    resourceType: input.file?.resourceType,
    originalName: input.file?.originalName,
    mimeType: input.file?.mimeType,
    sizeBytes: input.file?.bytes,
    backStorageKey: input.back?.publicId,
    backUrl: input.back?.url,
    backResourceType: input.back?.resourceType,
  });
  return toDocument(data);
}

export async function deleteDocument(id: string): Promise<{ id: string }> {
  await http.delete(`/documents/${id}`);
  return { id };
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function listNotifications(): Promise<AppNotification[]> {
  const data = await get<ApiNotification[]>("/notifications");
  return data.map(toNotification);
}

export async function markNotificationRead(id: string): Promise<AppNotification[]> {
  await http.patch(`/notifications/${id}/read`);
  return listNotifications();
}

export async function markAllNotificationsRead(): Promise<AppNotification[]> {
  await http.patch("/notifications/read-all");
  return listNotifications();
}

/* ------------------------------------------------------------------ */
/* Owner                                                               */
/* ------------------------------------------------------------------ */

export async function getOwnerProfile(): Promise<OwnerProfile> {
  return toOwnerProfile(await get<ApiOwner>("/me"));
}

export type OwnerProfilePatch = Partial<Omit<OwnerProfile, "photo">> & {
  /** A new profile photo, already uploaded. */
  photo?: UploadedMedia;
};

export async function updateOwnerProfile(
  patch: OwnerProfilePatch,
): Promise<OwnerProfile> {
  const { data } = await http.patch<ApiOwner>("/me", {
    name: patch.name,
    phone: patch.phone,
    company: patch.company,
    address: patch.address,
    electricityRate: patch.electricityRate?.toFixed(2),
    photoUrl: patch.photo?.url,
    photoKey: patch.photo?.publicId,
  });
  return toOwnerProfile(data);
}
