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
import { useCreateUnit } from "@/lib/queries";
import { inr } from "@/lib/format";

const schema = z.object({
  number: z.string().min(1, "Unit number is required"),
  rent: z.coerce.number().positive("Enter the monthly rent"),
  deposit: z.coerce.number().nonnegative("Enter the deposit"),
});

type FormValues = z.input<typeof schema>;

export function AddUnitDialog({
  open,
  onOpenChange,
  propertyId,
  floorId,
  floorName,
  suggestedNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  floorId: string;
  floorName: string;
  suggestedNumber: string;
}) {
  const createUnit = useCreateUnit();

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
      number: suggestedNumber,
      rent: "" as unknown as number,
      deposit: "" as unknown as number,
    },
  });

  const rent = watch("rent");

  // Three months' rent is the usual deposit in this market, so it is offered
  // as a default — still editable, and only filled while the field is empty.
  useEffect(() => {
    const value = Number(rent);
    const currentDeposit = watch("deposit");
    if (Number.isFinite(value) && value > 0 && !currentDeposit) {
      setValue("deposit", (value * 3) as unknown as FormValues["deposit"]);
    }
  }, [rent, setValue, watch]);

  useEffect(() => {
    if (open) {
      reset({
        number: suggestedNumber,
        rent: "" as unknown as number,
        deposit: "" as unknown as number,
      });
    }
  }, [open, suggestedNumber, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values);
    await createUnit.mutateAsync({ propertyId, floorId, ...parsed });
    toast.success(`Unit ${parsed.number} added to ${floorName}`);
    onOpenChange(false);
  });

  const depositPreview = Number(watch("deposit"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">
            Add Unit
          </DialogTitle>
          <DialogDescription>
            Adding to {floorName}. New units start vacant — assigning a tenant is
            what marks one occupied.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Unit Number"
            htmlFor="unit-number"
            error={errors.number?.message}
          >
            <Input id="unit-number" placeholder="e.g. 101" {...register("number")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Monthly Rent (₹)"
              htmlFor="unit-rent"
              error={errors.rent?.message}
            >
              <Input
                id="unit-rent"
                type="number"
                inputMode="numeric"
                placeholder="18000"
                {...register("rent")}
              />
            </Field>

            <Field
              label="Security Deposit (₹)"
              htmlFor="unit-deposit"
              error={errors.deposit?.message}
            >
              <Input
                id="unit-deposit"
                type="number"
                inputMode="numeric"
                placeholder="54000"
                {...register("deposit")}
              />
            </Field>
          </div>

          {depositPreview > 0 && (
            <p className="text-xs text-slate-500">
              Deposit set to {inr(depositPreview)}.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUnit.isPending}>
              {createUnit.isPending ? "Adding…" : "Add Unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
