"use client";

import Link from "next/link";
import {
  AlertCircle,
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  GitBranch,
  Menu,
  MessageSquare,
  MoreVertical,
  Network,
  Orbit,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Variable,
  X,
} from "lucide-react";
import React, {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useActiveProject } from "@/hooks/useActiveProject";
import { cn } from "@/lib/cn";
import { buildSourceLocationUrl } from "@/lib/navigation";
import {
  addChatMessage,
  createConversation,
  deleteConversation,
  generateChatTitle,
  getConversationMessages,
  getConversations,
  updateConversationTitle,
} from "@/services/conversations";
import { askCodebaseQuestionStream } from "@/services/rag";
import type {
  ChatMessage,
  Conversation,
  GraphContextDetail,
  GraphRAGGenerationResponse,
  RAGChunkResult,
} from "@/types/rag";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConversationMessage =
  | { id: string; role: "user"; question: string }
  | { id: string; role: "assistant"; response: GraphRAGGenerationResponse };

// ─────────────────────────────────────────────────────────────────────────────
// Inline Markdown & Code Renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined)
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {m[2]}
        </strong>
      );
    else if (m[3] !== undefined)
      parts.push(
        <em key={key++} className="italic text-zinc-300">
          {m[3]}
        </em>
      );
    else if (m[4] !== undefined)
      parts.push(
        <code
          key={key++}
          className="rounded bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 font-mono text-[0.88em] text-primary"
        >
          {m[4]}
        </code>
      );
    else if (m[5] !== undefined)
      parts.push(
        <a
          key={key++}
          href={m[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary transition-colors"
        >
          {m[5]}
        </a>
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3.5 border border-white/[0.08] bg-[#05070b] overflow-hidden rounded-lg">
      <div className="h-8 flex items-center justify-between px-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="font-mono text-[10px] text-amber-200 uppercase">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 font-mono text-[9.5px] text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12px] leading-6 text-[#c9d4e3]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderTextBlocks(text: string, baseKey: number): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let k = baseKey;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      k++;
      continue;
    }

    // Ordered list
    if (/^\d+\. /m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(Boolean);
      result.push(
        <ol
          key={k++}
          className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-primary/70 text-[13.5px] leading-relaxed text-zinc-200"
        >
          {items.map((item, i) => (
            <li key={i}>{renderInline(item.replace(/^\d+\.\s*/, ""))}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list
    if (/^[-*•] /m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(Boolean);
      result.push(
        <ul
          key={k++}
          className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-primary/70 text-[13.5px] leading-relaxed text-zinc-200"
        >
          {items.map((item, i) => (
            <li key={i}>{renderInline(item.replace(/^[-*•]\s*/, ""))}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Headings
    if (/^#{1,3} /.test(trimmed)) {
      const lvl = (trimmed.match(/^(#+) /) ?? ["", ""])[1].length;
      const content = trimmed.replace(/^#+\s*/, "");
      const cls =
        lvl === 1
          ? "mt-5 mb-2 text-base font-bold text-white tracking-tight"
          : lvl === 2
          ? "mt-4 mb-2 text-[15px] font-semibold text-white tracking-tight pb-1 border-b border-white/[0.06]"
          : "mt-3.5 mb-1.5 text-xs font-semibold text-zinc-200 uppercase tracking-wide";
      result.push(
        <p key={k++} className={cls}>
          {renderInline(content)}
        </p>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      result.push(<hr key={k++} className="my-4 border-white/[0.08]" />);
      continue;
    }

    // Regular paragraph
    const lines = trimmed.split("\n");
    result.push(
      <p
        key={k++}
        className="my-2 text-[13.5px] leading-7 text-foreground/85 [overflow-wrap:anywhere]"
      >
        {lines.map((line, li) => (
          <span key={li}>
            {renderInline(line)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }
  return result;
}

function MarkdownContent({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const fencePattern = /^```(\w*)\n?([\s\S]*?)```/gm;
  let cursor = 0;
  let bk = 0;
  let fm: RegExpExecArray | null;

  while ((fm = fencePattern.exec(text)) !== null) {
    const before = text.slice(cursor, fm.index);
    if (before.trim()) blocks.push(...renderTextBlocks(before, bk));
    bk += 100;
    blocks.push(
      <CodeBlock key={`cb-${bk}`} lang={fm[1] || "code"} code={fm[2].trimEnd()} />
    );
    bk++;
    cursor = fm.index + fm[0].length;
  }
  const remaining = text.slice(cursor);
  if (remaining.trim()) blocks.push(...renderTextBlocks(remaining, bk));

  return <>{blocks}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Card matching Figma Redesign
// ─────────────────────────────────────────────────────────────────────────────

function sourceLabel(source: RAGChunkResult): string {
  return source.entity_name ?? source.name ?? source.entity_type ?? "Code Source";
}

function SourceCard({
  source,
  projectId,
}: {
  source: RAGChunkResult;
  projectId: number;
}) {
  const name = sourceLabel(source);
  const lines =
    source.start_line === null
      ? null
      : source.end_line === null || source.end_line === source.start_line
      ? `Line ${source.start_line}`
      : `Lines ${source.start_line}–${source.end_line}`;

  return (
    <div className="group border border-white/[0.065] bg-white/[0.015] hover:border-primary/25 hover:bg-primary/[0.025] rounded-lg p-3 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-md border border-white/[0.08] bg-black/20 flex items-center justify-center flex-shrink-0">
            <Code2 className="w-3.5 h-3.5 text-primary/80" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono text-[11.5px] text-white truncate font-medium"
              title={name}
            >
              {name}
            </div>
            {source.entity_type && (
              <div className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-violet-300 uppercase">
                {source.entity_type}
              </div>
            )}
          </div>
        </div>
        {source.file_path && (
          <div
            className="mt-2 font-mono text-[9.5px] text-muted-foreground truncate"
            title={source.file_path}
          >
            {source.file_path}
          </div>
        )}
        {lines && <div className="mt-0.5 font-mono text-[9px] text-white/30">{lines}</div>}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.04]">
        {source.file_path && (
          <Link
            href={buildSourceLocationUrl({
              projectId,
              filePath: source.file_path,
              startLine: source.start_line,
              endLine: source.end_line,
            })}
            className="h-6 px-2 rounded-md border border-white/[0.08] text-[10px] text-foreground hover:text-primary hover:border-primary/25 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>Open</span>
          </Link>
        )}
        <Link
          href={`/graph?projectId=${projectId}&search=${encodeURIComponent(name)}`}
          className="h-6 px-2 rounded-md border border-white/[0.08] text-[10px] text-foreground hover:text-primary hover:border-primary/25 transition-colors flex items-center gap-1"
        >
          <Network className="w-2.5 h-2.5" />
          <span>Graph</span>
        </Link>
        {source.file_path && (
          <>
            <Link
              href={`/ast?projectId=${projectId}&file=${encodeURIComponent(
                source.file_path
              )}`}
              className="h-6 px-2 rounded-md border border-white/[0.08] text-[10px] text-foreground hover:text-primary hover:border-primary/25 transition-colors flex items-center gap-1"
            >
              <Braces className="w-2.5 h-2.5" />
              <span>AST</span>
            </Link>
            <Link
              href={`/symbols?projectId=${projectId}&file=${encodeURIComponent(
                source.file_path
              )}`}
              className="h-6 px-2 rounded-md border border-white/[0.08] text-[10px] text-foreground hover:text-primary hover:border-primary/25 transition-colors flex items-center gap-1"
            >
              <Variable className="w-2.5 h-2.5" />
              <span>Symbols</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph Context Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function GraphContext({
  details,
  projectId,
}: {
  details: GraphContextDetail[];
  projectId: number;
}) {
  const [open, setOpen] = useState(false);
  if (details.length === 0) return null;

  return (
    <div className="mt-4 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-white"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Network className="w-3.5 h-3.5 text-primary" />
        <span>Graph Context ({details.length})</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-3 rounded-xl border border-white/[0.08] bg-[#05070b]/90 p-4">
          {details.map((detail, index) => {
            const groups = [
              ["Calls", detail.calls],
              ["Called by", detail.called_by],
              ["Imports", detail.imports],
              ["Imported by", detail.imported_by],
            ] as const;

            return (
              <div
                key={`${detail.file_path}-${detail.entity_name ?? index}`}
                className="border-l-2 border-primary/50 pl-3"
              >
                <p className="font-mono text-xs font-medium text-white">
                  {detail.entity_name ?? detail.file_path}
                </p>
                {detail.entity_name && (
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {detail.file_path}
                  </p>
                )}
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {groups
                    .filter(([, values]) => values.length > 0)
                    .map(([label, values]) => (
                      <div key={label} className="text-xs">
                        <span className="font-medium text-muted-foreground">
                          {label}:
                        </span>{" "}
                        <span className="break-words font-mono text-zinc-300">
                          {values.join(", ")}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
          <Link
            href={`/graph?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Explore full project graph</span>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assistant Message
// ─────────────────────────────────────────────────────────────────────────────

function AssistantMessage({
  response,
  projectId,
}: {
  response: GraphRAGGenerationResponse;
  projectId: number;
}) {
  return (
    <article className="flex gap-3 md:gap-4 reveal" style={{ ["--d" as string]: "0ms" }}>
      {/* Bot Avatar matching Figma */}
      <span className="relative w-8 h-8 mt-0.5 rounded-lg border border-primary/25 bg-primary/[0.07] flex items-center justify-center flex-shrink-0">
        <Orbit className="w-4 h-4 text-primary" />
        <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#070910]" />
      </span>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <span className="text-[13px] font-semibold text-white">CodeGraph AI</span>
          {response.model && response.model !== "Searching…" && (
            <span className="font-mono text-[8.5px] text-violet-300 px-1.5 py-0.5 rounded border border-violet-400/20 bg-violet-400/[0.04] uppercase">
              {response.model} · {response.total_chunks}{" "}
              {response.total_chunks === 1 ? "CHUNK" : "CHUNKS"}
            </span>
          )}
        </div>

        {/* Answer body */}
        {response.answer ? (
          <div className="text-[13.5px] leading-7 text-foreground/85">
            <MarkdownContent text={response.answer} />
          </div>
        ) : (
          <div className="flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground py-2">
            <span>Analyzing codebase</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-primary cg-dot"
                  style={{ animationDelay: `${i * 140}ms` }}
                />
              ))}
            </span>
          </div>
        )}

        {/* Retrieved Sources Section */}
        {response.sources.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <span className="cg-label !text-[9px] !text-foreground/75">
                Retrieved Sources
              </span>
              <span className="font-mono text-[9px] text-primary px-1.5 py-0.5 border border-primary/20 bg-primary/[0.05] rounded">
                {response.sources.length}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {response.sources.map((source, index) => (
                <SourceCard
                  key={`${source.file_path ?? "source"}-${source.name ?? index}-${index}`}
                  source={source}
                  projectId={projectId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Graph Context */}
        <GraphContext details={response.graph_context} projectId={projectId} />
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Message matching Figma Redesign
// ─────────────────────────────────────────────────────────────────────────────

function UserMessage({ question }: { question: string }) {
  return (
    <div className="flex justify-end reveal" style={{ ["--d" as string]: "0ms" }}>
      <div className="max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-xl rounded-br-sm border border-white/[0.08] bg-white/[0.045] text-[13.5px] leading-6 text-white shadow-lg whitespace-pre-wrap break-words">
        {question}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper Helper
// ─────────────────────────────────────────────────────────────────────────────

function mapChatMessageToConversationMessage(
  m: ChatMessage,
  projectId: number
): ConversationMessage {
  if (m.role === "user") {
    return { id: `db-user-${m.id}`, role: "user", question: m.content };
  }
  return {
    id: `db-assistant-${m.id}`,
    role: "assistant",
    response: {
      query: "",
      project_id: projectId,
      answer: m.content,
      model: "Qwen / RAG",
      total_chunks: m.sources?.length ?? 0,
      sources: m.sources ?? [],
      graph_context: m.graph_context ?? [],
      context: "",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Chat Page Inner Component
// ─────────────────────────────────────────────────────────────────────────────

function ChatPageInner() {
  const {
    projects,
    activeProject,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Sidebar collapse state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Chat renaming & menu state
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [menuOpenConversationId, setMenuOpenConversationId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Project selector dropdown popover
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectRef = useRef<HTMLDivElement>(null);

  const requestId = useRef(0);
  const activeProjectIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  activeProjectIdRef.current = activeProjectId;

  // Restore sidebar preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codegraph_chat_sidebar_collapsed");
      if (saved === "true") setSidebarOpen(false);
    } catch {
      // ignore
    }
  }, []);

  // Close project dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(event.target as Node)) {
        setProjectDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // New chat handler
  const handleNewChat = useCallback(async () => {
    if (!activeProjectId || isSubmitting) return;
    try {
      const newConv = await createConversation(activeProjectId, "New Chat");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setIsMobileDrawerOpen(false);
      setMessages([]);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create new chat.");
    }
  }, [activeProjectId, isSubmitting]);

  // Keyboard shortcut Ctrl+N for new chat
  useEffect(() => {
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void handleNewChat();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [handleNewChat]);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [question]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("codegraph_chat_sidebar_collapsed", String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const startRenaming = (conv: Conversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingConversationId(conv.id);
    setEditingTitle(conv.title);
    setMenuOpenConversationId(null);
  };

  useEffect(() => {
    if (editingConversationId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingConversationId]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setMenuOpenConversationId(null);
    };
    if (menuOpenConversationId !== null) {
      window.addEventListener("click", handleDocumentClick);
      return () => window.removeEventListener("click", handleDocumentClick);
    }
  }, [menuOpenConversationId]);

  const saveRename = async (convId: number) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingConversationId(null);
      return;
    }

    const currentConv = conversations.find((c) => c.id === convId);
    if (currentConv && currentConv.title === trimmed) {
      setEditingConversationId(null);
      return;
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: trimmed } : c))
    );
    setEditingConversationId(null);

    if (activeProjectId) {
      try {
        await updateConversationTitle(convId, trimmed, activeProjectId);
      } catch (err: unknown) {
        console.error("Failed to update conversation title:", err);
      }
    }
  };

  const cancelRename = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const loadConversationMessages = useCallback(
    async (conversationId: number, projId: number) => {
      setIsLoadingMessages(true);
      try {
        const history = await getConversationMessages(conversationId, projId);
        if (activeProjectIdRef.current === projId) {
          setMessages(
            history.map((m) => mapChatMessageToConversationMessage(m, projId))
          );
        }
      } catch (err: unknown) {
        if (activeProjectIdRef.current === projId) {
          setError(err instanceof Error ? err.message : "Could not load messages.");
        }
      } finally {
        if (activeProjectIdRef.current === projId) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );

  const loadProjectConversations = useCallback(
    async (projId: number) => {
      setIsLoadingConversations(true);
      setError(null);
      try {
        const list = await getConversations(projId);
        if (activeProjectIdRef.current !== projId) return;

        setConversations(list);
        if (list.length > 0) {
          setActiveConversationId(list[0].id);
          await loadConversationMessages(list[0].id, projId);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      } catch (err: unknown) {
        if (activeProjectIdRef.current === projId) {
          setError(
            err instanceof Error ? err.message : "Could not load conversations."
          );
        }
      } finally {
        if (activeProjectIdRef.current === projId) {
          setIsLoadingConversations(false);
        }
      }
    },
    [loadConversationMessages]
  );

  useEffect(() => {
    abortControllerRef.current?.abort();
    requestId.current += 1;
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
    setIsSubmitting(false);

    if (activeProjectId) {
      void loadProjectConversations(activeProjectId);
    }
  }, [activeProjectId, loadProjectConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSubmitting]);

  const handleSelectConversation = async (convId: number) => {
    if (!activeProjectId || convId === activeConversationId || isSubmitting) return;
    setActiveConversationId(convId);
    setIsMobileDrawerOpen(false);
    setError(null);
    await loadConversationMessages(convId, activeProjectId);
  };

  const handleDeleteConversation = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeProjectId || isSubmitting) return;

    try {
      await deleteConversation(convId, activeProjectId);
      const updatedList = conversations.filter((c) => c.id !== convId);
      setConversations(updatedList);

      if (convId === activeConversationId) {
        if (updatedList.length > 0) {
          setActiveConversationId(updatedList[0].id);
          await loadConversationMessages(updatedList[0].id, activeProjectId);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete conversation.");
    }
  };

  const submitQuestion = async (
    event?: FormEvent,
    overrideQuestion?: string
  ) => {
    event?.preventDefault();
    const promptText = (overrideQuestion ?? question).trim();
    if (!activeProjectId || !promptText || isSubmitting) return;

    let currentConvId = activeConversationId;
    if (!currentConvId) {
      try {
        const created = await createConversation(activeProjectId, "New Chat");
        currentConvId = created.id;
        setActiveConversationId(created.id);
        setConversations((prev) => [created, ...prev]);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not initialize conversation."
        );
        return;
      }
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    setError(null);
    setIsSubmitting(true);
    setQuestion("");

    // 1. Save user message to database
    let userMsg: ChatMessage | null = null;
    try {
      userMsg = await addChatMessage(
        currentConvId,
        { role: "user", content: promptText },
        activeProjectId
      );
    } catch (dbErr: unknown) {
      setError(dbErr instanceof Error ? dbErr.message : "Failed to save user message.");
      setIsSubmitting(false);
      setQuestion(promptText);
      return;
    }

    const userMsgId = `db-user-${userMsg.id}`;
    const assistantMsgId = `assistant-temp-${currentRequestId}`;

    // Auto-generate title on first message
    const currentConv = conversations.find((c) => c.id === currentConvId);
    const isDefaultTitle =
      !currentConv ||
      currentConv.title === "New Chat" ||
      currentConv.title === "New Conversation";
    const isFirstQuestion = messages.length === 0;

    if (isDefaultTitle && isFirstQuestion && currentConvId) {
      const generatedTitle = generateChatTitle(promptText);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId ? { ...c, title: generatedTitle } : c
        )
      );
      if (activeProjectId) {
        void updateConversationTitle(
          currentConvId,
          generatedTitle,
          activeProjectId
        ).catch(() => {});
      }
    }

    const initialAssistantResponse: GraphRAGGenerationResponse = {
      query: promptText,
      project_id: activeProjectId,
      answer: "",
      model: "Searching…",
      total_chunks: 0,
      sources: [],
      graph_context: [],
      context: "",
    };

    setMessages((current) => [
      ...current,
      { id: userMsgId, role: "user", question: promptText },
      { id: assistantMsgId, role: "assistant", response: initialAssistantResponse },
    ]);

    let receivedTokens = false;
    let accumulatedText = "";
    let capturedSources: RAGChunkResult[] = [];
    let capturedGraphContext: GraphContextDetail[] = [];

    try {
      await askCodebaseQuestionStream(
        activeProjectId,
        promptText,
        {
          onMetadata: (metadata) => {
            if (
              requestId.current !== currentRequestId ||
              activeProjectIdRef.current !== activeProjectId
            )
              return;
            capturedSources = metadata.sources ?? [];
            capturedGraphContext = metadata.graph_context ?? [];

            setMessages((current) =>
              current.map((msg) =>
                msg.id === assistantMsgId && msg.role === "assistant"
                  ? {
                      ...msg,
                      response: {
                        ...msg.response,
                        model: metadata.model || msg.response.model,
                        total_chunks: metadata.total_chunks,
                        sources: metadata.sources,
                        graph_context: metadata.graph_context,
                      },
                    }
                  : msg
              )
            );
          },
          onToken: (token) => {
            if (
              requestId.current !== currentRequestId ||
              activeProjectIdRef.current !== activeProjectId
            )
              return;
            receivedTokens = true;
            accumulatedText += token;

            setMessages((current) =>
              current.map((msg) =>
                msg.id === assistantMsgId && msg.role === "assistant"
                  ? {
                      ...msg,
                      response: {
                        ...msg.response,
                        answer: msg.response.answer + token,
                      },
                    }
                  : msg
              )
            );
          },
          onComplete: () => {
            if (
              requestId.current !== currentRequestId ||
              activeProjectIdRef.current !== activeProjectId
            )
              return;
            if (currentConvId && accumulatedText.trim()) {
              void addChatMessage(
                currentConvId,
                {
                  role: "assistant",
                  content: accumulatedText,
                  sources: capturedSources,
                  graph_context: capturedGraphContext,
                },
                activeProjectId
              ).then(() => {
                if (activeProjectIdRef.current === activeProjectId) {
                  void getConversations(activeProjectId).then((updatedList) => {
                    setConversations(updatedList);
                  });
                }
              });
            }
          },
          onError: (streamErr) => {
            if (
              requestId.current !== currentRequestId ||
              activeProjectIdRef.current !== activeProjectId
            )
              return;
            if (!receivedTokens) {
              setMessages((current) =>
                current.filter((msg) => msg.id !== assistantMsgId)
              );
            }
            setError(streamErr.message);
          },
        },
        abortController.signal
      );
    } catch (requestError: unknown) {
      if (
        requestId.current !== currentRequestId ||
        activeProjectIdRef.current !== activeProjectId
      )
        return;
      if (abortController.signal.aborted) return;

      if (!receivedTokens) {
        setMessages((current) =>
          current.filter((msg) => msg.id !== assistantMsgId)
        );
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something unexpected happened while answering your question."
      );
    } finally {
      if (requestId.current === currentRequestId) {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion();
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Sidebar Content Component
  // ───────────────────────────────────────────────────────────────────────────

  const renderSidebarContent = (isCollapsed: boolean) => {
    return (
      <div className="flex h-full flex-col">
        {/* Header / Brand */}
        <div className="h-14 flex items-center px-3 border-b border-white/[0.06] shrink-0">
          <span className="w-8 h-8 rounded-lg border border-primary/25 bg-primary/[0.06] flex items-center justify-center flex-shrink-0">
            <Orbit className="w-4 h-4 text-primary" />
          </span>
          <span
            className={cn(
              "ml-3 font-semibold text-[14px] text-white whitespace-nowrap",
              isCollapsed ? "hidden" : "block"
            )}
          >
            CodeGraph <span className="text-primary">AI</span>
          </span>
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/[0.05] transition-colors",
              isCollapsed ? "ml-auto md:ml-0" : "ml-auto"
            )}
            aria-label="Toggle chat sidebar"
            title={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleNewChat()}
            disabled={isSubmitting}
            className={cn(
              "h-10 rounded-lg border border-primary/25 bg-primary/[0.07] text-primary hover:bg-primary/[0.11] hover:border-primary/40 transition-all flex items-center disabled:opacity-40",
              isCollapsed ? "w-9 mx-auto justify-center" : "w-full px-3 gap-2.5"
            )}
            title="New Chat (Ctrl+N)"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span
              className={cn(
                "text-[12.5px] font-medium whitespace-nowrap",
                isCollapsed ? "hidden" : "block"
              )}
            >
              New Chat
            </span>
            <kbd
              className={cn(
                "ml-auto font-mono text-[8.5px] text-muted-foreground border border-white/[0.08] rounded px-1.5 py-0.5",
                isCollapsed ? "hidden" : "hidden lg:block"
              )}
            >
              Ctrl N
            </kbd>
          </button>
        </div>

        {/* Recent Chats Section Label */}
        <div
          className={cn(
            "cg-label !text-[8.5px] px-4 pt-2.5 pb-2 shrink-0",
            isCollapsed ? "hidden" : "block"
          )}
        >
          Recent Chats
        </div>

        {/* Conversations List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 space-y-1">
          {isLoadingConversations ? (
            <div className="flex items-center gap-2 py-4 px-2 font-mono text-xs text-muted-foreground">
              <Orbit className="w-3.5 h-3.5 animate-spin text-primary" />
              {!isCollapsed && <span>Loading history…</span>}
            </div>
          ) : conversations.length === 0 ? (
            !isCollapsed && (
              <div className="py-6 px-3 text-center">
                <p className="text-xs text-muted-foreground">No recent chats</p>
                <p className="mt-1 text-[11px] text-muted-foreground/60 leading-relaxed">
                  Start a new conversation to analyze your codebase.
                </p>
              </div>
            )
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = conv.id === editingConversationId;
              const isMenuOpen = conv.id === menuOpenConversationId;

              if (isEditing && !isCollapsed) {
                return (
                  <div
                    key={conv.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded-lg border border-primary/40 bg-[#0a0d16] px-2 py-1 text-xs shadow-md"
                  >
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void saveRename(conv.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      className="min-w-0 flex-1 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary font-mono"
                      placeholder="Chat title…"
                      maxLength={255}
                    />
                    <button
                      type="button"
                      onClick={() => void saveRename(conv.id)}
                      title="Save (Enter)"
                      className="shrink-0 p-0.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      title="Cancel (Esc)"
                      className="shrink-0 p-0.5 text-muted-foreground hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={conv.id}
                  onClick={() => void handleSelectConversation(conv.id)}
                  title={isCollapsed ? conv.title : undefined}
                  className={cn(
                    "group relative h-9 rounded-md flex items-center text-left transition-colors cursor-pointer",
                    isCollapsed ? "w-9 mx-auto justify-center" : "w-full px-2.5",
                    isActive
                      ? "bg-primary/[0.08] text-white"
                      : "text-muted-foreground hover:text-white hover:bg-white/[0.025]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary shadow-[0_0_7px_#00e5ff]" />
                  )}
                  <MessageSquare
                    className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                    )}
                  />
                  <span
                    className={cn(
                      "ml-2.5 text-[12px] truncate flex-1 min-w-0 font-medium",
                      isCollapsed ? "hidden" : "block"
                    )}
                  >
                    {conv.title}
                  </span>

                  {/* Options Menu on hover */}
                  {!isCollapsed && (
                    <div className="relative shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenConversationId(isMenuOpen ? null : conv.id);
                        }}
                        title="Chat options"
                        className={cn(
                          "rounded p-1 text-muted-foreground hover:bg-white/[0.08] hover:text-white transition-all",
                          isMenuOpen ? "opacity-100 bg-white/[0.08] text-white" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full z-40 mt-1 w-28 rounded-lg border border-white/[0.1] bg-[#0c101c] p-1 shadow-2xl backdrop-blur-md cg-pop"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => startRenaming(conv, e)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-primary transition-colors"
                          >
                            <Pencil className="w-3 h-3 text-primary" />
                            <span>Rename</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              setMenuOpenConversationId(null);
                              void handleDeleteConversation(conv.id, e);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Index Status matching Figma */}
        <div
          className={cn(
            "p-3 border-t border-white/[0.05] shrink-0",
            isCollapsed ? "hidden" : "block"
          )}
        >
          <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span>RAG index ready</span>
          </div>
          <div className="mt-1 font-mono text-[8.5px] text-white/30 truncate">
            {activeProject?.name || "Codebase active"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden select-none px-3 md:px-5 lg:px-6 pt-2.5 md:pt-3 pb-3 md:pb-4 max-w-[1780px] mx-auto">
      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs font-mono text-muted-foreground">
          <Orbit className="w-4 h-4 animate-spin text-primary" />
          <span>Loading project context…</span>
        </div>
      ) : errorLoadingProjects ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.05] p-6 text-center">
          <p className="font-medium text-white">Failed to load projects</p>
          <p className="mt-1 text-xs text-rose-300 font-mono">
            {errorLoadingProjects}
          </p>
        </div>
      ) : !activeProjectId ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center font-mono">
          <div className="max-w-md p-6 rounded-2xl border border-white/[0.08] bg-[#080b12]/90">
            <p className="text-base font-semibold text-white">
              No Project Selected
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Select an active project from the dropdown above to start chatting with your codebase.
            </p>
          </div>
        </div>
      ) : (
        /* ── Main Chat Workspace Card matching Figma ── */
        <section className="relative flex-1 min-h-0 w-full rounded-xl md:rounded-2xl border border-white/[0.07] overflow-hidden bg-[#070910]/88 backdrop-blur-xl shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)] reveal flex">
          {/* Subtle Top Hairline Highlight */}
          <div className="absolute inset-x-0 top-0 h-px cg-hairline z-30 pointer-events-none" />

          {/* ── Left Sidebar (Desktop) ── */}
          <aside
            className={cn(
              "relative flex-shrink-0 h-full border-r border-white/[0.06] bg-gradient-to-b from-[#0b0e18]/95 to-[#080a12]/95 transition-[width] duration-300 overflow-hidden hidden md:block",
              sidebarOpen ? "w-60 lg:w-68" : "w-14"
            )}
          >
            {renderSidebarContent(!sidebarOpen)}
          </aside>

          {/* ── Mobile Sidebar Drawer & Overlay ── */}
          {isMobileDrawerOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <aside className="relative z-10 flex w-72 flex-col border-r border-white/[0.08] bg-[#0a0d16] p-2 shadow-2xl">
                {renderSidebarContent(false)}
              </aside>
            </div>
          )}

          {/* ── Main Conversation Workspace ── */}
          <div className="min-w-0 flex-1 flex flex-col bg-[#05070b]/70 overflow-hidden">
            {/* Header Toolbar */}
            <header className="relative z-20 h-13 md:h-14 flex items-center px-3 md:px-5 border-b border-white/[0.06] bg-[#080a12]/80 shrink-0">
              {/* Mobile Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="md:hidden mr-2.5 w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/[0.05]"
                aria-label="Open chat sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Title & Active Project Breadcrumb */}
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="cg-label !text-foreground/80 hidden sm:inline">
                  CodeGraph AI
                </span>
                <span className="text-white/20 hidden sm:inline">/</span>
                <span className="font-mono text-[11.5px] text-white truncate">
                  {activeProject?.name || "Codebase"}
                </span>
              </div>

              {/* Active Project Context Selector on Right */}
              <div className="relative ml-auto shrink-0 z-50" ref={projectRef}>
                <div className="hidden lg:block cg-label !text-[8px] mb-1">
                  Active Project Context
                </div>
                <button
                  type="button"
                  onClick={() => setProjectDropdownOpen((open) => !open)}
                  className={cn(
                    "flex items-center gap-2 justify-between w-40 md:w-56 h-8 px-2.5 rounded-md border bg-white/[0.02] transition-all text-[11px]",
                    projectDropdownOpen
                      ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_20px_-6px_rgba(0,229,255,0.35)]"
                      : "border-white/[0.08] hover:border-white/20"
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00e5ff]" />
                    <span className="text-white truncate font-medium">
                      {activeProject?.name ?? "Select Project"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                      #{activeProjectId ?? "—"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 text-muted-foreground transition-transform",
                      projectDropdownOpen && "rotate-180 text-primary"
                    )}
                  />
                </button>

                {projectDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 max-h-72 overflow-y-auto p-1.5 rounded-xl border border-cyan-300/20 bg-[#0a0d16] backdrop-blur-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.95)] z-[100] cg-pop">
                    <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9px]">
                      Switch project
                    </div>
                    {projects.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          selectProject(option.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={cn(
                          "relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                          option.id === activeProjectId
                            ? "bg-primary/[0.08]"
                            : "hover:bg-white/[0.04]"
                        )}
                      >
                        {option.id === activeProjectId && (
                          <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] text-white truncate font-medium">
                            {option.name}{" "}
                            <span className="font-mono text-[10px] text-muted-foreground font-normal">
                              (#{option.id})
                            </span>
                          </span>
                          {option.github_url && (
                            <span className="block font-mono text-[9px] text-muted-foreground truncate">
                              {option.github_url}
                            </span>
                          )}
                        </span>
                        {option.id === activeProjectId && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {/* Scrollable Conversation Stream */}
            <div
              ref={scrollRef}
              role="region"
              aria-label="Conversation stream"
              className="relative flex-1 min-h-0 overflow-y-auto chat-surface"
            >
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
                  <Orbit className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading conversation…</span>
                </div>
              ) : messages.length === 0 && !isSubmitting ? (
                /* Empty Chat Greeting matching Figma */
                <div className="h-full min-h-[460px] flex items-center justify-center px-4 py-8">
                  <div className="relative text-center max-w-xl">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-48 h-32 rounded-full bg-cyan-500/[0.055] blur-[55px]" />
                    <span className="relative mx-auto w-14 h-14 rounded-2xl border border-primary/25 bg-[#090d15] flex items-center justify-center shadow-[0_0_38px_-12px_rgba(0,229,255,0.5)]">
                      <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.5} />
                    </span>
                    <h1 className="relative mt-5 text-2xl md:text-[28px] font-semibold tracking-[-0.025em] text-white">
                      Understand your codebase
                    </h1>
                    <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed">
                      Ask questions about dependencies, functions, architecture, or code quality.
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {[
                        [
                          "Analyze dependencies",
                          GitBranch,
                          "Analyze dependencies across this project",
                        ],
                        [
                          "Explain this project",
                          Code2,
                          "Explain the architecture and purpose of this project",
                        ],
                        [
                          "Find dead code",
                          Braces,
                          "Find unused functions, classes, or dead code in this repository",
                        ],
                        [
                          "Show architecture",
                          Network,
                          "Show the high-level architecture and components of this codebase",
                        ],
                      ].map(([label, Icon, promptText]) => (
                        <button
                          key={label as string}
                          type="button"
                          onClick={() => void submitQuestion(undefined, promptText as string)}
                          className="h-9 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[11.5px] text-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/[0.04] transition-all flex items-center gap-2 cursor-pointer"
                        >
                          {React.createElement(Icon as React.ElementType, {
                            className: "w-3.5 h-3.5 text-primary/80",
                          })}
                          <span>{label as string}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Conversation Stream */
                <div className="max-w-[920px] mx-auto px-4 md:px-8 py-8 space-y-7">
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <UserMessage key={message.id} question={message.question} />
                    ) : (
                      <AssistantMessage
                        key={message.id}
                        response={message.response}
                        projectId={activeProjectId}
                      />
                    )
                  )}

                  {/* Thinking animation state */}
                  {isSubmitting && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-4 cg-pop">
                      <span className="w-8 h-8 rounded-lg border border-primary/25 bg-primary/[0.07] flex items-center justify-center shrink-0">
                        <Orbit className="w-4 h-4 text-primary" />
                      </span>
                      <div>
                        <div className="text-[13px] font-semibold text-white">
                          CodeGraph AI
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
                          <span>Analyzing codebase</span>
                          <span className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-1 h-1 rounded-full bg-primary cg-dot"
                                style={{ animationDelay: `${i * 140}ms` }}
                              />
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="px-4 md:px-6 py-2 shrink-0">
                <div className="max-w-[920px] mx-auto flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-100">
                        Unable to generate a response
                      </p>
                      <p className="mt-0.5 text-rose-200/80">{error}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastUser = [...messages]
                        .reverse()
                        .find((m) => m.role === "user");
                      if (lastUser && lastUser.role === "user") {
                        void submitQuestion(undefined, lastUser.question);
                      }
                    }}
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-400/30 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 transition-colors font-mono text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Chat Input Composer matching Figma ── */}
            <div className="relative z-20 px-3 md:px-6 pt-2.5 pb-3 md:pb-4 border-t border-white/[0.05] bg-[#070910]/92 backdrop-blur-xl shrink-0">
              <form
                onSubmit={(event) => void submitQuestion(event)}
                className="max-w-[920px] mx-auto"
              >
                <div className="group flex items-end gap-2 rounded-xl border border-white/[0.1] bg-[#0a0d15] p-2 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.05),0_0_28px_-12px_rgba(0,229,255,0.5)] transition-all">
                  <textarea
                    ref={textareaRef}
                    id="codebase-chat-input"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={1}
                    placeholder="Ask about your codebase..."
                    className="flex-1 max-h-32 resize-none bg-transparent outline-none px-2 py-2 text-[13.5px] leading-5 text-white placeholder:text-muted-foreground/60 disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={!question.trim() || isSubmitting}
                    aria-label="Send message"
                    className="w-9 h-9 rounded-lg bg-[#00c4dc] text-[#05070f] flex items-center justify-center hover:bg-[#00d4ec] hover:shadow-[0_0_18px_-6px_rgba(0,229,255,0.5)] disabled:opacity-30 disabled:shadow-none active:scale-[0.97] transition-all shrink-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <Orbit className="w-4 h-4 animate-spin text-[#05070f]" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between px-1 font-mono text-[8.5px] text-white/30">
                  <span>Enter to send · Shift + Enter for new line</span>
                  <span className="hidden sm:inline">
                    Grounded in {activeProject?.name || "active project"}
                  </span>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Orbit className="w-4 h-4 animate-spin text-primary" />
          <span>Loading chat workspace…</span>
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
