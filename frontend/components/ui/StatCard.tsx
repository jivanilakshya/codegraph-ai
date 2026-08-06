import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <span className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-cyan-300">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}
