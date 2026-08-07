import { Container, RotateCcw } from "lucide-react";

const services = [
  ["Backend", "codegraph-backend", "8000"], ["Frontend", "codegraph-frontend", "3000"], ["PostgreSQL", "codegraph-postgres", "5432"], ["Neo4j", "codegraph-neo4j", "7474 / 7687"], ["Ollama", "ollama", "11434"],
];

export function DockerStatus() {
  return <section aria-labelledby="docker-status" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4"><div className="mb-4 flex items-center gap-2"><Container className="size-4 text-cyan-300" /><div><h2 id="docker-status" className="text-base font-semibold text-slate-100">Docker Status</h2><p className="mt-1 text-xs text-slate-500">Docker status endpoint not implemented. Local service ports are shown for reference.</p></div></div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{services.map(([name, container, port]) => <article key={name} className="rounded-lg border border-slate-800 bg-slate-900/35 p-3"><p className="font-medium text-slate-200">{name}</p><p className="mt-1 truncate font-mono text-xs text-slate-500">{container}</p><div className="mt-3 flex items-center justify-between text-xs"><span className="text-slate-400">Port {port}</span><button disabled type="button" title="Backend endpoint not implemented" className="inline-flex items-center gap-1 rounded border border-slate-700 px-1.5 py-1 text-slate-600"><RotateCcw className="size-3" />UI only</button></div></article>)}</div></section>;
}
