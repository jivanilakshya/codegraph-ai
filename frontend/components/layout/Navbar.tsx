"use client";

import { Bell, ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";

type NavbarProps = {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function Navbar({ onOpenSidebar, isDark, onToggleTheme }: NavbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 bg-[#0b111b]/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <button type="button" className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-slate-700 sm:flex">
        <span className="size-2 rounded-full bg-emerald-400" />
        <span>Workspace</span>
        <ChevronDown className="size-4 text-slate-500" />
      </button>

      <label className="relative ml-auto w-full max-w-md sm:ml-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search codebase..."
          className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/70"
        />
      </label>

      <div className="flex items-center gap-1">
        <button type="button" onClick={onToggleTheme} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Toggle theme">
          {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>
        <button type="button" className="relative grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100" aria-label="Notifications">
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-cyan-400" />
        </button>
        <button type="button" className="ml-1 flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-slate-800">
          <span className="grid size-7 place-items-center rounded-full bg-violet-500 text-xs font-semibold text-white">CG</span>
          <span className="hidden text-sm font-medium text-slate-300 xl:block">CodeGraph Team</span>
        </button>
      </div>
    </header>
  );
}
