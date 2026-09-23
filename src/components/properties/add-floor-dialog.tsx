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
import { useCreateFloor } from "@/lib/queries";

const schema = z.object({
  number: z.coerce
    .number()
    .int("Whole numbers only")
    .min(0, "Floor number can't be negative"),
  name: z.string().min(2, "Give the floor a name"),
});

type FormValues = z.input<typeof schema>;

/** "Ground Floor", "First Floor", … so the name follows the number by default. */
const ORDINALS = [
  "Ground", "First", "Second", "Third", "Fourth", "Fifth",
  "Sixth", "Seventh", "Eighth", "Ninth", "Tenth",
];

function suggestedName(n: number): string {
  // Floors are entered 1-based, so 1 is the ground floor.
  const ordinal = ORDINALS[n - 1];
  return ordinal ? `${ordinal} Floor` : `Floor ${n}`;
}

export function AddFloorDialog({
  open,
  onOpenChange,
  propertyId,
  nextFloorNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  nextFloorNumber: number;
}) {
  const createFloor = useCreateFloor();

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
      number: nextFloorNumber as unknown as number,
      name: suggestedName(nextFloorNumber),
    },
  });

  const number = watch("number");

  // Keep the name in step with the number while the field still holds a
  // suggestion, so typing "3" gives "Third Floor" without extra work. A name
  // the user has actually edited is left alone.
  useEffect(() => {
    const n = Number(number);
    if (!Number.isFinite(n)) return;
    const current = watch("name");
    const isSuggestion = ORDINALS.some(
      (o) => current === `${o} Floor` || current === "",
    ) || /^Floor \d+$/.test(current);
    if (isSuggestion) setValue("name", suggestedName(n));
  }, [number, setValue, watch]);

  useEffect(() => {
    if (open) {
      reset({
        number: nextFloorNumber as unknown as number,
        name: suggestedName(nextFloorNumber),
      });
    }
  }, [open, nextFloorNumber, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values);
    await createFloor.mutateAsync({ propertyId, ...parsed });
    toast.success(`${parsed.name} added`);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">
            Add Floor
          </DialogTitle>
          <DialogDescription>
            Add the floor first, then add its units from the floor&apos;s own
            header.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Floor Number"
            htmlFor="floor-number"
            error={errors.number?.message}
          >
            <Input
              id="floor-number"
              type="number"
              inputMode="numeric"
              {...register("number")}
            />
          </Field>

          <Field label="Floor Name" htmlFor="floor-name" error={errors.name?.message}>
            <Input
              id="floor-name"
              placeholder="e.g. Ground Floor"
              {...register("name")}
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
            <Button type="submit" disabled={createFloor.isPending}>
              {createFloor.isPending ? "Adding…" : "Add Floor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
