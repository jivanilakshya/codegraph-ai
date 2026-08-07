"use client";

import { BrainCircuit, FileWarning, Network, Shapes } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ASTSearch } from "@/components/analysis/ASTSearch";
import { ASTToolbar } from "@/components/analysis/ASTToolbar";
import { ASTTree, getAstMetrics, getAstSearchMatchCount } from "@/components/analysis/ASTTree";
import { EmptyAnalysis } from "@/components/analysis/EmptyAnalysis";
import { LoadingAnalysis } from "@/components/analysis/LoadingAnalysis";
import { LoadingAST } from "@/components/analysis/LoadingAST";
import { RelationshipList } from "@/components/analysis/RelationshipList";
import { SymbolList } from "@/components/analysis/SymbolList";
import { getFileAnalysis } from "@/services/workspace";
import type { FileAnalysis } from "@/types/workspace";

import { AnalysisTabs } from "./AnalysisTabs";

type AnalysisTab = "AST" | "Symbols" | "Relationships";

type AnalysisPanelProps = { selectedFileId: number | null; selectedFileName: string | null; sourceText: string | null };

export function AnalysisPanel({ selectedFileId, selectedFileName, sourceText }: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("AST");
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [analysisFileId, setAnalysisFileId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (selectedFileId === null) {
      setAnalysis(null);
      setAnalysisFileId(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setAnalysis(null);
    setAnalysisFileId(null);
    setError(null);
    setIsLoading(true);

    void getFileAnalysis(selectedFileId, controller.signal)
      .then((response) => {
        setAnalysis(response);
        setAnalysisFileId(selectedFileId);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load analysis for this file.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [refreshToken, selectedFileId]);

  const currentAnalysis = analysisFileId === selectedFileId ? analysis : null;
  const hasSymbols = currentAnalysis && Object.values(currentAnalysis.symbols).some((values) => values.length > 0);
  const astMetrics = useMemo(() => currentAnalysis ? getAstMetrics(currentAnalysis.ast) : { nodeCount: 0, maximumDepth: 0 }, [currentAnalysis]);
  const astSearchMatchCount = useMemo(() => currentAnalysis ? getAstSearchMatchCount(currentAnalysis.ast, searchTerm, sourceText) : 0, [currentAnalysis, searchTerm, sourceText]);
  const panelContent = () => {
    if (!selectedFileName) return <EmptyAnalysis icon={Shapes} title="Select a file" description="Choose a repository file to view its analysis." />;
    if (isLoading) return activeTab === "AST" ? <LoadingAST /> : <LoadingAnalysis />;
    if (error) return <EmptyAnalysis icon={FileWarning} title="Analysis unavailable" description={error} />;
    if (!currentAnalysis) return activeTab === "AST" ? <LoadingAST /> : <LoadingAnalysis />;
    if (activeTab === "Symbols") return hasSymbols ? <SymbolList symbols={currentAnalysis.symbols} /> : <EmptyAnalysis icon={Shapes} title="No symbols found" description="This file does not expose any supported symbols." />;
    if (activeTab === "Relationships") return currentAnalysis.relationships.length ? <RelationshipList relationships={currentAnalysis.relationships} /> : <EmptyAnalysis icon={Network} title="No relationships found" description="This file does not contain any detected relationships." />;
    return <><ASTToolbar nodeCount={astMetrics.nodeCount} maximumDepth={astMetrics.maximumDepth} isParsing={isLoading} onRefresh={() => setRefreshToken((value) => value + 1)} /><ASTSearch value={searchTerm} matchCount={astSearchMatchCount} onChange={setSearchTerm} /><ASTTree ast={currentAnalysis.ast} searchTerm={searchTerm} sourceText={sourceText} /></>;
  };

  return <aside className="flex min-h-56 flex-col border-t border-slate-800 bg-[#0a1019] lg:min-h-0 lg:border-l lg:border-t-0"><div className="flex h-10 items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"><BrainCircuit className="mr-2 size-3.5" /> Analysis</div><AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab} /><div className="flex min-h-0 flex-1 flex-col overflow-auto">{panelContent()}</div></aside>;
}
