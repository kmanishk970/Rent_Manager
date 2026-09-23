"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AppNotification, OwnerProfile, Tenant } from "@/types";

/** Centralised cache keys so invalidation never drifts from the queries. */
export const qk = {
  properties: ["properties"] as const,
  property: (id: string) => ["properties", id] as const,
  units: ["units"] as const,
  unit: (id: string) => ["units", id] as const,
  tenants: ["tenants"] as const,
  tenant: (id: string) => ["tenants", id] as const,
  bills: ["bills"] as const,
  payments: ["payments"] as const,
  documents: ["documents"] as const,
  notifications: ["notifications"] as const,
  owner: ["owner"] as const,
};

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export function useProperties() {
  return useQuery({ queryKey: qk.properties, queryFn: api.listProperties });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: qk.property(id),
    queryFn: () => api.getProperty(id),
    enabled: Boolean(id),
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: qk.unit(id),
    queryFn: () => api.getUnit(id),
    enabled: Boolean(id),
  });
}

export function useTenants() {
  return useQuery({ queryKey: qk.tenants, queryFn: api.listTenants });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: qk.tenant(id),
    queryFn: () => api.getTenant(id),
    enabled: Boolean(id),
  });
}

export function usePayments() {
  return useQuery({ queryKey: qk.payments, queryFn: api.listPayments });
}

export function useBills() {
  return useQuery({ queryKey: qk.bills, queryFn: api.listBills });
}

export function useDocuments() {
  return useQuery({ queryKey: qk.documents, queryFn: api.listDocuments });
}

export function useNotifications(
  options?: Partial<UseQueryOptions<AppNotification[]>>,
) {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: api.listNotifications,
    ...options,
  });
}

export function useOwnerProfile() {
  return useQuery({ queryKey: qk.owner, queryFn: api.getOwnerProfile });
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProperty,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.properties });
    },
  });
}

export function useCreateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createFloor,
    onSuccess: (_floor, input) => {
      // The floor lives inside the property tree, so both the list and the
      // single-property cache entry are stale.
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.property(input.propertyId) });
    },
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createUnit,
    onSuccess: (_unit, input) => {
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.property(input.propertyId) });
      qc.invalidateQueries({ queryKey: qk.units });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateUnit,
    onSuccess: (unit) => {
      qc.setQueryData(qk.unit(unit.id), unit);
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.units });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteUnit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.units });
    },
  });
}

export function useDeleteFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteFloor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.units });
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTenant,
    onSuccess: () => {
      // Creating a tenant also occupies a unit, so the property tree is stale.
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: qk.properties });
      qc.invalidateQueries({ queryKey: qk.units });
    },
  });
}

/**
 * Member mutations all resolve to the full tenant, so the tenant's own cache
 * entry can be primed directly and only the list needs re-fetching.
 */
function useMemberMutation<TInput extends { tenantId: string }>(
  mutationFn: (input: TInput) => Promise<Tenant>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (tenant) => {
      qc.setQueryData(qk.tenant(tenant.id), tenant);
      qc.invalidateQueries({ queryKey: qk.tenants });
    },
  });
}

export function useAddHouseholdMember() {
  return useMemberMutation(api.addHouseholdMember);
}

export function useUpdateHouseholdMember() {
  return useMemberMutation(api.updateHouseholdMember);
}

export function useRemoveHouseholdMember() {
  return useMemberMutation(api.removeHouseholdMember);
}

/**
 * Promotes a household member to primary tenant. The rent ledger and document
 * list mirror the tenant's name, so both are refreshed alongside the tenant.
 */
export function useChangePrimaryTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.changePrimaryTenant,
    onSuccess: (tenant) => {
      qc.setQueryData(qk.tenant(tenant.id), tenant);
      qc.invalidateQueries({ queryKey: qk.tenants });
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.documents });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.recordPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.payments });
    },
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bills });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteBill,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bills });
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.documents });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.documents });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: (next) => qc.setQueryData(qk.notifications, next),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: (next) => qc.setQueryData(qk.notifications, next),
  });
}

export function useUpdateOwnerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<OwnerProfile>) => api.updateOwnerProfile(patch),
    onSuccess: (next) => qc.setQueryData(qk.owner, next),
  });
}
