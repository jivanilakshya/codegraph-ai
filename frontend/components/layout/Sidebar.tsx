"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  FolderCode,
  Braces,
  Variable,
  Share2,
  Network,
  MessageSquare,
  Skull,
  CircleOff,
  Activity,
  CheckSquare,
  BarChart,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderGit2 },
      { href: "/repository", label: "Repository", icon: FolderCode },
    ],
  },
  {
    title: "Analysis",
    items: [
      { href: "/ast", label: "AST", icon: Braces },
      { href: "/symbols", label: "Symbols", icon: Variable },
      { href: "/relationships", label: "Relationships", icon: Share2 },
      { href: "/graph", label: "Graph", icon: Network },
      { href: "/chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    title: "Quality",
    items: [
      { href: "/dead-code", label: "Dead Code", icon: Skull },
      { href: "/circular-dependencies", label: "Circular Dependencies", icon: CircleOff },
      { href: "/complexity", label: "Complexity", icon: Activity },
      { href: "/quality", label: "Code Quality", icon: CheckSquare },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart },
      { href: "/user-guide", label: "User Guide", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({
  collapsed,
  onToggle,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed top-14 bottom-0 left-0 z-30 flex flex-col border-r border-white/[0.05] bg-[#06070c]/85 backdrop-blur-xl transition-all duration-300",
        mobile
          ? "w-60 translate-x-0"
          : collapsed
          ? "hidden lg:flex lg:w-[60px]"
          : "hidden lg:flex lg:w-60"
      )}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {NAV_GROUPS.map((g, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-4")}>
            {g.title &&
              (!collapsed ? (
                <div className="cg-label px-3 pb-1.5 !text-[9.5px] !text-white/30">
                  {g.title}
                </div>
              ) : (
                <div className="mx-3 mb-2 h-px bg-white/[0.06]" />
              ))}
            {g.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex items-center gap-3 h-8 px-3 rounded-md w-full text-left transition-colors duration-200 group",
                    active
                      ? "bg-white/[0.045] text-white"
                      : "text-[#8792a6] hover:bg-white/[0.03] hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary shadow-[0_0_8px_#00e5ff]" />
                  )}
                  <item.icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0 transition-colors",
                      active
                        ? "text-primary drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]"
                        : "text-[#8792a6] group-hover:text-white"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px] whitespace-nowrap",
                      collapsed && "lg:hidden"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-2 border-t border-white/[0.05] hidden lg:block">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center gap-2 w-full h-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.03] rounded-md transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!collapsed ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="font-mono text-[11px]">collapse</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
