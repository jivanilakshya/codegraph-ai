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
  const isGraphWorkspace = pathname === "/graph" || pathname.startsWith("/graph/");
  const isChatWorkspace = pathname === "/chat" || pathname.startsWith("/chat/");
  const isFullHeightWorkspace = isGraphWorkspace || isChatWorkspace;
  const shouldAutoCollapseSidebar = isFullHeightWorkspace;

  // Stored user preference for sidebar collapse state (default expanded: false)
  const [userCollapsedPreference, setUserCollapsedPreference] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Active rendering state for sidebar collapse
  const [collapsed, setCollapsed] = useState<boolean>(shouldAutoCollapseSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Restore stored user preference on initial client mount
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    const pref = stored === "true";
    setUserCollapsedPreference(pref);
    if (shouldAutoCollapseSidebar) {
      setCollapsed(true);
    } else {
      setCollapsed(pref);
    }
  }, [shouldAutoCollapseSidebar]);

  // Update active collapsed state when route changes
  useEffect(() => {
    if (!isMounted) return;
    if (shouldAutoCollapseSidebar) {
      setCollapsed(true);
    } else {
      setCollapsed(userCollapsedPreference);
    }
  }, [pathname, shouldAutoCollapseSidebar, userCollapsedPreference, isMounted]);

  const handleToggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setUserCollapsedPreference(next);
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <div className={isDark ? "flex h-[100dvh] w-full min-h-0 min-w-0 overflow-hidden bg-[#080d14] text-slate-100" : "flex h-[100dvh] w-full min-h-0 min-w-0 overflow-hidden bg-slate-100 text-slate-950"}>
      <Sidebar collapsed={collapsed} onToggle={handleToggleSidebar} />
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-slate-950/80" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
          <div className="relative h-full w-64">
            <Sidebar collapsed={false} mobile onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {!isGraphWorkspace ? (
          <Navbar onOpenSidebar={() => setMobileOpen(true)} isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />
        ) : (
          <div className="shrink-0 lg:hidden">
            <Navbar onOpenSidebar={() => setMobileOpen(true)} isDark={isDark} onToggleTheme={() => setIsDark((value) => !value)} />
          </div>
        )}
        <main className={isFullHeightWorkspace ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "flex flex-col flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-5 sm:p-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}
