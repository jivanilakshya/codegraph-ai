import type { LucideIcon } from "lucide-react";

type EmptyAnalysisProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyAnalysis({ icon: Icon, title, description }: EmptyAnalysisProps) {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center select-none font-mono">
      <div>
        <Icon className="mx-auto size-8 text-[#737373]" />
        <p className="mt-3 font-sans text-sm font-bold text-white">{title}</p>
        <p className="mt-1 max-w-56 font-mono text-xs text-[#A3A3A3] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

