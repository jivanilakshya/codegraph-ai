"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const isGraphWorkspace = pathname === "/graph";
  const [collapsed, setCollapsed] = useState(isGraphWorkspace);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isGraphWorkspace) setCollapsed(true);
  }, [isGraphWorkspace]);

  return (
    <div className={isDark ? "flex h-screen min-h-0 bg-[#080d14] text-slate-100" : "flex h-screen min-h-0 bg-slate-100 text-slate-950"}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/80" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full w-64">
            <Sidebar collapsed={false} mobile onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!isGraphWorkspace ? (
          <Navbar onOpenSidebar={() => setMobileOpen(true)} isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />
        ) : (
          <div className="shrink-0 lg:hidden">
            <Navbar onOpenSidebar={() => setMobileOpen(true)} isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />
          </div>
        )}
        <main className={isGraphWorkspace ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1 overflow-y-auto p-5 sm:p-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}
