"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  Orbit,
  ArrowUpRight,
  CornerDownLeft,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "ai"; text: string; tags?: string[] };

export function AskPanel({
  open,
  onClose,
  projectName,
  projectId,
  nodeCount = 0,
  edgeCount = 0,
  filesCount = 0,
  functionsCount = 0,
  classesCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  projectName: string;
  projectId?: number | null;
  nodeCount?: number;
  edgeCount?: number;
  filesCount?: number;
  functionsCount?: number;
  classesCount?: number;
}) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 320);
    }
  }, [open]);

  const ask = (q: string) => {
    if (!q.trim() || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);

    setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: `Your repository "${projectName}" currently indexes ${filesCount} files, ${functionsCount} functions, and ${classesCount} classes across ${nodeCount} graph nodes.`,
          tags: [
            `${filesCount} files`,
            `${functionsCount} functions`,
            `${classesCount} classes`,
          ],
        },
      ]);
    }, 1200);
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 w-full sm:w-[440px] z-50 flex flex-col border-l border-cyan-300/15 bg-[#070910]/95 backdrop-blur-2xl shadow-[-30px_0_80px_-30px_rgba(0,229,255,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="absolute left-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent" />

        {/* Top Header */}
        <div className="h-14 px-4 border-b border-white/[0.06] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="cg-label !text-white">Ask Codebase</span>
          </div>
          <div className="flex items-center gap-2">
            {projectId && (
              <Link
                href={`/chat?projectId=${projectId}`}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors"
                title="Open in full Chat workspace"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context bar */}
        <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2 font-mono text-[11px] text-muted-foreground shrink-0 bg-white/[0.01]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span>context:</span>
          <span className="text-foreground font-medium truncate max-w-[180px]">
            {projectName}
          </span>
          <span className="ml-auto text-muted-foreground/80">
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </div>

        {/* Messages & Suggestions Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgs.length === 0 && (
            <div className="pt-6">
              <p className="text-lg text-white font-medium tracking-tight">
                What do you want to know about this repository?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Answers are grounded in the indexed knowledge graph and semantic chunks.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  "How many functions are indexed?",
                  "Which classes have the highest complexity?",
                  "Summarize the repository architecture",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="w-full group flex items-center justify-between text-left px-3.5 py-3 rounded-xl border border-white/[0.06] hover:border-primary/30 hover:bg-primary/[0.04] text-[13px] text-foreground/85 transition-all"
                  >
                    <span>{s}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end cg-pop">
                <div className="max-w-[85%] px-3.5 py-2 rounded-xl rounded-br-sm bg-white/[0.06] text-[13px] text-white">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3 cg-pop">
                <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center bg-primary/10 border border-primary/30 mt-0.5">
                  <Orbit className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-[13px] leading-relaxed text-foreground/90">
                  {m.text}
                  {m.tags && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 font-mono text-[10px]">
                      {m.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded border border-white/[0.08] text-muted-foreground bg-white/[0.02]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {thinking && (
            <div className="flex gap-3 items-center cg-pop py-2">
              <div className="relative w-6 h-6 rounded-md flex items-center justify-center bg-primary/10 border border-primary/30">
                <span className="absolute inset-0 rounded-md border border-primary/40 cg-ring" />
                <Orbit
                  className="w-3.5 h-3.5 text-primary animate-spin"
                  style={{ animationDuration: "2.4s" }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                traversing graph
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-1 h-1 rounded-full bg-primary cg-dot"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="p-3 border-t border-white/[0.06] bg-[#06080e]"
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] pl-3 pr-1.5 py-1.5 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.06)] transition-all">
            <span className="font-mono text-primary text-sm">›</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              type="text"
              placeholder="Ask something about this repository..."
              className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-muted-foreground/70 py-1.5"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 hover:shadow-[0_0_18px_rgba(0,229,255,0.45)] active:scale-[0.98] transition-all"
            >
              <span>Ask</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
