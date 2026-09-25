"use client";

import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  Home,
  IndianRupee,
  LayoutGrid,
  XCircle,
} from "lucide-react";
import { occupancyChartData, rentChartData } from "@/lib/mock-data";
import { useOwnerProfile, usePayments, useProperties } from "@/lib/queries";
import { inr, inrK, inrL, monthLong } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { GlowCard } from "@/components/ui/glow-card";

function StatCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string;
  icon: ReactNode;
}) {
  return (
    // The label rides alongside the icon rather than below the figure. Pairing
    // the two smallest elements into one row lets the number own the card,
    // which is what the eye should land on first.
    <GlowCard className="content-start p-4">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
        >
          {icon}
        </div>
        <span className="truncate text-[13px] font-semibold text-slate-500">
          {label}
        </span>
      </div>

      <div
        data-numeric
        className="mt-3.5 text-[26px] leading-none font-extrabold tracking-[-0.03em] text-slate-900"
      >
        {value}
      </div>

      {sub && (
        <div className="mt-2 text-xs font-medium text-slate-400">{sub}</div>
      )}
    </GlowCard>
  );
}

export default function DashboardPage() {
  const { data: properties, isPending } = useProperties();
  const { data: payments } = usePayments();
  const { data: owner } = useOwnerProfile();
  const { resolvedTheme } = useTheme();

  // Recharts takes colours as props, not classes, so the CSS theme layer
  // cannot reach them — the chart has to be told which mode it is in.
  const isDark = resolvedTheme === "dark";
  const axisTick = isDark ? "rgba(226,232,240,0.55)" : "#94A3B8";
  const gridStroke = isDark ? "rgba(255,255,255,0.10)" : "#E2E8F0";
  const legendText = isDark ? "rgba(226,232,240,0.7)" : "#64748B";

  if (isPending || !properties) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-xl xl:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const allUnits = properties.flatMap((p) => p.floors.flatMap((f) => f.units));
  const totalUnits = allUnits.length;
  const occupied = allUnits.filter((u) => u.status === "occupied").length;
  const vacant = allUnits.filter((u) => u.status === "vacant").length;
  const monthlyRent = allUnits
    .filter((u) => u.status === "occupied")
    .reduce((sum, u) => sum + u.rent, 0);

  // Derived from live payment rows rather than the hard-coded figure the
  // prototype used, so recording a payment moves this tile.
  const outstanding = (payments ?? []).filter((p) => p.status !== "paid");
  const pendingRent = outstanding.reduce((sum, p) => sum + p.amount, 0);

  const occupancyPct = totalUnits
    ? Math.round((occupied / totalUnits) * 100)
    : 0;

  const firstName = owner?.name.split(" ")[0] ?? "";

  // The billing period the ledger is currently reporting on. Derived rather
  // than hard-coded, which is what the prototype did.
  const period = payments?.[0]?.month ? monthLong(payments[0].month) : "";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          Good morning{firstName && `, ${firstName}`} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Here&apos;s your property portfolio overview
          {period && ` for ${period}`}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Properties"
          value={String(properties.length)}
          tone="bg-blue-50"
          icon={<Home className="size-4 text-blue-600" />}
        />
        <StatCard
          label="Total Units"
          value={String(totalUnits)}
          tone="bg-violet-50"
          icon={<LayoutGrid className="size-4 text-violet-600" />}
        />
        <StatCard
          label="Occupied"
          value={String(occupied)}
          sub={`${occupancyPct}% occupancy`}
          tone="bg-green-50"
          icon={<CheckCircle2 className="size-4 text-green-600" />}
        />
        <StatCard
          label="Vacant"
          value={String(vacant)}
          tone="bg-red-50"
          icon={<XCircle className="size-4 text-red-600" />}
        />
        <StatCard
          label="Monthly Rent"
          value={inrL(monthlyRent)}
          sub="Expected"
          tone="bg-emerald-50"
          icon={<IndianRupee className="size-4 text-emerald-600" />}
        />
        <StatCard
          label="Pending Rent"
          value={inrK(pendingRent)}
          sub={`${outstanding.length} tenant${outstanding.length === 1 ? "" : "s"}`}
          tone="bg-amber-50"
          icon={<Clock className="size-4 text-amber-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Rent Collection
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Collected vs pending — last 12 months
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-blue-500" />
                Collected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-amber-400" />
                Pending
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={rentChartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* A deeper stop makes the area read as a filled volume rather
                    than a faint tint that the grid shows straight through. */}
                <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: axisTick }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisTick }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => inrK(v)}
              />
              <Tooltip
                formatter={(value, name) => [
                  inr(Number(value)),
                  name === "collected" ? "Collected" : "Pending",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="collected"
                stroke="#2563EB"
                strokeWidth={2.5}
                fill="url(#gCollected)"
              />
              <Area
                type="monotone"
                dataKey="pending"
                stroke="#F59E0B"
                strokeWidth={2.5}
                fill="url(#gPending)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-5">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Occupancy
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Across all properties
            </p>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={occupancyChartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {occupancyChartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: legendText }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 text-center">
            <div className="font-display text-3xl font-bold text-slate-900">
              {occupancyPct}%
            </div>
            <div className="text-xs text-slate-400">Occupancy Rate</div>
          </div>
        </div>
      </div>

      {/* Property overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Properties
          </h3>
          <Link
            href="/properties"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="space-y-3">
          {properties.map((property) => {
            const units = property.floors.flatMap((f) => f.units);
            const occ = units.filter((u) => u.status === "occupied").length;
            const pct = units.length
              ? Math.round((occ / units.length) * 100)
              : 0;
            const rent = units
              .filter((u) => u.status === "occupied")
              .reduce((sum, u) => sum + u.rent, 0);

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="flex w-full items-center gap-4 rounded-lg border border-slate-100 p-3 text-left transition-all hover:border-blue-200 hover:bg-blue-50/30"
              >
                <Image
                  src={property.image}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-lg bg-slate-100 object-cover"
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {property.name}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {property.location}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {occ}/{units.length}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-800">
                    {inrK(rent)}
                  </div>
                  <div className="text-xs text-slate-400">/month</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
