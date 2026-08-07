type PageHeaderProps = {
  title: string;
  description: string;
  showStatusBadge?: boolean;
};

export function PageHeader({ title, description, showStatusBadge = true }: PageHeaderProps) {
  return (
    <header className="border-b border-slate-800 pb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
        CodeGraph AI
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
        {description}
      </p>
      {showStatusBadge && <span className="mt-5 inline-flex rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">Coming Soon</span>}
    </header>
  );
}
