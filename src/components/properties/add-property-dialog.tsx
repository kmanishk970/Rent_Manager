"use client";

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
import { useCreateProperty } from "@/lib/queries";

const schema = z.object({
  name: z.string().min(2, "Property name is required"),
  location: z.string().min(2, "Location is required"),
  address: z.string().min(5, "Enter the full address"),
  type: z.enum(["Residential", "Commercial", "Mixed"]),
});

type FormValues = z.infer<typeof schema>;

export function AddPropertyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProperty = useCreateProperty();

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
      name: "",
      location: "",
      address: "",
      type: "Residential",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await createProperty.mutateAsync(values);
    toast.success(`${values.name} added`);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-slate-900">
            Add New Property
          </DialogTitle>
          <DialogDescription>
            New properties start with no floors — add units from the property
            page once it&apos;s created.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field
            label="Property Name"
            htmlFor="property-name"
            error={errors.name?.message}
          >
            <Input
              id="property-name"
              placeholder="e.g. Sunrise Apartments"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <Field
            label="Location"
            htmlFor="property-location"
            error={errors.location?.message}
          >
            <Input
              id="property-location"
              placeholder="e.g. Koramangala, Bangalore"
              aria-invalid={Boolean(errors.location)}
              {...register("location")}
            />
          </Field>

          <Field
            label="Full Address"
            htmlFor="property-address"
            error={errors.address?.message}
          >
            <Input
              id="property-address"
              placeholder="Street address..."
              aria-invalid={Boolean(errors.address)}
              {...register("address")}
            />
          </Field>

          <Field
            label="Property Type"
            htmlFor="property-type"
            error={errors.type?.message}
          >
            <Select
              value={watch("type")}
              onValueChange={(value) =>
                setValue("type", value as FormValues["type"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="property-type" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProperty.isPending}>
              {createProperty.isPending ? "Adding…" : "Add Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
