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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateBill } from "@/lib/queries";
import { inr, monthKey, monthLong, shiftMonth } from "@/lib/format";
import { moneyField } from "@/lib/validation";
import type { RentBill, Tenant } from "@/types";

const schema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Pick the month this bill covers"),
  rent: moneyField("the rent", { min: 0 }),
  electricity: moneyField("the electricity charge", { min: 0 }),
  otherCharges: moneyField("other charges", { min: 0 }),
  otherLabel: z.string().trim().max(40, "Keep the label short"),
  dueDate: z.string(),
});

type FormValues = z.input<typeof schema>;

/**
 * Raises (or corrects) one month's charges for a tenancy.
 *
 * Billing is deliberately separate from taking payment: the bill says what is
 * owed, payments say what arrived, and the ledger works out the difference. So
 * a month can be part-paid without the record pretending it was settled.
 */
export function AddBillDialog({
  open,
  onOpenChange,
  tenant,
  /** Pre-fills the form to correct a month that is already billed. */
  existing,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  existing?: RentBill;
  defaultMonth?: string;
}) {
  const createBill = useCreateBill();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      month: defaultMonth ?? monthKey(),
      rent: tenant.rentAmount as unknown as number,
      electricity: "" as unknown as number,
      otherCharges: 0 as unknown as number,
      otherLabel: "",
      dueDate: "",
    },
  });

  const {
    register,
    watch,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!open) return;
    form.reset({
      month: existing?.month ?? defaultMonth ?? monthKey(),
      // Rent defaults to the contracted figure, but a month can differ.
      rent: (existing?.rent ?? tenant.rentAmount) as unknown as number,
      electricity: (existing?.electricity ?? "") as unknown as number,
      otherCharges: (existing?.otherCharges ?? 0) as unknown as number,
      otherLabel: existing?.otherLabel ?? "",
      dueDate: existing?.dueDate ?? "",
    });
  }, [open, existing, defaultMonth, tenant.rentAmount, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = schema.parse(values);

    await createBill.mutateAsync({
      tenantId: tenant.id,
      month: parsed.month,
      rent: parsed.rent,
      electricity: parsed.electricity,
      otherCharges: parsed.otherCharges,
      otherLabel: parsed.otherLabel || undefined,
      dueDate: parsed.dueDate || undefined,
    });

    toast.success(
      `${monthLong(parsed.month)} billed — ${inr(
        parsed.rent + parsed.electricity + parsed.otherCharges,
      )}`,
    );
    onOpenChange(false);
  });

  // A live total, so the figure being committed is never a surprise.
  const preview =
    Number(watch("rent") || 0) +
    Number(watch("electricity") || 0) +
    Number(watch("otherCharges") || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            {existing ? "Edit Bill" : "Add Monthly Bill"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            What {tenant.name} owes for the month. Record payments against it
            separately — anything short or over carries into the next month.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Month" htmlFor="b-month" error={errors.month?.message}>
                <Input
                  id="b-month"
                  type="month"
                  max={shiftMonth(monthKey(), 1)}
                  {...register("month")}
                />
              </Field>

              <Field
                label="Due Date"
                htmlFor="b-due"
                error={errors.dueDate?.message}
              >
                <Input id="b-due" type="date" {...register("dueDate")} />
              </Field>

              <Field
                label="Rent (₹)"
                htmlFor="b-rent"
                error={errors.rent?.message}
              >
                <Input
                  id="b-rent"
                  type="number"
                  inputMode="numeric"
                  {...register("rent")}
                />
              </Field>

              <Field
                label="Electricity (₹)"
                htmlFor="b-electricity"
                error={errors.electricity?.message}
              >
                <Input
                  id="b-electricity"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  {...register("electricity")}
                />
              </Field>

              <Field
                label="Other Charges (₹)"
                htmlFor="b-other"
                error={errors.otherCharges?.message}
              >
                <Input
                  id="b-other"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  {...register("otherCharges")}
                />
              </Field>

              <Field
                label="Other Charges Label"
                htmlFor="b-other-label"
                error={errors.otherLabel?.message}
              >
                <Input
                  id="b-other-label"
                  placeholder="Maintenance, water…"
                  {...register("otherLabel")}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
              <span className="text-sm font-medium text-blue-900">
                Total for the month
              </span>
              <span className="font-display text-lg font-bold text-blue-900">
                {inr(Number.isFinite(preview) ? preview : 0)}
              </span>
            </div>

            {existing && (
              <p className="text-xs text-amber-700">
                This month is already billed. Saving replaces those charges
                rather than adding to them.
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-3 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createBill.isPending}>
              {createBill.isPending ? "Saving…" : existing ? "Save Bill" : "Add Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
