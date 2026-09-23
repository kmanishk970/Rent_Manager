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
import { useBills, usePayments, useRecordPayment, useTenants } from "@/lib/queries";
import { inr, monthKey, monthLabel } from "@/lib/format";
import { buildStatements, summarise } from "@/lib/rent-ledger";
import { moneyField } from "@/lib/validation";
import type { PaymentMethod } from "@/types";

const schema = z.object({
  tenantId: z.string().min(1, "Select a tenant"),
  // Money is always set against a month — that is what makes a part-payment
  // legible instead of just a number floating in the ledger.
  month: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, "Pick the month being paid"),
  amount: moneyField("an amount"),
  date: z.string().min(1, "Payment date is required"),
  method: z.enum(["Bank Transfer", "Cash", "UPI", "Cheque"]),
  transactionId: z.string().trim().max(40, "Transaction ID is too long"),
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
  const { data: bills } = useBills();
  const { data: payments } = usePayments();
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
      month: monthKey(),
      amount: "" as unknown as number,
      date: new Date().toISOString().slice(0, 10),
      method: "Bank Transfer",
      transactionId: "",
    },
  });

  const tenantId = watch("tenantId");
  const month = watch("month");
  const selected = tenants?.find((t) => t.id === tenantId);

  // The tenant's ledger, so the dialog can offer the figure that actually
  // settles them rather than the contracted rent.
  const statements = buildStatements(
    (bills ?? []).filter((b) => b.tenantId === tenantId),
    (payments ?? []).filter((p) => p.tenantId === tenantId),
  );
  const summary = summarise(statements);
  const monthStatement = statements.find((s) => s.month === month);

  // Everything owed to date beats the month's own total: paying that clears
  // the arrears as well, which is what a landlord collecting late wants.
  const suggested = summary.outstanding || monthStatement?.total || 0;

  useEffect(() => {
    if (suggested > 0) {
      setValue("amount", suggested as unknown as FormValues["amount"]);
    }
  }, [suggested, setValue]);

  useEffect(() => {
    if (open && defaultTenantId) setValue("tenantId", defaultTenantId);
  }, [open, defaultTenantId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values);
    await recordPayment.mutateAsync({
      tenantId: parsed.tenantId,
      month: parsed.month,
      amount: parsed.amount,
      date: parsed.date,
      method: parsed.method,
      transactionId: parsed.transactionId,
    });
    toast.success(
      `Recorded ${inr(parsed.amount)} from ${selected?.name ?? "tenant"} for ${monthLabel(parsed.month)}`,
    );
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
            Money is recorded against a month. Pay less than the month asks and
            the shortfall carries forward; pay more and the credit does.
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
            label="For Month"
            htmlFor="payment-month"
            error={errors.month?.message}
          >
            <Input id="payment-month" type="month" {...register("month")} />
          </Field>

          {tenantId && monthStatement && (
            <dl className="space-y-1 rounded-lg bg-slate-50 p-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">
                  {monthLabel(monthStatement.month)} charges
                </dt>
                <dd className="font-medium text-slate-800">
                  {inr(monthStatement.total)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Already paid</dt>
                <dd className="font-medium text-slate-800">
                  {inr(monthStatement.paid)}
                </dd>
              </div>
              {summary.outstanding > 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <dt className="font-medium text-red-600">Outstanding to date</dt>
                  <dd className="font-semibold text-red-600">
                    {inr(summary.outstanding)}
                  </dd>
                </div>
              )}
              {summary.advance > 0 && (
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <dt className="font-medium text-green-700">In advance</dt>
                  <dd className="font-semibold text-green-700">
                    {inr(summary.advance)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {tenantId && !monthStatement && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              {monthLabel(month)} has not been billed yet. The payment will be
              recorded, and will show as credit once the bill is added.
            </p>
          )}

          <Field
            label="Amount"
            htmlFor="payment-amount"
            error={errors.amount?.message}
          >
            <Input
              id="payment-amount"
              type="number"
              inputMode="numeric"
              placeholder={suggested ? String(suggested) : "0"}
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
