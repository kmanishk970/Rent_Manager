"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { emailField, nameField, passwordField } from "@/lib/validation";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

const schema = z.object({
  name: nameField("Enter your full name"),
  email: emailField(),
  password: passwordField(),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const { register: createAccount } = useAuth();
  const router = useRouter();

  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await createAccount({
        email: values.email,
        password: values.password,
        name: values.name,
      });
    } catch (error) {
      setFailure(
        error instanceof Error ? error.message : "Could not create the account",
      );
      return;
    }
    router.replace("/dashboard");
  });

  return (
    <>
      <h2 className="font-display mb-1 text-2xl font-bold text-slate-900">
        Create account
      </h2>
      <p className="mb-8 text-sm text-slate-500">
        Start managing your properties today
      </p>

      {failure && (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {failure}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Rajesh Kapoor"
            aria-invalid={Boolean(errors.name)}
            className="h-12"
            {...register("name")}
          />
        </Field>

        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
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

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            aria-invalid={Boolean(errors.password)}
            className="h-12"
            {...register("password")}
          />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
