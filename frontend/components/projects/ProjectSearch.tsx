import { Search, X } from "lucide-react";

type ProjectSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProjectSearch({ value, onChange }: ProjectSearchProps) {
  return (
    <label className="relative block max-w-xl flex-1">
      <span className="sr-only">Search projects</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search projects by name or repository URL..."
        className="h-10 w-full rounded-lg border border-[#242424] bg-[#050505] pl-10 pr-10 font-mono text-xs text-white outline-none transition-all placeholder:text-[#737373] focus:border-[rgba(255,255,255,0.4)] focus:shadow-[0_0_16px_rgba(255,255,255,0.05)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-[#737373] transition-colors hover:bg-[#151515] hover:text-white"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

