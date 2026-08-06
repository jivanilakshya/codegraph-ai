import { Search, X } from "lucide-react";

type ProjectSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <label className="relative block max-w-xl">
      <span className="sr-only">Search projects</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search projects by name or repository URL..."
        className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-10 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-500/70"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Clear search">
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}
