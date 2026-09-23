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
import { useBills, useCreateBill, useOwnerProfile } from "@/lib/queries";
import { inr, monthKey, monthLabel, monthLong, shiftMonth } from "@/lib/format";
import { moneyField } from "@/lib/validation";
import {
  DEFAULT_UNIT_RATE,
  meterCharge,
  previousReadingFor,
} from "@/lib/electricity";
import type { ElectricityMode, RentBill, Tenant } from "@/types";

const schema = z
  .object({
    month: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}$/, "Pick the month this bill covers"),
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
  })
  .superRefine((values, ctx) => {
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
  const { data: bills } = useBills();
  const { data: owner } = useOwnerProfile();
  const fallbackRate = owner?.electricityRate ?? DEFAULT_UNIT_RATE;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      month: defaultMonth ?? monthKey(),
      rent: tenant.rentAmount as unknown as number,
      electricityMode: "meter",
      electricity: "" as unknown as number,
      meterPrevious: 0 as unknown as number,
      meterCurrent: "" as unknown as number,
      unitRate: DEFAULT_UNIT_RATE as unknown as number,
      otherCharges: 0 as unknown as number,
      otherLabel: "",
      dueDate: "",
    },
  });

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const month = watch("month");
  const mode = watch("electricityMode");

  // The reading this month opens from: the last one actually taken on this
  // unit's meter, which is not necessarily last month's.
  const priorReading = previousReadingFor(bills ?? [], tenant.unitId, month);

  const meterPrevious = Number(watch("meterPrevious") || 0);
  const meterCurrent = Number(watch("meterCurrent") || 0);
  const unitRate = Number(watch("unitRate") || 0);

  const units = Math.max(0, meterCurrent - meterPrevious);
  const meteredCharge = meterCharge(meterPrevious, meterCurrent, unitRate);

  // What actually lands on the bill, whichever way it was worked out.
  const electricityCharge =
    mode === "meter" ? meteredCharge : Number(watch("electricity") || 0);

  useEffect(() => {
    if (!open) return;
    const startMonth = existing?.month ?? defaultMonth ?? monthKey();
    const prior = previousReadingFor(bills ?? [], tenant.unitId, startMonth);

    form.reset({
      month: startMonth,
      // Rent defaults to the contracted figure, but a month can differ.
      rent: (existing?.rent ?? tenant.rentAmount) as unknown as number,
      electricityMode: existing?.electricityMode ?? "meter",
      electricity: (existing?.electricity ?? "") as unknown as number,
      // An existing bill keeps what it was billed on; a new one opens from the
      // unit's last reading.
      meterPrevious: (existing?.meterPrevious ??
        prior?.reading ??
        0) as unknown as number,
      meterCurrent: (existing?.meterCurrent ?? "") as unknown as number,
      unitRate: (existing?.unitRate ?? fallbackRate) as unknown as number,
      otherCharges: (existing?.otherCharges ?? 0) as unknown as number,
      otherLabel: existing?.otherLabel ?? "",
      dueDate: existing?.dueDate ?? "",
    });
  }, [open, existing, defaultMonth, tenant.rentAmount, tenant.unitId, bills, fallbackRate, form]);

  // Changing the month changes which reading the bill opens from.
  useEffect(() => {
    if (!open || existing) return;
    setValue(
      "meterPrevious",
      (priorReading?.reading ?? 0) as unknown as FormValues["meterPrevious"],
    );
  }, [open, existing, priorReading?.reading, setValue]);

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = schema.parse(values);

    const metered = parsed.electricityMode === "meter";

    await createBill.mutateAsync({
      tenantId: tenant.id,
      month: parsed.month,
      rent: parsed.rent,
      // The stored figure is the rupees either way; the readings travel with it
      // so the bill can always show how it got there.
      electricity: metered
        ? meterCharge(parsed.meterPrevious, parsed.meterCurrent, parsed.unitRate)
        : parsed.electricity,
      electricityMode: parsed.electricityMode,
      meterPrevious: metered ? parsed.meterPrevious : undefined,
      meterCurrent: metered ? parsed.meterCurrent : undefined,
      unitRate: metered ? parsed.unitRate : undefined,
      otherCharges: parsed.otherCharges,
      otherLabel: parsed.otherLabel || undefined,
      dueDate: parsed.dueDate || undefined,
    });

    const billed =
      parsed.rent +
      (metered
        ? meterCharge(parsed.meterPrevious, parsed.meterCurrent, parsed.unitRate)
        : parsed.electricity) +
      parsed.otherCharges;

    toast.success(`${monthLong(parsed.month)} billed — ${inr(billed)}`);
    onOpenChange(false);
  });

  // A live total, so the figure being committed is never a surprise.
  const preview =
    Number(watch("rent") || 0) +
    electricityCharge +
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
                      htmlFor="b-meter-prev"
                      error={errors.meterPrevious?.message}
                    >
                      <Input
                        id="b-meter-prev"
                        type="number"
                        inputMode="numeric"
                        {...register("meterPrevious")}
                      />
                    </Field>

                    <Field
                      label="Current Reading"
                      htmlFor="b-meter-curr"
                      error={errors.meterCurrent?.message}
                    >
                      <Input
                        id="b-meter-curr"
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        {...register("meterCurrent")}
                      />
                    </Field>

                    <Field
                      label="Rate (₹/unit)"
                      htmlFor="b-rate"
                      error={errors.unitRate?.message}
                    >
                      <Input
                        id="b-rate"
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
                    The meter belongs to the unit, so it keeps counting across a
                    change of tenant.
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
              )}
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
