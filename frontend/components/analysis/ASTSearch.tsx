import { Search, X } from "lucide-react";

type ASTSearchProps = {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
};

export function ASTSearch({ value, matchCount, onChange }: ASTSearchProps) {
  return (
    <div className="relative border-b border-[#202020] bg-[#080808] px-3 py-2">
      <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-[#737373]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search node types or identifiers"
        className="h-8 w-full rounded border border-[#242424] bg-[#050505] py-1 pl-8 pr-14 font-mono text-xs text-white outline-none placeholder:text-[#737373] focus:border-[rgba(255,255,255,0.4)] focus:shadow-[inset_0_0_10px_rgba(255,255,255,0.03)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-[#737373] hover:text-white"
          aria-label="Clear AST search"
        >
          <X className="size-3.5" />
        </button>
      )}
      {value && <span className="absolute right-10 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#A3A3A3]">{matchCount}</span>}
    </div>
  );
}

