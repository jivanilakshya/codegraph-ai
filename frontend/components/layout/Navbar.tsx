"use client";

import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";

type NavbarProps = {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function Navbar({ onOpenSidebar, isDark, onToggleTheme }: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[#202020] bg-black/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="grid size-9 place-items-center rounded-lg text-[#A3A3A3] hover:bg-[#151515] hover:text-white transition-colors lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <button type="button" className="hidden items-center gap-2 rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-1.5 text-xs font-mono font-medium text-white hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.04)] transition-all sm:flex">
        <span className="size-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        <span>Workspace</span>
        <ChevronDown className="size-3.5 text-[#737373]" />
      </button>

      <label className="relative ml-auto w-full max-w-md sm:ml-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
        <input
          type="search"
          placeholder="Search codebase..."
          className="h-9 w-full rounded-lg border border-[#252525] bg-[#050505] pl-9 pr-3 text-xs text-white outline-none placeholder:text-[#737373] focus:border-[rgba(255,255,255,0.35)] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.03)] transition-all"
        />
      </label>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onToggleTheme} className="grid size-9 place-items-center rounded-lg text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.04)] hover:text-white transition-all" aria-label="Toggle theme">
          {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <button type="button" className="relative grid size-9 place-items-center rounded-lg text-[#A3A3A3] hover:bg-[rgba(255,255,255,0.04)] hover:text-white transition-all" aria-label="Notifications">
          <Bell className="size-[18px]" />
          <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        </button>
        <button type="button" className="ml-1 flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-[rgba(255,255,255,0.04)] transition-all">
          <span className="grid size-7 place-items-center rounded-md border border-[#333333] bg-[#0A0A0A] font-mono text-xs font-bold text-white">CG</span>
          <span className="hidden text-xs font-medium text-[#A3A3A3] xl:block hover:text-white">CodeGraph Team</span>
        </button>
      </div>
    </header>
  );
}
