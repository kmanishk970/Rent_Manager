"use client";

import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppNotification, NotificationType } from "@/types";

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: string; tone: string }
> = {
  "rent-reminder": { label: "Rent Reminder", icon: "💰", tone: "bg-amber-100 text-amber-700" },
  "lease-expiry": { label: "Lease Expiry", icon: "📅", tone: "bg-red-100 text-red-600" },
  "tenant-update": { label: "Tenant Update", icon: "👤", tone: "bg-blue-100 text-blue-700" },
  "document-update": { label: "Document", icon: "📄", tone: "bg-violet-100 text-violet-700" },
  "payment-received": { label: "Payment", icon: "✅", tone: "bg-green-100 text-green-700" },
};

function NotificationRow({
  notification,
  onSelect,
}: {
  notification: AppNotification;
  onSelect: (n: AppNotification) => void;
}) {
  const config = TYPE_CONFIG[notification.type];

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all hover:shadow-card ${
        notification.read
          ? "border-slate-200 bg-white"
          : "border-blue-200 bg-blue-50"
      }`}
    >
      <div
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-lg ${config.tone}`}
      >
        {config.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div
              className={`text-sm font-semibold ${notification.read ? "text-slate-800" : "text-slate-900"}`}
            >
              {notification.title}
            </div>
            <div className="mt-0.5 text-sm leading-relaxed text-slate-500">
              {notification.message}
            </div>
          </div>
          {!notification.read && (
            <>
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
              <span className="sr-only">Unread</span>
            </>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.tone}`}
          >
            {config.label}
          </span>
          <span className="text-xs text-slate-400">
            {formatDate(notification.date)}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications, isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isPending || !notifications) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-14 w-64" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read).length;

  // The prototype pinned the "Recent" cutoff to two literal dates. Grouping
  // relative to the newest item keeps it correct as data moves.
  const newest = notifications.reduce(
    (latest, n) => (n.date > latest ? n.date : latest),
    notifications[0]?.date ?? "",
  );
  const cutoff = dayjs(newest).subtract(7, "day");

  const recent = notifications.filter((n) => !dayjs(n.date).isBefore(cutoff));
  const earlier = notifications.filter((n) => dayjs(n.date).isBefore(cutoff));

  const handleSelect = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.tenantId) router.push(`/tenants/${notification.tenantId}`);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Notifications
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            {unread > 0 ? `${unread} unread notifications` : "All caught up!"}
          </p>
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((type) => {
          const config = TYPE_CONFIG[type];
          const count = notifications.filter((n) => n.type === type).length;
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${config.tone}`}
            >
              <span aria-hidden>{config.icon}</span>
              {config.label}: {count}
            </span>
          );
        })}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 text-4xl" aria-hidden>
            🔔
          </div>
          <p className="text-slate-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {recent.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Recent
              </h3>
              <div className="space-y-2">
                {recent.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {earlier.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Earlier
              </h3>
              <div className="space-y-2">
                {earlier.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
