"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const isGraphWorkspace = pathname === "/graph" || pathname.startsWith("/graph/");
  const isChatWorkspace = pathname === "/chat" || pathname.startsWith("/chat/");
  const isRelationshipsWorkspace = pathname === "/relationships" || pathname.startsWith("/relationships/");
  const isSymbolsWorkspace = pathname === "/symbols" || pathname.startsWith("/symbols/");
  const isAstWorkspace = pathname === "/ast" || pathname.startsWith("/ast/");
  const isFullHeightWorkspace = isGraphWorkspace || isChatWorkspace || isRelationshipsWorkspace || isSymbolsWorkspace || isAstWorkspace;
  const isDashboardRoute = pathname === "/dashboard";
  const isProjectsRoute = pathname === "/projects" || pathname.startsWith("/projects/");
  const isAmbientRoute = isDashboardRoute || isProjectsRoute;
  const shouldAutoCollapseSidebar = isFullHeightWorkspace;

  // Stored user preference for sidebar collapse state (default expanded: false)
  const [userCollapsedPreference, setUserCollapsedPreference] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Active rendering state for sidebar collapse
  const [collapsed, setCollapsed] = useState<boolean>(shouldAutoCollapseSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <div className="min-h-screen w-full text-foreground selection:bg-primary/25 selection:text-white">
      {/* Ambient background layers — rendered at layout level so they are visible behind all dashboard & project content */}
      {isAmbientRoute && (
        <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 cg-ambient" />
          <div className="absolute inset-0 cg-grid" />
          <div className="absolute inset-0 cg-noise" />
        </div>
      )}

      <Navbar
        onOpenSidebar={() => setMobileOpen(true)}
        sidebarOpen={!collapsed}
      />
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="relative h-full w-60">
            <Sidebar
              collapsed={false}
              mobile
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <main
        className={cn(
          "relative transition-all duration-300 pt-14 min-h-screen",
          collapsed ? "lg:ml-[60px]" : "lg:ml-60",
          isFullHeightWorkspace
            ? "flex min-h-0 flex-1 flex-col overflow-hidden h-[calc(100dvh-3.5rem)]"
            : isAmbientRoute
            ? "overflow-x-hidden"
            : "bg-[#06070c] p-5 sm:p-8"
        )}
        style={isAmbientRoute ? { zIndex: 1 } : undefined}
      >
        {children}
      </main>
    </div>
  );
}
