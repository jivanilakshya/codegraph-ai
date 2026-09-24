"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Bot,
  Gauge,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  FolderKanban,
  GitFork,
  GitGraph,
  Home,
  Settings,
  ShieldAlert,
  ShieldCheck,
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
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/user-guide", label: "User Guide", icon: BookOpen },
  { href: "/dead-code", label: "Dead Code", icon: ShieldAlert },
  { href: "/circular-dependencies", label: "Circular Dependencies", icon: GitFork },
  { href: "/complexity", label: "Complexity", icon: Gauge },
  { href: "/quality", label: "Code Quality", icon: ShieldCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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
      className={`${mobile ? "flex w-64 flex-col" : "hidden lg:flex lg:flex-col"} h-full min-h-0 shrink-0 border-r border-[#202020] bg-black transition-[width] duration-200 ${
        collapsed ? "lg:w-[72px]" : "lg:w-64"
      }`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-[#202020] px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3 group" aria-label="CodeGraph AI dashboard">
          <span className="grid size-8 shrink-0 place-items-center rounded border border-[#333333] bg-[#0A0A0A] font-mono text-xs font-bold text-white group-hover:border-white transition-colors">
            CG
          </span>
          {!collapsed && <span className="truncate font-semibold tracking-tight text-white">CodeGraph AI</span>}
        </Link>
      </div>

      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[rgba(255,255,255,0.07)] text-white border-l-2 border-white font-semibold shadow-[inset_8px_0_20px_rgba(255,255,255,0.025)]"
                  : "text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.045)] hover:text-white hover:translate-x-0.5"
              }`}
            >
              <Icon aria-hidden="true" className={`size-[18px] shrink-0 transition-all duration-200 ${active ? "text-white scale-105" : "text-[#A3A3A3] group-hover:text-white group-hover:scale-105"}`} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#202020] p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#A3A3A3] transition-colors hover:bg-[#101010] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="size-[18px]" /> : <ChevronLeft className="size-[18px]" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
