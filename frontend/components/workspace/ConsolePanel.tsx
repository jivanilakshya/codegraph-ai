import { TerminalSquare } from "lucide-react";

type ConsolePanelProps = { messages: string[] };

export function ConsolePanel({ messages }: ConsolePanelProps) {
  return <section className="border-t border-slate-800 bg-[#080d14]"><div className="flex h-8 items-center border-b border-slate-800 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"><TerminalSquare className="mr-2 size-3.5" /> Console</div><div className="h-24 overflow-auto px-3 py-2 font-mono text-xs leading-5 text-slate-400">{messages.map((message, index) => <p key={`${message}-${index}`}><span className="mr-2 text-cyan-500">›</span>{message}</p>)}</div></section>;
}
