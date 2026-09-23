"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordPayment, useTenants } from "@/lib/queries";
import { inr } from "@/lib/format";
import type { PaymentMethod } from "@/types";

const schema = z.object({
  tenantId: z.string().min(1, "Select a tenant"),
  amount: z.coerce.number().positive("Enter an amount above zero"),
  date: z.string().min(1, "Payment date is required"),
  method: z.enum(["Bank Transfer", "Cash", "UPI", "Cheque"]),
  transactionId: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultTenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTenantId?: string;
}) {
  const { data: tenants } = useTenants();
  const recordPayment = useRecordPayment();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantId: defaultTenantId ?? "",
      amount: "" as unknown as number,
      date: new Date().toISOString().slice(0, 10),
      method: "Bank Transfer",
      transactionId: "",
    },
  });

  const tenantId = watch("tenantId");
  const selected = tenants?.find((t) => t.id === tenantId);

  // Pre-fill the amount with the tenant's contracted rent when one is picked,
  // which is the figure being recorded in the overwhelming majority of cases.
  useEffect(() => {
    if (selected) {
      setValue("amount", selected.rentAmount as unknown as FormValues["amount"]);
    }
  }, [selected, setValue]);

  useEffect(() => {
    if (open && defaultTenantId) setValue("tenantId", defaultTenantId);
  }, [open, defaultTenantId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values);
    await recordPayment.mutateAsync({
      tenantId: parsed.tenantId,
      amount: parsed.amount,
      date: parsed.date,
      method: parsed.method,
      transactionId: parsed.transactionId ?? "",
    });
    toast.success(`Recorded ${inr(parsed.amount)} from ${selected?.name ?? "tenant"}`);
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Record Rent Payment
          </DialogTitle>
          <DialogDescription>
            Recording a payment clears any outstanding row for that tenant.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Tenant"
            htmlFor="payment-tenant"
            error={errors.tenantId?.message}
          >
            <Select
              value={tenantId}
              onValueChange={(value) =>
                setValue("tenantId", value ?? "", { shouldValidate: true })
              }
            >
              <SelectTrigger id="payment-tenant" className="w-full">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {(tenants ?? []).map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name} — {inr(tenant.rentAmount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Amount"
            htmlFor="payment-amount"
            error={errors.amount?.message}
          >
            <Input
              id="payment-amount"
              type="number"
              inputMode="numeric"
              placeholder={selected ? String(selected.rentAmount) : "0"}
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </Field>

          <Field
            label="Payment Date"
            htmlFor="payment-date"
            error={errors.date?.message}
          >
            <Input
              id="payment-date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
          </Field>

          <Field label="Payment Method" htmlFor="payment-method">
            <Select
              value={watch("method")}
              onValueChange={(value) =>
                setValue("method", value as PaymentMethod)
              }
            >
              <SelectTrigger id="payment-method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Bank Transfer", "Cash", "UPI", "Cheque"] as const).map(
                  (method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Transaction ID" htmlFor="payment-txn">
            <Input
              id="payment-txn"
              placeholder="e.g. TXN12345678"
              {...register("transactionId")}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPayment.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {recordPayment.isPending ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
