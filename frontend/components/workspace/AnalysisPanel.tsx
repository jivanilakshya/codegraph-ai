"use client";

import { BrainCircuit } from "lucide-react";
import { useState } from "react";

import { AnalysisTabs } from "./AnalysisTabs";

type AnalysisTab = "AST" | "Symbols" | "Relationships";

type AnalysisPanelProps = { selectedFileName: string | null };

export function AnalysisPanel({ selectedFileName }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("AST");
  return <aside className="flex min-h-56 flex-col border-t border-slate-800 bg-[#0a1019] lg:min-h-0 lg:border-l lg:border-t-0"><div className="flex h-10 items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"><BrainCircuit className="mr-2 size-3.5" /> Analysis</div><AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab} /><div className="grid flex-1 place-items-center p-6 text-center"><div><p className="text-sm font-medium text-slate-300">{activeTab}</p><p className="mt-2 text-xs leading-5 text-slate-500">Coming Soon - Select a file to view analysis.</p>{selectedFileName && <p className="mt-2 truncate text-[11px] text-slate-600">{selectedFileName}</p>}</div></div></aside>;
}
