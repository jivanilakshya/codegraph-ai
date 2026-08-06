"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  FolderKanban,
  GitFork,
  GitGraph,
  Home,
  Network,
  Settings,
  TreePine,
  type LucideIcon,
} from "lucide-react";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/repository", label: "Repository", icon: FolderGit2 },
  { href: "/ast", label: "AST", icon: TreePine },
  { href: "/symbols", label: "Symbols", icon: Bot },
  { href: "/relationships", label: "Relationships", icon: GitFork },
  { href: "/graph", label: "Graph", icon: GitGraph },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/developer", label: "Developer", icon: Network },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ collapsed, onToggle, mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`${mobile ? "flex w-64 flex-col" : "hidden lg:flex lg:flex-col"} shrink-0 border-r border-slate-800 bg-[#0b111b] transition-[width] duration-200 ${
        collapsed ? "lg:w-[72px]" : "lg:w-64"
      }`}
    >
      <div className="flex h-16 items-center border-b border-slate-800 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3" aria-label="CodeGraph AI dashboard">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-slate-950">
            CG
          </span>
          {!collapsed && <span className="truncate font-semibold tracking-tight text-slate-100">CodeGraph AI</span>}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-cyan-400/10 text-cyan-300 shadow-[inset_2px_0_0_0_rgb(34,211,238)]"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
              }`}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-[18px]" /> : <ChevronLeft className="size-[18px]" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
