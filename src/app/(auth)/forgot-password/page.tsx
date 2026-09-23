"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(() => setSent(true));

  return (
    <>
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/15">
        <Lock className="size-6 text-blue-300" />
      </div>

      <h2 className="font-display mb-1 text-2xl font-bold text-slate-900">
        Reset password
      </h2>
      <p className="mb-8 text-sm text-slate-500">
        Enter your email to receive reset instructions.
      </p>

      {sent ? (
        <div
          role="status"
          className="rounded-lg border border-green-400/25 bg-green-500/12 p-4 text-center text-sm text-green-300"
        >
          ✓ Reset link sent to your email address.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field
            label="Email address"
            htmlFor="email"
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              className="h-12"
              {...register("email")}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            Send Reset Link
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </>
  );
}
