import { Activity, Globe2, Network, Server } from "lucide-react";

import { StatusPill, statusTone } from "@/components/developer/SystemOverview";
import type { HealthResponse } from "@/types/developer";

export function HealthDashboard({ health }: { health: HealthResponse | null }) {
  const backendAvailable = health?.status === "healthy" ? true : health ? false : null;
  const rows = [["Backend API", Globe2, backendAvailable, "GET /health"], ["PostgreSQL", Server, health?.postgres ?? null, "Backend health probe"], ["Neo4j", Network, health?.neo4j ?? null, "Backend health probe"], ["Ollama", Activity, null, "Endpoint not implemented"]] as const;
  return <section aria-labelledby="health-dashboard" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4"><h2 id="health-dashboard" className="text-base font-semibold text-slate-100">Health Dashboard</h2><div className="mt-3 divide-y divide-slate-800">{rows.map(([name, Icon, available, description]) => <div key={name} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-2.5"><Icon className="size-4 shrink-0 text-slate-400" /><div><p className="text-sm font-medium text-slate-200">{name}</p><p className="text-xs text-slate-500">{description}</p></div></div><StatusPill tone={statusTone(available)} label={available === true ? "Healthy" : available === false ? "Offline" : "Unavailable"} /></div>)}</div></section>;
}
