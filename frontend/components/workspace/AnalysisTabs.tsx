"use client";

type AnalysisTab = "AST" | "Symbols" | "Relationships";

type AnalysisTabsProps = { activeTab: AnalysisTab; onTabChange: (tab: AnalysisTab) => void };

const tabs: AnalysisTab[] = ["AST", "Symbols", "Relationships"];

export function AnalysisTabs({ activeTab, onTabChange }: AnalysisTabsProps) {
  return (
    <div className="flex border-b border-[#202020] bg-[#0A0A0A] px-3 font-mono text-xs select-none">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`h-10 px-3 font-semibold transition-all duration-150 ${
            activeTab === tab
              ? "border-b-2 border-white bg-[#121212] text-white"
              : "border-b-2 border-transparent text-[#737373] hover:bg-[#0E0E0E] hover:text-[#A3A3A3]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

