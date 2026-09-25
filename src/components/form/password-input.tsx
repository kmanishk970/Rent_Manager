"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

/**
 * A password field that can be read back.
 *
 * Typing a long passphrase blind and getting it wrong twice is the most common
 * reason a sign-in fails, so the field offers to show it. The toggle is a real
 * button: reachable by keyboard, announced by screen readers, and explicitly
 * `type="button"` so pressing Enter in the field submits the form rather than
 * flipping the mask.
 *
 * Visibility resets whenever the field is disabled or remounted — it is never
 * remembered, so a revealed password cannot be left on screen by a later
 * navigation.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        // Room for the button, so a long value never runs underneath it.
        className={cn("pr-11", className)}
      />

      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        // The label says what the button does; aria-pressed carries the state,
        // so it is not announced twice.
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        tabIndex={props.disabled ? -1 : 0}
        disabled={props.disabled}
        className={cn(
          "absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg",
          "text-slate-400 transition-colors hover:text-slate-600",
          "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
