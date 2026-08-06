"use client";

type AnalysisTab = "AST" | "Symbols" | "Relationships";

type AnalysisTabsProps = { activeTab: AnalysisTab; onTabChange: (tab: AnalysisTab) => void };

const tabs: AnalysisTab[] = ["AST", "Symbols", "Relationships"];

export function AnalysisTabs({ activeTab, onTabChange }: AnalysisTabsProps) {
  return <div className="flex border-b border-slate-800 px-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => onTabChange(tab)} className={`h-10 px-2 text-xs font-medium transition-colors ${activeTab === tab ? "border-b-2 border-cyan-400 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}>{tab}</button>)}</div>;
}
