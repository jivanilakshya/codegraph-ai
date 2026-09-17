import { Suspense, type ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">Loading workspace…</div>}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
}
