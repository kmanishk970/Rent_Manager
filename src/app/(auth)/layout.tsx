import type { ReactNode } from "react";
import { Home } from "lucide-react";

const HERO_STATS = [
  { label: "Properties", value: "3" },
  { label: "Units Managed", value: "21" },
  { label: "Rent Collected", value: "₹3.2L" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // The sign-in screen stays dark in both themes — its whole composition is
    // white type over a deep field. In dark mode this is transparent so the
    // root backdrop's shader shows through; in light mode, where that backdrop
    // is unmounted, the original static gradient stands in.
    <div className="relative flex min-h-screen overflow-hidden bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_50%,#0F172A_100%)] dark:bg-none">
      {/* Branding panel — hidden below lg, matching the design. */}
      <div className="relative z-10 hidden p-12 lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div>
          <div className="mb-16 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500">
              <Home className="size-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              RentFlow
            </span>
          </div>

          <h1 className="font-display mb-6 text-5xl leading-tight font-bold text-white">
            Manage your
            <br />
            properties with
            <br />
            <span className="text-blue-400">confidence.</span>
          </h1>

          <p className="max-w-md text-lg leading-relaxed text-slate-400">
            Track tenants, collect rent, manage documents — all in one clean,
            powerful dashboard built for property owners.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {HERO_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="font-display mb-1 text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* `auth-glass` restyles the whole form for the dark backdrop —
              headings, labels, inputs and links — from one rule in globals.css,
              so the three auth pages don't each need dark-mode overrides. */}
          <div className="auth-glass rounded-2xl p-8">
            {/* Compact logo for the mobile layout, where the panel is hidden. */}
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600">
                <Home className="size-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-xl font-bold text-white">
                RentFlow
              </span>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
