import type { LucideIcon } from "lucide-react";

type EmptyAnalysisProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyAnalysis({ icon: Icon, title, description }: EmptyAnalysisProps) {
  return (
    <div className="grid flex-1 place-items-center p-6 text-center">
      <div>
        <Icon className="mx-auto size-7 text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
        <p className="mt-1 max-w-52 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
