"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { emailField } from "@/lib/validation";
import { Field } from "@/components/form/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

const schema = z.object({
  email: emailField(),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [failure, setFailure] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      await login(values.email, values.password);
    } catch (error) {
      // Wrong credentials are not a form-field problem, so they are shown
      // above the form rather than hung off one of the inputs.
      setFailure(error instanceof Error ? error.message : "Could not sign in");
      return;
    }
    // Send the user back to the page the route guard interrupted, if any.
    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
  });

  return (
    <>
      <h2 className="font-display mb-1 text-2xl font-bold text-slate-900">
        Welcome back
      </h2>
      <p className="mb-8 text-sm text-slate-500">Sign in to your account</p>

      {failure && (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {failure}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
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
          Sign In
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering at build time.
  return (
    <Suspense fallback={<div className="h-80" />}>
      <LoginForm />
    </Suspense>
  );
}
