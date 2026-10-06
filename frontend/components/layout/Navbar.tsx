"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Command, Menu, Orbit, Search } from "lucide-react";
import { cn } from "@/lib/cn";

type NavbarProps = {
  onOpenSidebar: () => void;
  sidebarOpen?: boolean;
};

export function Navbar({ onOpenSidebar, sidebarOpen = true }: NavbarProps) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] || "dashboard";

  return (
    <header className="fixed top-0 inset-x-0 h-14 z-40 flex items-center px-3 md:px-4 justify-between transition-all duration-300 border-b bg-[#06070c]/80 backdrop-blur-xl border-white/[0.06]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 transition-all duration-300 overflow-hidden",
            sidebarOpen ? "lg:w-[212px]" : "lg:w-[44px]"
          )}
        >
          <div className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-cyan-400/20 to-blue-600/10 border border-cyan-300/30 shadow-[0_0_18px_rgba(0,229,255,0.18)]">
            <Orbit className="w-[18px] h-[18px] text-primary" />
          </div>
          <span
            className={cn(
              "font-semibold tracking-tight whitespace-nowrap text-white text-sm",
              !sidebarOpen && "lg:hidden"
            )}
          >
            CodeGraph<span className="text-primary"> AI</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="text-white/20">/</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">
            workspace
          </span>
          <span className="text-white/20">/</span>
          <span className="text-foreground capitalize">{segment}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <label className="hidden lg:flex items-center gap-2 px-3 h-8 rounded-lg border border-white/[0.07] bg-white/[0.02] w-72 focus-within:border-primary/40 focus-within:bg-white/[0.04] transition-colors cursor-text">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbols, files, functions…"
            className="bg-transparent border-none outline-none text-[13px] w-full text-white placeholder:text-muted-foreground/70"
          />
          <kbd className="font-mono text-[10px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5 flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </label>

        <button
          type="button"
          className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_6px_#00e5ff]" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-white/[0.07] cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center group-hover:border-primary/50 transition-colors">
            <span className="text-[10px] font-bold text-white">CG</span>
          </div>
          <span className="hidden md:block text-[13px] text-foreground/80 group-hover:text-white transition-colors">
            Team
          </span>
        </div>
      </div>
    </header>
  );
}
