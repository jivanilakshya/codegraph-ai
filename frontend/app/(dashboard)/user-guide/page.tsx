"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  FileCode2,
  FileText,
  FolderGit2,
  FolderKanban,
  GitFork,
  GitGraph,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquare,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  TreePine,
  Wrench,
  Zap,
} from "lucide-react";

// Table of Contents Navigation Items
const TOC_ITEMS = [
  { id: "quick-start", label: "1. Quick Start Sequence (11 Steps)" },
  { id: "project-setup", label: "2. Project Creation & Active Context" },
  { id: "repository-ingestion", label: "3. Adding Repositories (Git & ZIP)" },
  { id: "explorer-ast", label: "4. Repository Explorer & Code Viewer" },
  { id: "ast-treesitter", label: "5. Tree-Sitter AST Parsing Engine" },
  { id: "extracted-symbols", label: "6. Extracted Code Entities & Symbols" },
  { id: "graph-relationships", label: "7. Graph Edge Taxonomy (6 Types)" },
  { id: "knowledge-graph", label: "8. Knowledge Graph Canvas & Hops" },
  { id: "quality-analysis", label: "9. Static Code Quality & Health Score" },
  { id: "rag-assistant", label: "10. Grounded RAG AI Assistant" },
  { id: "rag-tips", label: "11. RAG Prompting & Best Practices" },
  { id: "dev-diagnostics", label: "12. Developer Tools & Diagnostics" },
  { id: "end-to-end-workflow", label: "13. End-to-End Visual Workflow" },
  { id: "troubleshooting", label: "14. Troubleshooting Guide" },
  { id: "faq", label: "15. Frequently Asked Questions" },
];

export default function UserGuidePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Terminal Code Header Banner */}
      <div className="mb-8 rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1C1C1C] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-[#333333]" />
            <span className="size-3 rounded-full bg-[#333333]" />
            <span className="size-3 rounded-full bg-[#333333]" />
            <span className="ml-2 font-mono text-xs text-[#A3A3A3]">
              codegraph-ai://docs/user-guide.md
            </span>
          </div>
          <div className="flex items-center gap-2 rounded border border-[#252525] bg-black px-2.5 py-1 font-mono text-[11px] text-[#A3A3A3]">
            <Terminal className="size-3" />
            <span>v1.0.0 MONOCHROME DOCS</span>
          </div>
        </div>

        <div className="font-mono text-xs text-[#A3A3A3] space-y-1">
          <p className="text-white">$ codegraph docs --load-manual --strict-mode</p>
          <p>[INFO] Initializing CodeGraph AI Interactive Technical Manual...</p>
          <p>[INFO] Loaded 15 documentation modules across Graph, AST, Quality, and RAG architectures.</p>
          <p className="text-[#A3A3A3]">✓ System Status: Fully Operational • Ollama qwen2.5-coder:7b • Neo4j 5 • Qdrant Vector Index</p>
        </div>
      </div>

      {/* Main Page Title Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#252525] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#252525] bg-[#0A0A0A] px-3.5 py-1 font-mono text-xs text-[#A3A3A3] mb-3">
            <BookOpen className="size-3.5 text-white" />
            <span>Official User & Developer Documentation</span>
          </div>
          <h1 className="font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            CodeGraph AI User Guide
          </h1>
          <p className="text-sm md:text-base text-[#A3A3A3] max-w-3xl">
            Complete technical guide to ingesting codebases, exploring Tree-sitter ASTs, traversing Neo4j knowledge graphs, running static code quality metrics, and querying your code using grounded RAG AI.
          </p>
        </div>

        {/* Client-side Search Filter Bar */}
        <div className="w-full md:w-80 shrink-0">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="Filter topics (e.g., Neo4j, RAG, AST)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#252525] bg-[#0A0A0A] pl-10 pr-4 font-mono text-xs text-white placeholder-[#737373] outline-none transition-colors focus:border-white"
            />
          </label>
        </div>
      </div>

      {/* Main Content Layout with Sticky Sidebar TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sticky Desktop TOC Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-6 rounded-xl border border-[#252525] bg-[#0A0A0A] p-5">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Layers className="size-3.5" />
              <span>Table of Contents</span>
            </div>
            <nav className="space-y-1 text-xs">
              {TOC_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-md px-2.5 py-1.5 font-medium text-[#A3A3A3] hover:bg-[#1C1C1C] hover:text-white transition-colors truncate"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-6 pt-5 border-t border-[#1C1C1C]">
              <div className="font-mono text-[11px] text-[#737373]">
                Quick Links
              </div>
              <div className="mt-2 space-y-1.5 text-xs">
                <Link href="/dashboard" className="block text-[#A3A3A3] hover:text-white transition-colors">
                  &rarr; Open Console
                </Link>
                <Link href="/graph" className="block text-[#A3A3A3] hover:text-white transition-colors">
                  &rarr; Knowledge Graph
                </Link>
                <Link href="/chat" className="block text-[#A3A3A3] hover:text-white transition-colors">
                  &rarr; Grounded RAG Chat
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Column */}
        <main className="lg:col-span-9 space-y-12">

          {/* Section 1: Quick Start Sequence (11 Steps) */}
          {matchesSearch("quick start 11 steps setup process workflow") && (
            <section id="quick-start" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <Zap className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">1. Quick Start Sequence (11 Steps)</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Step-by-step workflow to analyze your first repository</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { step: "01", title: "Access Console", desc: "Navigate to the CodeGraph AI console at /dashboard.", link: "/dashboard" },
                  { step: "02", title: "Create or Select Project", desc: "Use the project selector dropdown or create a new project workspace.", link: "/projects" },
                  { step: "03", title: "Ingest Repository", desc: "Provide a public GitHub HTTPS clone URL or upload a ZIP archive of your source code.", link: "/repository" },
                  { step: "04", title: "Tree-sitter AST Parsing", desc: "The backend parser parses python, javascript, typescript, and tsx files into concrete AST trees.", link: "/ast" },
                  { step: "05", title: "Symbol Extraction", desc: "Extracts functions, methods, classes, variables, parameters, and route handlers into PostgreSQL.", link: "/symbols" },
                  { step: "06", title: "Graph Edge Construction", desc: "Constructs 6 types of relationships (IMPORTS, DECLARES, CALLS, EXTENDS, HAS_METHOD, HANDLES) in Neo4j.", link: "/relationships" },
                  { step: "07", title: "Vector Embedding Indexing", desc: "Chunks source files into semantic blocks and indexes 384-dimensional bge-small vectors in Qdrant.", link: "/chat" },
                  { step: "08", title: "Repository & AST Exploration", desc: "Inspect file structure tree-view, syntax highlighting, line ranges, and parsed AST structures.", link: "/repository" },
                  { step: "09", title: "Interactive Graph Canvas", desc: "Visualize graph nodes, search symbols, and switch Depth controls (1 Hop, 2 Hops, 3 Hops).", link: "/graph" },
                  { step: "10", title: "Static Code Quality Audit", desc: "Inspect Dead Code reachability, Circular Dependency cycles, Cyclomatic Complexity > 10, and Health Score.", link: "/quality" },
                  { step: "11", title: "Ask Grounded RAG AI", desc: "Ask questions about your codebase in /chat with graph-augmented vector search powered by Ollama.", link: "/chat" },
                ].map((item) => (
                  <div key={item.step} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-[#1C1C1C] bg-black p-4 hover:border-[#333333] transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 font-mono text-xs font-bold text-black bg-white px-2 py-0.5 rounded">
                        {item.step}
                      </span>
                      <div>
                        <div className="font-semibold text-sm text-white">{item.title}</div>
                        <div className="text-xs text-[#A3A3A3] mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                    <Link href={item.link} className="shrink-0 font-mono text-xs text-white hover:underline flex items-center gap-1 self-start sm:self-auto">
                      <span>Open Page</span>
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Project Setup */}
          {matchesSearch("project creation active context useActiveProject") && (
            <section id="project-setup" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <FolderKanban className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">2. Project Creation & Active Context</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Managing project workspaces & state resolution</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  CodeGraph AI organizes codebases into distinct <strong className="text-white">Project Workspaces</strong>. Every analysis step—AST parsing, Neo4j graph nodes, Qdrant vectors, and quality metrics—is isolated per project.
                </p>

                <div className="rounded-lg border border-[#1C1C1C] bg-black p-4 font-mono text-xs space-y-2">
                  <div className="text-white font-semibold">Active Project Resolution Priority (useActiveProject):</div>
                  <ol className="list-decimal list-inside space-y-1 text-[#A3A3A3]">
                    <li><span className="text-white">Explicit Route Parameter:</span> e.g. /projects/[id]</li>
                    <li><span className="text-white">URL Query Parameter:</span> e.g. /graph?projectId=4</li>
                    <li><span className="text-white">LocalStorage Key:</span> activeProjectId stored in browser session</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-semibold text-white mb-1">Creating a Project</div>
                    <p className="text-xs text-[#A3A3A3]">
                      Click &quot;New Project&quot; in /projects, enter a project title, repository name, description, and target language stack.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-semibold text-white mb-1">Switching Contexts</div>
                    <p className="text-xs text-[#A3A3A3]">
                      Use the top navigation workspace selector or project switcher to instantly change active project context across all tool pages.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 3: Repository Ingestion */}
          {matchesSearch("repository ingestion git zip upload github") && (
            <section id="repository-ingestion" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <FolderGit2 className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">3. Adding Repositories (Git & ZIP)</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Ingestion pipelines for remote Git repositories & local archives</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  CodeGraph AI supports two seamless methods to bring source code into the engine:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-5">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-2">
                      <FolderGit2 className="size-4" />
                      <span>Option A: GitHub Git Clone</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mb-3">
                      Provide a public GitHub repository HTTPS URL (e.g., https://github.com/owner/repo.git).
                    </p>
                    <ul className="text-xs text-[#A3A3A3] space-y-1 font-mono">
                      <li>• Clones default branch automatically</li>
                      <li>• Traverses subdirectories & packages</li>
                      <li>• Ignores node_modules, .git, venv</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-5">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-white mb-2">
                      <FileCode2 className="size-4" />
                      <span>Option B: Local ZIP Archive Upload</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mb-3">
                      Upload a compressed .zip file containing your local source code directory.
                    </p>
                    <ul className="text-xs text-[#A3A3A3] space-y-1 font-mono">
                      <li>• Extracts directly to project storage</li>
                      <li>• Preserves nested directory paths</li>
                      <li>• Automatic UTF-8 text validation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Repository Explorer */}
          {matchesSearch("repository explorer code viewer tree view ast") && (
            <section id="explorer-ast" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <FileText className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">4. Repository Explorer & Code Viewer</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Interactive source file tree & symbol inspector</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  The <strong className="text-white">Repository Explorer</strong> page (/repository) provides a high-performance workspace to browse project files, view raw source code with line numbers, and inspect inline AST symbols.
                </p>

                <div className="rounded-lg border border-[#1C1C1C] bg-black p-4 space-y-2">
                  <div className="font-mono text-xs text-white font-semibold">Key Capabilities:</div>
                  <ul className="list-disc list-inside text-xs text-[#A3A3A3] space-y-1">
                    <li><strong className="text-white">Directory Tree Navigation:</strong> Nested folder expansion with file type icons.</li>
                    <li><strong className="text-white">Syntax-Highlighted Code View:</strong> Clean monochrome code display with line numbers.</li>
                    <li><strong className="text-white">Line-Range Deep Linking:</strong> Deep-link directly to line ranges (e.g. /repository?filePath=main.py&startLine=12&endLine=45).</li>
                    <li><strong className="text-white">Inline Symbol Sidebar:</strong> View all functions, classes, and variables declared within the selected file.</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Section 5: Tree-Sitter AST Engine */}
          {matchesSearch("tree-sitter ast parsing parser language support") && (
            <section id="ast-treesitter" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <TreePine className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">5. Tree-Sitter AST Parsing Engine</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Concrete syntax tree parsing for multi-language codebases</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  CodeGraph AI employs <strong className="text-white">Tree-sitter</strong>—an industry-standard incremental parsing library—to build concrete syntax trees (CST/AST) for source files.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  {[
                    { lang: "Python (.py)", parser: "tree-sitter-python" },
                    { lang: "JavaScript (.js)", parser: "tree-sitter-javascript" },
                    { lang: "TypeScript (.ts)", parser: "tree-sitter-typescript" },
                    { lang: "TSX (.tsx)", parser: "tree-sitter-tsx" },
                  ].map((item) => (
                    <div key={item.lang} className="rounded border border-[#1C1C1C] bg-black p-3 text-center">
                      <div className="font-semibold text-white">{item.lang}</div>
                      <div className="text-[10px] text-[#737373] mt-1">{item.parser}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-[#1C1C1C] bg-black p-4 font-mono text-xs space-y-1">
                  <div className="text-white font-semibold mb-2">Tree-sitter AST Node Traversal:</div>
                  <p className="text-[#737373]">{"// Example AST structure generated during parse"}</p>
                  <p className="text-white">module &rarr; function_definition [name: &quot;calculate_complexity&quot;]</p>
                  <p className="text-[#A3A3A3]">  ├── parameters &rarr; identifier [name: &quot;ast_tree&quot;]</p>
                  <p className="text-[#A3A3A3]">  └── block &rarr; return_statement &rarr; binary_operator</p>
                </div>
              </div>
            </section>
          )}

          {/* Section 6: Extracted Symbols */}
          {matchesSearch("extracted symbols entities functions classes variables") && (
            <section id="extracted-symbols" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <Code2 className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">6. Extracted Code Entities & Symbols</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Structural symbol taxonomy & relational attributes</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  During AST traversal, CodeGraph AI identifies and categorizes source code elements into structured <strong className="text-white">Code Entities</strong> stored in PostgreSQL and mapped into Neo4j nodes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1">Functions & Methods</div>
                    <p className="text-xs text-[#A3A3A3]">
                      Captures function name, parameter lists, return types, line range (start/end), async flags, and docstrings.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1">Classes & Interfaces</div>
                    <p className="text-xs text-[#A3A3A3]">
                      Extracts class declarations, base classes (inheritance), decorators, member fields, and constructor methods.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1">API Routes & Handlers</div>
                    <p className="text-xs text-[#A3A3A3]">
                      Identifies REST/HTTP route endpoints (GET, POST, PUT, DELETE), path decorators, and request handlers.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 7: Graph Relationships */}
          {matchesSearch("graph relationships edge taxonomy imports declares calls extends") && (
            <section id="graph-relationships" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <GitFork className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">7. Graph Edge Taxonomy (6 Relationship Types)</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Neo4j property graph edge definitions</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  CodeGraph AI constructs a rich property graph in Neo4j comprising 6 distinct directed relationship edge types:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  {[
                    { edge: "IMPORTS", desc: "File or module imports another CodeFile or external package dependency." },
                    { edge: "DECLARES", desc: "CodeFile declares a CodeEntity (function, class, variable, or route)." },
                    { edge: "CALLS", desc: "Function or method invokes another function, method, or external API call." },
                    { edge: "EXTENDS", desc: "Class inherits from or extends another base class or interface." },
                    { edge: "HAS_METHOD", desc: "Class entity contains a member method or constructor." },
                    { edge: "HANDLES", desc: "CodeEntity handles an API Route HTTP request endpoint." },
                  ].map((item) => (
                    <div key={item.edge} className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                      <div className="font-bold text-white mb-1">(:Node)-[:{item.edge}]-&gt;(:Node)</div>
                      <div className="text-xs text-[#A3A3A3] font-sans">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section 8: Knowledge Graph Navigation */}
          {matchesSearch("knowledge graph canvas depth hops react flow") && (
            <section id="knowledge-graph" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <GitGraph className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">8. Knowledge Graph Canvas & Depth Hops</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Interactive graph canvas powered by React Flow & Dagre layout</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  The <strong className="text-white">Knowledge Graph Canvas</strong> (/graph) allows developers to visually inspect architectural dependencies and trace call hierarchies in real-time.
                </p>

                <div className="rounded-lg border border-[#1C1C1C] bg-black p-4 space-y-3">
                  <div className="font-mono text-xs text-white font-semibold">Graph Canvas Controls:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="rounded border border-[#252525] p-3">
                      <div className="text-white font-bold mb-1">Depth: 1 Hop</div>
                      <div className="text-[11px] text-[#A3A3A3] font-sans">Shows direct immediate connections of selected symbol.</div>
                    </div>
                    <div className="rounded border border-[#252525] p-3">
                      <div className="text-white font-bold mb-1">Depth: 2 Hops</div>
                      <div className="text-[11px] text-[#A3A3A3] font-sans">Expands 2 levels of callers, callees, imports, and declarations.</div>
                    </div>
                    <div className="rounded border border-[#252525] p-3">
                      <div className="text-white font-bold mb-1">Depth: 3 Hops</div>
                      <div className="text-[11px] text-[#A3A3A3] font-sans">Deep multi-level architectural dependency sub-graph.</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 9: Quality Analysis */}
          {matchesSearch("quality analysis static dead code circular complexity health score") && (
            <section id="quality-analysis" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <ShieldCheck className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">9. Static Code Quality & Health Score</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Static graph traversal algorithms & complexity metrics</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  CodeGraph AI analyzes graph topology to identify code debt, unused code, and structural risks.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1 flex items-center gap-2">
                      <ShieldAlert className="size-3.5" />
                      <span>Dead Code Reachability</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Uses graph traversal (BFS/DFS) from entry points to identify orphan functions and unreachable modules with zero inbound CALLS/IMPORTS edges.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1 flex items-center gap-2">
                      <GitFork className="size-3.5" />
                      <span>Circular Dependency Loops</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Detects import cycles (A &rarr; B &rarr; C &rarr; A) using Tarjan&apos;s strongly connected components DFS algorithm on IMPORTS relationships.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1 flex items-center gap-2">
                      <Cpu className="size-3.5" />
                      <span>Cyclomatic Complexity V(G)</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Calculates decision points in AST trees: V(G) = E - N + 2P. Flags functions exceeding complexity threshold V(G) &gt; 10.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1C1C1C] bg-black p-4">
                    <div className="font-mono text-xs font-bold text-white mb-1 flex items-center gap-2">
                      <Sparkles className="size-3.5" />
                      <span>Composite Health Score (0-100)</span>
                    </div>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Combines dead code ratio, circular cycle counts, and high-complexity penalties into a single 0-100 quality benchmark score.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 10: RAG Assistant */}
          {matchesSearch("rag grounded ai assistant chat vector qdrant neo4j ollama") && (
            <section id="rag-assistant" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <MessageSquare className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">10. Grounded RAG AI Assistant</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Hybrid Vector + Knowledge Graph RAG powered by Ollama</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  The <strong className="text-white">AI RAG Assistant</strong> (/chat) delivers accurate, hallucination-free answers about your codebase by combining two retrieval engines:
                </p>

                <div className="rounded-lg border border-[#1C1C1C] bg-black p-5 space-y-3">
                  <div className="font-mono text-xs font-bold text-white">Hybrid Retrieval Architecture:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="rounded border border-[#252525] p-3">
                      <div className="text-white font-bold mb-1">1. Qdrant Dense Vector Search</div>
                      <div className="text-[#A3A3A3] font-sans">Retrieves semantic code chunks via BAAI/bge-small-en-v1.5 embeddings (384 dimensions).</div>
                    </div>
                    <div className="rounded border border-[#252525] p-3">
                      <div className="text-white font-bold mb-1">2. Neo4j Graph Context</div>
                      <div className="text-[#A3A3A3] font-sans">Fetches exact callers, callees, imports, and AST parent symbols for retrieved code blocks.</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#A3A3A3] pt-2 border-t border-[#1C1C1C]">
                    Both contexts are synthesized into a grounded prompt passed to local <strong className="text-white">Ollama (qwen2.5-coder:7b)</strong> for streaming SSE responses with line-level file citations.
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 11: RAG Tips */}
          {matchesSearch("rag tips prompting guidance questions best practices") && (
            <section id="rag-tips" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <Lightbulb className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">11. RAG Prompting & Best Practices</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Formulating effective codebase queries</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-[#A3A3A3]">
                <div className="rounded-lg border border-[#1C1C1C] bg-black p-4 space-y-2">
                  <div className="font-mono text-xs text-white font-semibold">Recommended Prompting Patterns:</div>
                  <ul className="space-y-2 text-xs font-mono">
                    <li className="p-2 rounded bg-[#0A0A0A] border border-[#252525]">
                      <span className="text-white">&quot;Where is the authentication JWT token verified in this project?&quot;</span>
                      <div className="text-[11px] text-[#737373] mt-0.5">→ Triggers vector search for JWT keywords and Neo4j HANDLES routes.</div>
                    </li>
                    <li className="p-2 rounded bg-[#0A0A0A] border border-[#252525]">
                      <span className="text-white">&quot;Show me all functions that call calculate_health_score and their caller hierarchy.&quot;</span>
                      <div className="text-[11px] text-[#737373] mt-0.5">→ Leverages Neo4j CALLS graph edges to return caller trees.</div>
                    </li>
                    <li className="p-2 rounded bg-[#0A0A0A] border border-[#252525]">
                      <span className="text-white">&quot;Explain how the AST tree-sitter parser handles python decorator nodes.&quot;</span>
                      <div className="text-[11px] text-[#737373] mt-0.5">→ Ingests Tree-sitter AST files and returns implementation snippets.</div>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Section 12: Developer Diagnostics */}
          {matchesSearch("developer tools diagnostics internal health pool") && (
            <section id="dev-diagnostics" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <Wrench className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">12. Developer Tools & Diagnostics</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">System telemetry & backend component health at /developer</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                <p>
                  The <strong className="text-white">Developer Diagnostics Console</strong> (/developer) provides real-time infrastructure metrics for backend microservices:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="rounded border border-[#1C1C1C] bg-black p-3">
                    <div className="text-white font-bold mb-1">PostgreSQL 16</div>
                    <div className="text-[11px] text-[#737373]">Relational DB table sizes, active connection pool stats.</div>
                  </div>
                  <div className="rounded border border-[#1C1C1C] bg-black p-3">
                    <div className="text-white font-bold mb-1">Neo4j Graph Database</div>
                    <div className="text-[11px] text-[#737373]">Node counts, relationship counts, Cypher query latency.</div>
                  </div>
                  <div className="rounded border border-[#1C1C1C] bg-black p-3">
                    <div className="text-white font-bold mb-1">Qdrant Vector DB</div>
                    <div className="text-[11px] text-[#737373]">Collection vector counts, payload memory usage.</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 13: End-to-End Visual Workflow */}
          {matchesSearch("end to end visual workflow pipeline architecture diagram") && (
            <section id="end-to-end-workflow" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <Network className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">13. End-to-End Visual Workflow</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Architectural data pipeline flow from source code to RAG AI</p>
                </div>
              </div>

              {/* Custom Monochrome Visual Workflow Diagram Component */}
              <div className="mt-6 rounded-lg border border-[#1C1C1C] bg-black p-6 space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
                  <div className="w-full md:w-1/4 rounded border border-[#252525] bg-[#0A0A0A] p-4">
                    <FolderGit2 className="size-6 text-white mx-auto mb-2" />
                    <div className="font-mono text-xs font-bold text-white">1. Source Input</div>
                    <div className="text-[11px] text-[#A3A3A3] mt-1">Git Clone / ZIP File</div>
                  </div>

                  <ChevronRight className="size-5 text-[#737373] hidden md:block rotate-90 md:rotate-0" />

                  <div className="w-full md:w-1/4 rounded border border-[#252525] bg-[#0A0A0A] p-4">
                    <TreePine className="size-6 text-white mx-auto mb-2" />
                    <div className="font-mono text-xs font-bold text-white">2. Tree-sitter AST</div>
                    <div className="text-[11px] text-[#A3A3A3] mt-1">Symbol & Syntax Parsing</div>
                  </div>

                  <ChevronRight className="size-5 text-[#737373] hidden md:block rotate-90 md:rotate-0" />

                  <div className="w-full md:w-1/4 rounded border border-[#252525] bg-[#0A0A0A] p-4">
                    <Database className="size-6 text-white mx-auto mb-2" />
                    <div className="font-mono text-xs font-bold text-white">3. Neo4j + Qdrant</div>
                    <div className="text-[11px] text-[#A3A3A3] mt-1">Graph Edges & Vectors</div>
                  </div>

                  <ChevronRight className="size-5 text-[#737373] hidden md:block rotate-90 md:rotate-0" />

                  <div className="w-full md:w-1/4 rounded border border-[#252525] bg-[#0A0A0A] p-4">
                    <MessageSquare className="size-6 text-white mx-auto mb-2" />
                    <div className="font-mono text-xs font-bold text-white">4. Grounded RAG</div>
                    <div className="text-[11px] text-[#A3A3A3] mt-1">Ollama qwen2.5-coder:7b</div>
                  </div>
                </div>

                <div className="text-center font-mono text-xs text-[#737373] pt-4 border-t border-[#1C1C1C]">
                  Strictly Isolated Per Project Workspace • Fast Local Inference
                </div>
              </div>
            </section>
          )}

          {/* Section 14: Troubleshooting Guide */}
          {matchesSearch("troubleshooting errors issues neo4j ollama zip") && (
            <section id="troubleshooting" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <ShieldAlert className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">14. Troubleshooting Guide</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Resolving common ingestion & runtime issues</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-[#A3A3A3]">
                {[
                  {
                    issue: "Neo4j Connection Failed / Timeout",
                    fix: "Ensure Neo4j Docker container is running on bolt://localhost:7687 and credentials match backend/config.py (NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD).",
                  },
                  {
                    issue: "Ollama Model Not Found (qwen2.5-coder:7b)",
                    fix: "Run 'ollama pull qwen2.5-coder:7b' in your host terminal to pull the local coding LLM model before initiating chat sessions.",
                  },
                  {
                    issue: "ZIP Archive Extraction Error",
                    fix: "Verify the uploaded file is a valid .zip archive and does not exceed 100MB. Ensure files are UTF-8 text files.",
                  },
                  {
                    issue: "Empty Knowledge Graph Nodes",
                    fix: "Ensure the target repository contains supported source files (.py, .js, .ts, .tsx). Plain text or binary files will not produce AST nodes.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-[#1C1C1C] bg-black p-4 space-y-1">
                    <div className="font-mono text-xs font-bold text-white flex items-center gap-2">
                      <span className="size-2 rounded-full bg-white" />
                      <span>{item.issue}</span>
                    </div>
                    <div className="text-xs text-[#A3A3A3] pl-4">{item.fix}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 15: Frequently Asked Questions */}
          {matchesSearch("faq frequently asked questions accordion") && (
            <section id="faq" className="rounded-xl border border-[#252525] bg-[#0A0A0A] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid size-9 place-items-center rounded-lg border border-[#333333] bg-black">
                  <HelpCircle className="size-5 text-white" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-bold text-white">15. Frequently Asked Questions (FAQ)</h2>
                  <p className="font-mono text-xs text-[#A3A3A3]">Common questions about CodeGraph AI</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  {
                    q: "Is my source code sent to external cloud AI services?",
                    a: "No. CodeGraph AI runs entirely locally using Docker containers (PostgreSQL, Neo4j, Qdrant) and local Ollama LLMs. Your code never leaves your local network.",
                  },
                  {
                    q: "What programming languages are supported for AST parsing?",
                    a: "Currently Python (.py), JavaScript (.js), TypeScript (.ts), and TSX (.tsx) are fully supported with specialized Tree-sitter parsers.",
                  },
                  {
                    q: "How does the Depth control (1/2/3 Hops) work in the Knowledge Graph?",
                    a: "Depth controls determine how many relationship edge levels from the selected target node are rendered on the React Flow canvas, preventing visual clutter.",
                  },
                  {
                    q: "Can I query multiple projects simultaneously in RAG Chat?",
                    a: "Chat queries are scoped to the active selected project to ensure strict context precision and prevent cross-repository hallucinations.",
                  },
                  {
                    q: "What is Cyclomatic Complexity and why is V(G) > 10 flagged?",
                    a: "Cyclomatic complexity measures the number of linearly independent paths through a function's code. Functions with V(G) > 10 are harder to test and maintain.",
                  },
                ].map((faqItem, idx) => (
                  <div key={idx} className="rounded-lg border border-[#1C1C1C] bg-black overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-white hover:bg-[#0F0F0F] transition-colors"
                    >
                      <span>{faqItem.q}</span>
                      <ChevronDown className={`size-4 text-[#737373] transition-transform ${expandedFaq === idx ? "rotate-180" : ""}`} />
                    </button>
                    {expandedFaq === idx && (
                      <div className="p-4 pt-0 text-xs text-[#A3A3A3] border-t border-[#1C1C1C] bg-[#0A0A0A]">
                        {faqItem.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
