"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useNotifications, useOwnerProfile } from "@/lib/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Detail routes that should keep their parent item highlighted. */
  match?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/properties", label: "Properties", icon: Home, match: ["/units"] },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/rent", label: "Rent", icon: CreditCard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(item: NavItem, pathname: string) {
  return [item.href, ...(item.match ?? [])].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: notifications } = useNotifications();
  const { data: owner } = useOwnerProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  // Close the mobile sheet when the route changes or on Escape.
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-1 lg:px-6">
      {/*
       * A floating rounded bar rather than a full-bleed strip, so the canvas
       * reads behind it and the shadow has something to fall on. The blur keeps
       * content legible as it scrolls underneath.
       */}
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/85 dark:border-white/10 dark:bg-white/12 px-3 shadow-card backdrop-blur-xl lg:gap-5 lg:px-4">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
            <Home className="size-5 text-white" strokeWidth={2.5} />
          </span>
          <span className="hidden sm:block">
            <span className="block text-[15px] leading-none font-extrabold tracking-[-0.02em] text-slate-900">
              RentFlow
            </span>
            <span className="mt-0.5 block text-[11px] leading-none font-medium text-slate-400">
              Property Manager
            </span>
          </span>
        </Link>

        <span className="hidden h-7 w-px shrink-0 bg-slate-200 lg:block dark:bg-white/15" />

        {/* Primary navigation */}
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-beam nav-pill flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold",
                  // The shadow is in globals.css; these are the rest.
                  "transition-[color,background-color,box-shadow,transform] duration-200 ease-out",
                  "hover:-translate-y-px focus-visible:-translate-y-px motion-reduce:transform-none",
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
                // The beam's colour is a stylesheet concern: white on the
                // active pill and throughout the dark theme, accent otherwise.
                data-on-accent={active ? "" : undefined}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-white" : "text-slate-400",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />

          <Link
            href="/notifications"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
            className={cn(
              "relative flex size-10 items-center justify-center rounded-xl transition-colors",
              pathname === "/notifications"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unread}
              </span>
            )}
          </Link>

          {/* Account */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2 rounded-xl py-1 pr-2 pl-1 transition-colors hover:bg-slate-100"
              aria-label="Account menu"
            >
              {owner ? (
                <Image
                  src={owner.photo}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-lg object-cover"
                  unoptimized
                />
              ) : (
                <span className="size-8 animate-pulse rounded-lg bg-slate-200" />
              )}
              <span className="hidden text-left xl:block">
                <span className="block max-w-[10rem] truncate text-[13px] leading-none font-semibold text-slate-800">
                  {owner?.name ?? "—"}
                </span>
                <span className="mt-0.5 block text-[11px] leading-none font-medium text-slate-400">
                  {owner ? `${owner.plan} Plan` : ""}
                </span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-slate-400" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {owner?.name ?? "—"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {owner?.email ?? ""}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/notifications" />}>
                <Bell className="size-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-red-600 data-highlighted:bg-red-50 data-highlighted:text-red-700"
              >
                <LogOut className="size-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex size-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation sheet */}
      {mobileOpen && (
        <div className="mx-auto mt-2 max-w-[1600px] rounded-2xl border border-slate-200/70 bg-white p-2 shadow-card lg:hidden">
          <nav className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-white" : "text-slate-400",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
