import { Search, X } from "lucide-react";

type ASTSearchProps = {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
};

export function ASTSearch({ value, matchCount, onChange }: ASTSearchProps) {
  return (
    <div className="relative border-b border-slate-800 px-3 py-2">
      <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search node types or identifiers"
        className="h-8 w-full rounded border border-slate-700 bg-slate-900 py-1 pl-7 pr-14 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200" aria-label="Clear AST search">
          <X className="size-3.5" />
        </button>
      )}
      {value && <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">{matchCount}</span>}
    </div>
  );
}
