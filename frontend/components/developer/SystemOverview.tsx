import { Boxes, CheckCircle2, CircleAlert, Database, Globe2, Server, Timer, type LucideIcon } from "lucide-react";

import type { HealthResponse } from "@/types/developer";

type SystemOverviewProps = { health: HealthResponse | null; isLoading: boolean; lastUpdated: Date | null; latencyMs: number | null };
type StatusTone = "healthy" | "warning" | "offline" | "unknown";

export function statusTone(healthy: boolean | null): StatusTone {
  if (healthy === true) return "healthy";
  if (healthy === false) return "offline";
  return "unknown";
}

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const styles: Record<StatusTone, string> = { healthy: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300", warning: "border-amber-400/25 bg-amber-400/10 text-amber-300", offline: "border-rose-400/25 bg-rose-400/10 text-rose-300", unknown: "border-slate-700 bg-slate-800/60 text-slate-400" };
  const dotStyles: Record<StatusTone, string> = { healthy: "bg-emerald-400", warning: "bg-amber-400", offline: "bg-rose-400", unknown: "bg-slate-500" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[tone]}`}><span className={`size-1.5 rounded-full ${dotStyles[tone]}`} />{label}</span>;
}

function SystemCard({ icon: Icon, name, detail, tone, latencyMs, updatedAt }: { icon: LucideIcon; name: string; detail: string; tone: StatusTone; latencyMs?: number | null; updatedAt?: Date | null }) {
  const labels: Record<StatusTone, string> = { healthy: "Healthy", warning: "Warning", offline: "Offline", unknown: "Unavailable" };
  return <article className="rounded-xl border border-slate-800 bg-slate-950/65 p-4 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)]"><div className="flex items-start justify-between gap-3"><span className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-cyan-300"><Icon className="size-4" /></span><StatusPill tone={tone} label={labels[tone]} /></div><h3 className="mt-4 font-semibold text-slate-100">{name}</h3><p className="mt-1 min-h-5 text-xs text-slate-500">{detail}</p><div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Timer className="size-3" />{latencyMs === null || latencyMs === undefined ? "—" : `${latencyMs} ms`}</span><span>{updatedAt ? updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Not checked"}</span></div></article>;
}

export function SystemOverview({ health, isLoading, lastUpdated, latencyMs }: SystemOverviewProps) {
  const healthAvailable = health?.status === "healthy";
  return <section aria-labelledby="system-overview"><div className="mb-4 flex items-center gap-2"><Server className="size-4 text-cyan-300" /><h2 id="system-overview" className="text-base font-semibold text-slate-100">System Overview</h2>{isLoading && <span className="text-xs text-slate-500">Checking services…</span>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><SystemCard icon={Globe2} name="Backend" detail="GET /health" tone={statusTone(healthAvailable ? true : health ? false : null)} latencyMs={latencyMs} updatedAt={lastUpdated} /><SystemCard icon={Globe2} name="Frontend" detail="Local runtime" tone="healthy" updatedAt={lastUpdated} /><SystemCard icon={Database} name="PostgreSQL" detail="Reported by backend health" tone={statusTone(health?.postgres ?? null)} latencyMs={latencyMs} updatedAt={lastUpdated} /><SystemCard icon={Boxes} name="Neo4j" detail="Reported by backend health" tone={statusTone(health?.neo4j ?? null)} latencyMs={latencyMs} updatedAt={lastUpdated} /><SystemCard icon={CircleAlert} name="Ollama" detail="Health endpoint not implemented" tone="unknown" updatedAt={lastUpdated} /></div></section>;
}
