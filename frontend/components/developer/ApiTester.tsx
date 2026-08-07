"use client";

import { AlertCircle, Braces, Play, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import type { ApiEndpoint } from "@/types/developer";

type ApiRunResult = { durationMs?: number; message?: string; payload?: unknown; status?: number; unavailable?: boolean };
type ApiTesterProps = { fileId: number | null; onRun: (endpoint: ApiEndpoint) => Promise<ApiRunResult>; projectId: number | null };

const endpoints: { id: ApiEndpoint; label: string; method: "GET" | "POST"; path: string; needsFile?: boolean; needsProject?: boolean; unavailable?: boolean }[] = [
  { id: "health", label: "Health", method: "GET", path: "/health" },
  { id: "projects", label: "Projects", method: "GET", path: "/api/v1/projects" },
  { id: "repository", label: "Repository", method: "GET", path: "/api/v1/projects/{projectId}/repository", needsProject: true },
  { id: "ast", label: "AST", method: "GET", path: "/api/v1/files/{fileId}/ast", needsFile: true },
  { id: "symbols", label: "Symbols", method: "GET", path: "No global endpoint", unavailable: true },
  { id: "relationships", label: "Relationships", method: "GET", path: "No global endpoint", unavailable: true },
  { id: "graph", label: "Graph", method: "GET", path: "/api/v1/projects/{projectId}/graph", needsProject: true },
  { id: "graph-stats", label: "Graph Statistics", method: "GET", path: "/api/v1/projects/{projectId}/graph/stats", needsProject: true },
  { id: "scanner", label: "Scanner", method: "POST", path: "/api/v1/projects/{projectId}/scan", needsProject: true },
];

function preview(payload: unknown) { const json = JSON.stringify(payload, null, 2); return json.length > 900 ? `${json.slice(0, 900)}\n…` : json; }

export function ApiTester({ fileId, onRun, projectId }: ApiTesterProps) {
  const [pending, setPending] = useState<ApiEndpoint | null>(null);
  const [results, setResults] = useState<Partial<Record<ApiEndpoint, ApiRunResult>>>({});
  useEffect(() => { setResults({}); }, [fileId, projectId]);
  const run = async (endpoint: ApiEndpoint) => { setPending(endpoint); const result = await onRun(endpoint); setResults((current) => ({ ...current, [endpoint]: result })); setPending(null); };
  return <section aria-labelledby="api-tester" className="rounded-xl border border-slate-800 bg-slate-950/65"><div className="border-b border-slate-800 p-4"><h2 id="api-tester" className="text-base font-semibold text-slate-100">API Tester</h2><p className="mt-1 text-xs text-slate-500">Request supported backend endpoints and inspect their live responses.</p></div><div className="divide-y divide-slate-800">{endpoints.map((endpoint) => { const result = results[endpoint.id]; const disabled = Boolean(endpoint.unavailable || (endpoint.needsProject && !projectId) || (endpoint.needsFile && !fileId)); return <article key={endpoint.id} className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${endpoint.method === "GET" ? "bg-cyan-400/10 text-cyan-300" : "bg-violet-400/10 text-violet-300"}`}>{endpoint.method}</span><h3 className="text-sm font-semibold text-slate-200">{endpoint.label}</h3></div><p className="mt-1 truncate font-mono text-xs text-slate-500">{endpoint.path}</p></div><button type="button" disabled={disabled || pending !== null} onClick={() => void run(endpoint.id)} className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"><Play className={`size-3 ${pending === endpoint.id ? "animate-pulse" : ""}`} />{pending === endpoint.id ? "Running…" : endpoint.unavailable ? "Unavailable" : "Run request"}</button></div>{(endpoint.needsProject && !projectId || endpoint.needsFile && !fileId) && !endpoint.unavailable && <p className="mt-2 text-xs text-amber-300">Select {endpoint.needsFile ? "a file" : "a project"} in Database Explorer to enable this request.</p>}{result && <div className={`mt-3 rounded-lg border p-3 ${result.unavailable ? "border-amber-400/20 bg-amber-400/5" : result.status && result.status < 400 ? "border-emerald-400/20 bg-emerald-400/5" : "border-rose-400/20 bg-rose-400/5"}`}><div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"><span className="inline-flex items-center gap-1 font-semibold text-slate-200">{result.unavailable ? <AlertCircle className="size-3.5 text-amber-300" /> : <Braces className="size-3.5 text-cyan-300" />}{result.unavailable ? "Not implemented" : `HTTP ${result.status}`}</span>{result.durationMs !== undefined && <span className="inline-flex items-center gap-1 text-slate-400"><Timer className="size-3" />{result.durationMs} ms</span>}</div>{result.message && <p className="mt-2 text-xs text-slate-400">{result.message}</p>}{result.payload !== undefined && <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-950/80 p-3 text-xs leading-5 text-slate-300">{preview(result.payload)}</pre>}</div>}</article>; })}</div></section>;
}
