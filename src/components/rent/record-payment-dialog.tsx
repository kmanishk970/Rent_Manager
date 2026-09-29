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
import {
  useBills,
  useCreateBill,
  useOwnerProfile,
  usePayments,
  useRecordPayment,
  useTenants,
} from "@/lib/queries";
import { apiErrorMessage } from "@/lib/api/http";
import { inr, monthKey, monthLabel } from "@/lib/format";
import { billTotal, buildStatements, summarise } from "@/lib/rent-ledger";
import {
  DEFAULT_UNIT_RATE,
  meterCharge,
  previousReadingFor,
} from "@/lib/electricity";
import { moneyField } from "@/lib/validation";
import type { ElectricityMode, PaymentMethod } from "@/types";

/**
 * A month's charges and the money that arrived, in one form.
 *
 * Billing and payment used to be two dialogs, which meant raising a bill you
 * were about to settle in the same breath — two trips for one event. They are
 * one here: the charges are only asked for when the month has not been billed
 * yet, and the payment is always recorded against the month.
 *
 * `billed` is carried in the form so the charge fields can be validated only
 * when they are actually on screen. A month already billed keeps the figures
 * it was billed with: rewriting them silently from a payment form would edit
 * history that the ledger has already reasoned about.
 */
const schema = z
  .object({
    tenantId: z.string().min(1, "Select a tenant"),
    // Money is always set against a month — that is what makes a part-payment
    // legible instead of just a number floating in the ledger.
    month: z.string().regex(/^[0-9]{4}-[0-9]{2}$/, "Pick the month being paid"),

    /** True when the month already has a bill, so charges are not asked for. */
    billed: z.boolean(),

    rent: moneyField("the rent", { min: 0 }),
    electricityMode: z.enum(["meter", "flat"]),
    // Only consulted in flat mode; the metered figure is derived.
    electricity: z.coerce.number().min(0, "Electricity can't be negative"),
    meterPrevious: z.coerce.number().min(0, "Readings can't be negative"),
    meterCurrent: z.coerce.number().min(0, "Readings can't be negative"),
    unitRate: z.coerce.number().min(0, "Rate can't be negative"),
    otherCharges: moneyField("other charges", { min: 0 }),
    otherLabel: z.string().trim().max(40, "Keep the label short"),
    dueDate: z.string(),

    amount: moneyField("an amount"),
    date: z.string().min(1, "Payment date is required"),
    method: z.enum(["Bank Transfer", "Cash", "UPI", "Cheque"]),
    transactionId: z.string().trim().max(40, "Transaction ID is too long"),
  })
  .superRefine((values, ctx) => {
    if (values.billed) return;

    // A bill that charges nothing is not a bill. An empty rent box coerces to
    // zero rather than failing — moneyField accepts "" at min 0 — so without
    // this a distracted submit files ₹0 for the month, and the month then
    // counts as billed and cannot be raised again from here.
    const charged =
      Number(values.rent || 0) +
      (values.electricityMode === "meter"
        ? Math.max(0, values.meterCurrent - values.meterPrevious) * values.unitRate
        : Number(values.electricity || 0)) +
      Number(values.otherCharges || 0);

    if (charged <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rent"],
        message: "A month must charge something — enter the rent",
      });
    }

    if (values.electricityMode !== "meter") return;

    // A meter counts up. A lower closing reading means a typo, or a meter that
    // was replaced — which is what the flat option is there for.
    if (values.meterCurrent < values.meterPrevious) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meterCurrent"],
        message: "Current reading can't be below the previous one",
      });
    }
    if (values.unitRate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitRate"],
        message: "Enter the rate per unit",
      });
    }
  });

type FormValues = z.input<typeof schema>;

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultTenantId,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTenantId?: string;
  /** Opens on a specific month, for the action on that month's row. */
  defaultMonth?: string;
}) {
  const { data: tenants } = useTenants();
  const { data: bills } = useBills();
  const { data: payments } = usePayments();
  const { data: owner } = useOwnerProfile();
  const recordPayment = useRecordPayment();
  const createBill = useCreateBill();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantId: defaultTenantId ?? "",
      month: monthKey(),
      billed: false,
      rent: "" as unknown as number,
      electricityMode: "meter",
      electricity: "" as unknown as number,
      meterPrevious: 0 as unknown as number,
      meterCurrent: "" as unknown as number,
      unitRate: DEFAULT_UNIT_RATE as unknown as number,
      otherCharges: 0 as unknown as number,
      otherLabel: "",
      dueDate: "",
      amount: "" as unknown as number,
      date: new Date().toISOString().slice(0, 10),
      method: "Bank Transfer",
      transactionId: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const tenantId = watch("tenantId");
  const month = watch("month");
  const mode = watch("electricityMode");
  const selected = tenants?.find((t) => t.id === tenantId);

  const tenantBills = (bills ?? []).filter((b) => b.tenantId === tenantId);
  const existing = tenantBills.find((b) => b.month === month);
  const billed = Boolean(existing);

  // The tenant's ledger, so the dialog can offer the figure that actually
  // settles them rather than the contracted rent.
  const statements = buildStatements(
    tenantBills,
    (payments ?? []).filter((p) => p.tenantId === tenantId),
  );
  const summary = summarise(statements);
  const monthStatement = statements.find((s) => s.month === month);

  // The reading this month opens from: the last one actually taken on this
  // unit's meter, which is not necessarily last month's.
  const priorReading = selected
    ? previousReadingFor(bills ?? [], selected.unitId, month)
    : null;

  const meterPrevious = Number(watch("meterPrevious") || 0);
  const meterCurrent = Number(watch("meterCurrent") || 0);
  const unitRate = Number(watch("unitRate") || 0);
  const units = Math.max(0, meterCurrent - meterPrevious);
  const meteredCharge = meterCharge(meterPrevious, meterCurrent, unitRate);

  const electricityCharge =
    mode === "meter" ? meteredCharge : Number(watch("electricity") || 0);

  // What the month comes to: the bill it already has, or the one about to be
  // raised from these fields.
  const total = billed
    ? (existing ? billTotal(existing) : 0)
    : Number(watch("rent") || 0) +
      electricityCharge +
      Number(watch("otherCharges") || 0);

  // The month's shortfall already carries any earlier dues into it, so it is
  // both the figure shown on the row and the one that settles the month.
  const suggested = billed
    ? monthStatement?.shortfall || summary.outstanding || total
    : total;

  // Keep the form's copy of "is this month billed" in step, since validation
  // of the charge fields turns on it.
  useEffect(() => {
    setValue("billed", billed);
  }, [billed, setValue]);

  // Charges open from the tenancy: the contracted rent, the owner's default
  // tariff, and the unit's last meter reading.
  useEffect(() => {
    if (!open || billed || !selected) return;
    setValue("rent", selected.rentAmount as unknown as FormValues["rent"]);
    setValue(
      "unitRate",
      (owner?.electricityRate ??
        DEFAULT_UNIT_RATE) as unknown as FormValues["unitRate"],
    );
    setValue(
      "meterPrevious",
      (priorReading?.reading ?? 0) as unknown as FormValues["meterPrevious"],
    );
  }, [open, billed, selected, owner?.electricityRate, priorReading?.reading, setValue]);

  useEffect(() => {
    if (suggested > 0) {
      setValue("amount", suggested as unknown as FormValues["amount"]);
    }
  }, [suggested, setValue]);

  useEffect(() => {
    if (!open) return;
    if (defaultTenantId) setValue("tenantId", defaultTenantId);
    setValue("month", defaultMonth ?? monthKey());
  }, [open, defaultTenantId, defaultMonth, setValue]);

  const busy = createBill.isPending || recordPayment.isPending;

  const onSubmit = handleSubmit(
    async (values) => {
      const parsed = schema.parse(values);
      const metered = parsed.electricityMode === "meter";

      // The bill first, so the payment has something to settle. A month that
      // is already billed keeps its figures — see the note on the schema.
      if (!parsed.billed) {
        try {
          await createBill.mutateAsync({
            tenantId: parsed.tenantId,
            month: parsed.month,
            rent: parsed.rent,
            // The stored figure is the rupees either way; the readings travel
            // with it so the bill can always show how it got there.
            electricity: metered
              ? meterCharge(
                  parsed.meterPrevious,
                  parsed.meterCurrent,
                  parsed.unitRate,
                )
              : parsed.electricity,
            electricityMode: parsed.electricityMode,
            meterPrevious: metered ? parsed.meterPrevious : undefined,
            meterCurrent: metered ? parsed.meterCurrent : undefined,
            unitRate: metered ? parsed.unitRate : undefined,
            otherCharges: parsed.otherCharges,
            otherLabel: parsed.otherLabel || undefined,
            dueDate: parsed.dueDate || undefined,
          });
        } catch (error) {
          toast.error(apiErrorMessage(error, "Could not bill that month"));
          return;
        }
      }

      try {
        await recordPayment.mutateAsync({
          tenantId: parsed.tenantId,
          month: parsed.month,
          amount: parsed.amount,
          date: parsed.date,
          method: parsed.method,
          transactionId: parsed.transactionId,
        });
      } catch (error) {
        // The bill stands either way: it is what is owed, and that is true
        // whether or not the money has been recorded yet.
        toast.error(apiErrorMessage(error, "Could not record that payment"));
        return;
      }

      toast.success(
        `Recorded ${inr(parsed.amount)} from ${selected?.name ?? "tenant"} for ${monthLabel(parsed.month)}`,
      );
      reset();
      onOpenChange(false);
    },
    () => toast.error("Check the highlighted fields"),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Record Rent Payment
          </DialogTitle>
          <DialogDescription>
            What the month comes to, and what was paid against it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tenant" htmlFor="payment-tenant" error={errors.tenantId?.message}>
                <Select
                  value={tenantId}
                  onValueChange={(value) =>
                    setValue("tenantId", value ?? "", { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="payment-tenant" className="w-full">
                    <SelectValue placeholder="Select tenant...">
                      {(value: string) =>
                        tenants?.find((t) => t.id === value)?.name ??
                        "Select tenant..."
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(tenants ?? []).map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="For Month" htmlFor="payment-month" error={errors.month?.message}>
                <Input id="payment-month" type="month" {...register("month")} />
              </Field>
            </div>

            {/* Charges. Only asked for when the month has not been billed. */}
            {billed ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    {monthLabel(month)} is already billed
                  </span>
                  <span className="font-display text-base font-bold text-slate-900">
                    {inr(total)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Rent {inr(existing?.rent ?? 0)} + electricity{" "}
                  {inr(existing?.electricity ?? 0)}
                  {existing?.otherCharges
                    ? ` + ${existing.otherLabel || "other"} ${inr(existing.otherCharges)}`
                    : ""}
                  . Edit the month from its row to change these.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Rent (₹)" htmlFor="p-rent" error={errors.rent?.message}>
                    <Input id="p-rent" type="number" inputMode="numeric" {...register("rent")} />
                  </Field>

                  {/* Drives nothing but the status: past it, an unpaid
                      month reads Overdue rather than Pending. */}
                  <Field
                    label="Due Date"
                    htmlFor="p-due"
                    error={errors.dueDate?.message}
                    hint="When it turns overdue. Blank uses the tenancy's due day"
                  >
                    <Input id="p-due" type="date" {...register("dueDate")} />
                  </Field>

                  <Field
                    label="Other Charges (₹)"
                    htmlFor="p-other"
                    error={errors.otherCharges?.message}
                  >
                    <Input
                      id="p-other"
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      {...register("otherCharges")}
                    />
                  </Field>

                  <Field
                    label="Other Charges Label"
                    htmlFor="p-other-label"
                    error={errors.otherLabel?.message}
                  >
                    <Input
                      id="p-other-label"
                      placeholder="Maintenance, water…"
                      {...register("otherLabel")}
                    />
                  </Field>
                </div>

                {/* Electricity, billed off the meter or as a flat figure */}
                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700">
                      Electricity
                    </span>

                    <div
                      role="radiogroup"
                      aria-label="How electricity is billed"
                      className="flex rounded-lg bg-slate-100 p-0.5"
                    >
                      {(
                        [
                          ["meter", "By meter reading"],
                          ["flat", "Flat amount"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={mode === value}
                          onClick={() =>
                            setValue("electricityMode", value as ElectricityMode, {
                              shouldValidate: true,
                            })
                          }
                          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                            mode === value
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mode === "meter" ? (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field
                          label="Previous Reading"
                          htmlFor="p-meter-prev"
                          error={errors.meterPrevious?.message}
                        >
                          <Input
                            id="p-meter-prev"
                            type="number"
                            inputMode="numeric"
                            {...register("meterPrevious")}
                          />
                        </Field>

                        <Field
                          label="Current Reading"
                          htmlFor="p-meter-curr"
                          error={errors.meterCurrent?.message}
                        >
                          <Input
                            id="p-meter-curr"
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            {...register("meterCurrent")}
                          />
                        </Field>

                        <Field
                          label="Rate (₹/unit)"
                          htmlFor="p-rate"
                          error={errors.unitRate?.message}
                        >
                          <Input
                            id="p-rate"
                            type="number"
                            inputMode="decimal"
                            {...register("unitRate")}
                          />
                        </Field>
                      </div>

                      {/* Where the opening reading came from — or that there is none */}
                      <p className="text-xs text-slate-400">
                        {priorReading
                          ? `Opening reading from ${monthLabel(priorReading.month)}.`
                          : "No earlier reading for this unit — enter the opening reading yourself."}{" "}
                        The meter belongs to the unit, so it keeps counting
                        across a change of tenant.
                      </p>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <span className="text-xs text-slate-500">
                          {meterCurrent >= meterPrevious ? (
                            <>
                              {meterCurrent.toLocaleString("en-IN")} −{" "}
                              {meterPrevious.toLocaleString("en-IN")} ={" "}
                              <strong className="text-slate-700">
                                {units.toLocaleString("en-IN")} unit
                                {units === 1 ? "" : "s"}
                              </strong>{" "}
                              × ₹{unitRate || 0}
                            </>
                          ) : (
                            "Current reading is below the previous one"
                          )}
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {inr(meteredCharge)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <Field
                      label="Amount (₹)"
                      htmlFor="p-electricity"
                      error={errors.electricity?.message}
                    >
                      <Input
                        id="p-electricity"
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...register("electricity")}
                      />
                    </Field>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <span className="text-sm font-medium text-blue-900">
                    Total for the month
                  </span>
                  <span className="font-display text-lg font-bold text-blue-900">
                    {inr(Number.isFinite(total) ? total : 0)}
                  </span>
                </div>
              </>
            )}

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-600">Payment</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Amount" htmlFor="payment-amount" error={errors.amount?.message}>
                  <Input
                    id="payment-amount"
                    type="number"
                    inputMode="numeric"
                    {...register("amount")}
                  />
                </Field>

                <Field label="Payment Date" htmlFor="payment-date" error={errors.date?.message}>
                  <Input id="payment-date" type="date" {...register("date")} />
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
                        (option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Transaction ID"
                  htmlFor="payment-txn"
                  error={errors.transactionId?.message}
                  hint="Optional"
                >
                  <Input id="payment-txn" placeholder="UTR / reference" {...register("transactionId")} />
                </Field>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {createBill.isPending
                ? "Billing…"
                : recordPayment.isPending
                  ? "Recording…"
                  : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
