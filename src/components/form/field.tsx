"use client";

import type { ReactNode } from "react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  /** Rendered to the right of the label — e.g. a "Forgot password?" link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + error message, so every form in the app reports validation
 * the same way and stays wired up for screen readers.
 */
export function Field({
  label,
  htmlFor,
  error,
  action,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </Label>
        {action}
      </div>

      {children}

      {error && (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className={cn("mt-1.5 text-xs font-medium text-red-600")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
