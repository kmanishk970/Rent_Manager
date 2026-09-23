"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Route guard. Waits for `isReady` so a signed-in user reloading a deep link
  // isn't bounced to /login before the stored flag has been read.
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isReady, isAuthenticated, router, pathname]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return (
    // The page scrolls as a whole now rather than a pane inside a fixed shell,
    // which is what lets the nav bar stick and blur over the content.
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-4 pt-5 pb-10 lg:px-6">
        {children}
      </main>
    </div>
  );
}
