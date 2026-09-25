"use client";

import { useEffect, useState } from "react";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { emailField, mobileField, nameField, passwordField } from "@/lib/validation";
import { toast } from "sonner";
import { Field } from "@/components/form/field";
import { PhotoPicker } from "@/components/form/photo-picker";
import { PasswordInput } from "@/components/form/password-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwnerProfile, useUpdateOwnerProfile } from "@/lib/queries";

const TABS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "security", label: "Security", icon: "🔐" },
] as const;

const NOTIFICATION_PREFS = [
  { id: "rent-reminders", label: "Rent Reminders", desc: "Get reminded when rent is due or overdue", defaultOn: true },
  { id: "lease-expiry", label: "Lease Expiry Alerts", desc: "Alerts 30 and 60 days before lease expiry", defaultOn: true },
  { id: "payment-received", label: "Payment Received", desc: "Notify when a payment is recorded", defaultOn: true },
  { id: "tenant-updates", label: "Tenant Updates", desc: "New tenant moves in or moves out", defaultOn: false },
  { id: "document-updates", label: "Document Updates", desc: "When documents are uploaded or expiring", defaultOn: false },
  { id: "email", label: "Email Notifications", desc: "Send all notifications to your email", defaultOn: true },
  { id: "sms", label: "SMS Alerts", desc: "Critical alerts via SMS", defaultOn: false },
];

const PLANS = [
  { name: "Starter", price: "₹499", desc: "Up to 3 properties · 20 units" },
  { name: "Professional", price: "₹999", desc: "Up to 10 properties · Unlimited units" },
  { name: "Enterprise", price: "₹2,499", desc: "Unlimited properties · Priority support" },
];

const profileSchema = z.object({
  name: nameField(),
  email: emailField(),
  phone: mobileField(),
  company: z.string().optional(),
  // Pre-filled into every new bill; past bills keep the rate they were billed at.
  electricityRate: z.coerce
    .number()
    .positive("Enter the rate per unit")
    .max(1000, "That rate looks wrong"),
  address: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: passwordField(),
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

function ProfileTab() {
  const { data: owner, isPending } = useOwnerProfile();
  const updateProfile = useUpdateOwnerProfile();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string>();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: owner
      ? {
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          company: owner.company ?? "",
          electricityRate: owner.electricityRate ?? 10,
          address: owner.address ?? "",
        }
      : undefined,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    await updateProfile.mutateAsync({
      ...values,
      // The picker revokes its own preview, so a kept photo needs its own URL.
      ...(photo ? { photo: URL.createObjectURL(photo) } : {}),
    });
    setPhoto(null);
    toast.success("Profile updated");
  });

  if (isPending || !owner) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-slate-900">
        Profile Information
      </h3>

      <PhotoPicker
        file={photo}
        currentUrl={owner.photo}
        error={photoError}
        onPick={(file, reason) => {
          setPhoto(file);
          setPhotoError(reason ?? undefined);
        }}
        onClear={() => {
          setPhoto(null);
          setPhotoError(undefined);
        }}
      />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Full Name"
            htmlFor="s-name"
            error={errors.name?.message}
            className="md:col-span-2"
          >
            <Input id="s-name" {...register("name")} />
          </Field>

          <Field label="Email Address" htmlFor="s-email" error={errors.email?.message}>
            <Input id="s-email" type="email" {...register("email")} />
          </Field>

          <Field label="Phone Number" htmlFor="s-phone" error={errors.phone?.message}>
            <Input id="s-phone" type="tel" {...register("phone")} />
          </Field>

          <Field label="Company" htmlFor="s-company">
            <Input id="s-company" {...register("company")} />
          </Field>

          <Field
            label="Electricity Rate (₹ per unit)"
            htmlFor="s-rate"
            error={errors.electricityRate?.message}
          >
            <Input
              id="s-rate"
              type="number"
              inputMode="decimal"
              {...register("electricityRate")}
            />
          </Field>

          <Field label="Address" htmlFor="s-address">
            <Input id="s-address" {...register("address")} />
          </Field>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={updateProfile.isPending || (!isDirty && !photo)}
          >
            {updateProfile.isPending ? "Saving…" : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty && !photo}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-slate-900">
        Notification Preferences
      </h3>

      <div className="space-y-4">
        {NOTIFICATION_PREFS.map((pref) => (
          <div key={pref.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label
                htmlFor={pref.id}
                className="text-sm font-medium text-slate-800"
              >
                {pref.label}
              </Label>
              <p className="mt-0.5 text-xs text-slate-400">{pref.desc}</p>
            </div>
            <Switch id={pref.id} defaultChecked={pref.defaultOn} />
          </div>
        ))}
      </div>

      <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
        Preferences are local to this session until the backend exposes a
        settings endpoint.
      </p>
    </div>
  );
}

function BillingTab() {
  const { data: owner } = useOwnerProfile();

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-blue-600 p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-blue-200">Current Plan</div>
            <div className="font-display mt-1 text-2xl font-bold">
              {owner?.plan ?? "—"}
            </div>
            <div className="mt-1 text-sm text-blue-200">
              Up to 10 properties · Unlimited units
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white">
            Active
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-4 text-sm">
          <span className="text-blue-200">Next billing: Oct 22, 2026</span>
          <span className="font-semibold">₹999/month</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="font-display mb-4 text-base font-semibold text-slate-900">
          Available Plans
        </h3>

        <div className="space-y-3">
          {PLANS.map((plan) => {
            const current = plan.name === owner?.plan;
            return (
              <div
                key={plan.name}
                className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                  current
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {plan.name}
                    {current && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">{plan.desc}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">
                    {plan.price}
                  </div>
                  <div className="text-xs text-slate-400">/month</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const onSubmit = handleSubmit(() => {
    toast.info("Password changes need the backend's auth endpoint.");
    reset();
  });

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="font-display text-base font-semibold text-slate-900">
        Security Settings
      </h3>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Current Password"
          htmlFor="pw-current"
          error={errors.current?.message}
        >
          <PasswordInput
            id="pw-current"
            autoComplete="current-password"
            placeholder="Enter current password"
            {...register("current")}
          />
        </Field>

        <Field label="New Password" htmlFor="pw-next" error={errors.next?.message}>
          <PasswordInput
            id="pw-next"
            autoComplete="new-password"
            placeholder="Enter new password"
            {...register("next")}
          />
        </Field>

        <Field
          label="Confirm New Password"
          htmlFor="pw-confirm"
          error={errors.confirm?.message}
        >
          <PasswordInput
            id="pw-confirm"
            autoComplete="new-password"
            placeholder="Confirm new password"
            {...register("confirm")}
          />
        </Field>

        <Button type="submit">Update Password</Button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useQueryState("tab", {
    defaultValue: "profile",
    clearOnDefault: true,
  });

  // Guard against a hand-edited URL naming a tab that doesn't exist.
  useEffect(() => {
    if (!TABS.some((t) => t.id === tab)) setTab("profile");
  }, [tab, setTab]);

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Settings
        </h2>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
          Manage your account preferences
        </p>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        <div className="shrink-0 md:w-48">
          <div className="space-y-0.5 rounded-xl border border-slate-200 bg-white p-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  tab === item.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {tab === "profile" && <ProfileTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "billing" && <BillingTab />}
          {tab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}
