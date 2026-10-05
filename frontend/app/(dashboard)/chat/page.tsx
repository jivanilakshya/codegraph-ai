"use client";

import Link from "next/link";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  GitGraph,
  LoaderCircle,
  Menu,
  MessageSquare,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { useActiveProject } from "@/hooks/useActiveProject";
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
import { buildSourceLocationUrl } from "@/lib/navigation";
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
// Markdown & Typography Renderer (Neutral Dark Charcoal Palette)
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
        <strong key={key++} className="font-semibold text-zinc-100">
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
          className="rounded bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300"
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
          className="text-cyan-400 underline decoration-cyan-400/30 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-300 transition-colors"
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
    <div className="my-4 min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-[#141414] shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-[#1c1c1c] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-zinc-300">{lang || "code"}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] sm:text-[13.5px] leading-relaxed">
        <code className="font-mono text-zinc-200 [overflow-wrap:normal] [word-break:normal]">
          {code}
        </code>
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
        <ol key={k++} className="my-3 list-decimal space-y-1.5 pl-6 text-[14.5px] sm:text-[15px] leading-relaxed text-zinc-200">
          {items.map((item, i) => (
            <li key={i}>
              {renderInline(item.replace(/^\d+\.\s*/, ""))}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list
    if (/^[-*•] /m.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(Boolean);
      result.push(
        <ul key={k++} className="my-3 list-disc space-y-1.5 pl-6 text-[14.5px] sm:text-[15px] leading-relaxed text-zinc-200">
          {items.map((item, i) => (
            <li key={i}>
              {renderInline(item.replace(/^[-*•]\s*/, ""))}
            </li>
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
          ? "mt-6 mb-2.5 text-lg font-bold text-zinc-100 tracking-tight"
          : lvl === 2
            ? "mt-5 mb-2 text-base font-semibold text-zinc-100 tracking-tight pb-1 border-b border-zinc-800"
            : "mt-4 mb-1.5 text-sm font-semibold text-zinc-200 uppercase tracking-wide";
      result.push(
        <p key={k++} className={cls}>
          {renderInline(content)}
        </p>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      result.push(<hr key={k++} className="my-5 border-zinc-800" />);
      continue;
    }

    // Regular paragraph
    const lines = trimmed.split("\n");
    result.push(
      <p key={k++} className="my-2.5 text-[14.5px] sm:text-[15px] leading-[1.75] text-zinc-200 [overflow-wrap:anywhere]">
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
    blocks.push(<CodeBlock key={`cb-${bk}`} lang={fm[1] || "code"} code={fm[2].trimEnd()} />);
    bk++;
    cursor = fm.index + fm[0].length;
  }
  const remaining = text.slice(cursor);
  if (remaining.trim()) blocks.push(...renderTextBlocks(remaining, bk));

  return <>{blocks}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Source Card (compact & neutral)
// ─────────────────────────────────────────────────────────────────────────────

function sourceLabel(source: RAGChunkResult) {
  return source.entity_name ?? source.name ?? source.entity_type ?? "Code source";
}

function SourceCard({ source, projectId }: { source: RAGChunkResult; projectId: number }) {
  const lines =
    source.start_line === null
      ? null
      : source.end_line === null || source.end_line === source.start_line
        ? `Line ${source.start_line}`
        : `Lines ${source.start_line}–${source.end_line}`;

  return (
    <article className="group flex min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 transition-all hover:border-zinc-700 hover:bg-zinc-900">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileCode2 className="size-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <span className="min-w-0 truncate font-mono text-xs font-semibold text-zinc-200">
            {sourceLabel(source)}
          </span>
          {source.entity_type && (
            <span className="ml-auto shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              {source.entity_type}
            </span>
          )}
        </div>
        {source.file_path && (
          <p className="mt-1 truncate font-mono text-[11px] text-zinc-400" title={source.file_path}>
            {source.file_path}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
        {lines && <span className="font-mono text-[11px] text-emerald-400/90">{lines}</span>}
        <Link
          href={buildSourceLocationUrl({
            projectId,
            filePath: source.file_path,
            startLine: source.start_line,
            endLine: source.end_line,
          })}
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          <ExternalLink className="size-3" />
          Open
        </Link>
        <Link
          href={`/graph?projectId=${projectId}`}
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
        >
          <GitGraph className="size-3" />
          Graph
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Graph Context (collapsible & minimal)
// ─────────────────────────────────────────────────────────────────────────────

function GraphContext({ details, projectId }: { details: GraphContextDetail[]; projectId: number }) {
  const [open, setOpen] = useState(false);
  if (details.length === 0) return null;
  return (
    <div className="mt-4 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <GitGraph className="size-3.5 text-cyan-400" />
        <span>Graph Context ({details.length})</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-3 rounded-xl border border-zinc-800 bg-[#171717] p-4">
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
                className="border-l-2 border-cyan-400/40 pl-3"
              >
                <p className="font-mono text-xs font-medium text-zinc-200">
                  {detail.entity_name ?? detail.file_path}
                </p>
                {detail.entity_name && (
                  <p className="truncate font-mono text-[11px] text-zinc-500">{detail.file_path}</p>
                )}
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {groups
                    .filter(([, values]) => values.length > 0)
                    .map(([label, values]) => (
                      <div key={label} className="text-xs">
                        <span className="font-medium text-zinc-400">{label}:</span>{" "}
                        <span className="break-words font-mono text-zinc-300">{values.join(", ")}</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
          <Link
            href={`/graph?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            <GitGraph className="size-3.5" />
            Explore full project graph
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assistant Message — Document layout (Open on black background)
// ─────────────────────────────────────────────────────────────────────────────

function AssistantMessage({
  response,
  projectId,
}: {
  response: GraphRAGGenerationResponse;
  projectId: number;
}) {
  return (
    <article className="flex w-full min-w-0 shrink-0 gap-3.5 py-1">
      {/* Bot Avatar */}
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-800 text-cyan-400 shadow-sm">
        <Bot className="size-3.5" />
      </div>

      {/* Answer content */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-zinc-800/60 pb-1.5">
          <span className="text-xs font-semibold text-zinc-200">CodeGraph AI</span>
          {response.model && response.model !== "Searching…" && (
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
              {response.model} · {response.total_chunks}{" "}
              {response.total_chunks === 1 ? "chunk" : "chunks"}
            </span>
          )}
        </div>

        {/* Answer body */}
        {response.answer ? (
          <div className="min-w-0 text-zinc-200">
            <MarkdownContent text={response.answer} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 py-3 text-xs text-zinc-400">
            <LoaderCircle className="size-3.5 animate-spin text-cyan-400" />
            <span>Analyzing codebase and graph relationships…</span>
          </div>
        )}

        {/* Sources */}
        {response.sources.length > 0 && (
          <div className="mt-5 min-w-0 border-t border-zinc-800/80 pt-3.5">
            <p className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Retrieved Sources ({response.sources.length})
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Graph context */}
        <GraphContext details={response.graph_context} projectId={projectId} />
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Message — ChatGPT-style Compact Charcoal Bubble
// ─────────────────────────────────────────────────────────────────────────────

function UserMessage({ question }: { question: string }) {
  return (
    <article className="flex w-full min-w-0 shrink-0 justify-end gap-3 py-1">
      <div className="max-w-[85%] sm:max-w-[75%] rounded-[20px] rounded-br-sm bg-[#2f2f2f] px-4 py-2.5 text-[14.5px] leading-relaxed text-zinc-100 shadow-sm">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {question}
        </p>
      </div>
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-sm border border-zinc-700/60">
        <User className="size-3.5" />
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper — unchanged logic
// ─────────────────────────────────────────────────────────────────────────────

function mapChatMessageToConversationMessage(m: ChatMessage, projectId: number): ConversationMessage {
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
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatPage() {
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Chat renaming state
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [menuOpenConversationId, setMenuOpenConversationId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const requestId = useRef(0);
  const activeProjectIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  activeProjectIdRef.current = activeProjectId;

  // Restore sidebar preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codegraph_chat_sidebar_collapsed");
      if (saved === "true") setIsSidebarCollapsed(true);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  // Auto resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [question]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("codegraph_chat_sidebar_collapsed", String(next));
      } catch {
        // ignore localStorage errors
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

    // Optimistic update
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
          setMessages(history.map((m) => mapChatMessageToConversationMessage(m, projId)));
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
          const newConv = await createConversation(projId, "New Chat");
          if (activeProjectIdRef.current === projId) {
            setConversations([newConv]);
            setActiveConversationId(newConv.id);
            setMessages([]);
          }
        }
      } catch (err: unknown) {
        if (activeProjectIdRef.current === projId) {
          setError(err instanceof Error ? err.message : "Could not load conversations.");
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectConversation = async (convId: number) => {
    if (!activeProjectId || convId === activeConversationId || isSubmitting) return;
    setActiveConversationId(convId);
    setIsMobileDrawerOpen(false);
    setError(null);
    await loadConversationMessages(convId, activeProjectId);
  };

  const handleNewChat = async () => {
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
          const newConv = await createConversation(activeProjectId, "New Chat");
          setConversations([newConv]);
          setActiveConversationId(newConv.id);
          setMessages([]);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not delete conversation.");
    }
  };

  const submitQuestion = async (event?: FormEvent) => {
    event?.preventDefault();
    const normalizedQuestion = question.trim();
    if (!activeProjectId || !normalizedQuestion || isSubmitting) return;

    let currentConvId = activeConversationId;
    if (!currentConvId) {
      try {
        const created = await createConversation(activeProjectId, "New Chat");
        currentConvId = created.id;
        setActiveConversationId(created.id);
        setConversations((prev) => [created, ...prev]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not initialize conversation.");
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

    // 1. Save user message to DB immediately
    let userMsg: ChatMessage | null = null;
    try {
      userMsg = await addChatMessage(
        currentConvId,
        { role: "user", content: normalizedQuestion },
        activeProjectId
      );
    } catch (dbErr: unknown) {
      setError(dbErr instanceof Error ? dbErr.message : "Failed to save user message.");
      setIsSubmitting(false);
      setQuestion(normalizedQuestion);
      return;
    }

    const userMsgId = `db-user-${userMsg.id}`;
    const assistantMsgId = `assistant-temp-${currentRequestId}`;

    // Auto-generate title on first user message if conversation has default title
    const currentConv = conversations.find((c) => c.id === currentConvId);
    const isDefaultTitle =
      !currentConv ||
      currentConv.title === "New Chat" ||
      currentConv.title === "New Conversation";
    const isFirstQuestion = messages.length === 0;

    if (isDefaultTitle && isFirstQuestion && currentConvId) {
      const generatedTitle = generateChatTitle(normalizedQuestion);
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConvId ? { ...c, title: generatedTitle } : c))
      );
      if (activeProjectId) {
        void updateConversationTitle(currentConvId, generatedTitle, activeProjectId).catch(() => {});
      }
    }

    const initialAssistantResponse: GraphRAGGenerationResponse = {
      query: normalizedQuestion,
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
      { id: userMsgId, role: "user", question: normalizedQuestion },
      { id: assistantMsgId, role: "assistant", response: initialAssistantResponse },
    ]);

    let receivedTokens = false;
    let accumulatedText = "";
    let capturedSources: RAGChunkResult[] = [];
    let capturedGraphContext: GraphContextDetail[] = [];

    try {
      await askCodebaseQuestionStream(
        activeProjectId,
        normalizedQuestion,
        {
          onMetadata: (metadata) => {
            if (requestId.current !== currentRequestId || activeProjectIdRef.current !== activeProjectId)
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
            if (requestId.current !== currentRequestId || activeProjectIdRef.current !== activeProjectId)
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
            if (requestId.current !== currentRequestId || activeProjectIdRef.current !== activeProjectId)
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
            if (requestId.current !== currentRequestId || activeProjectIdRef.current !== activeProjectId)
              return;
            if (!receivedTokens) {
              setMessages((current) => current.filter((msg) => msg.id !== assistantMsgId));
            }
            setError(streamErr.message);
          },
        },
        abortController.signal
      );
    } catch (requestError: unknown) {
      if (requestId.current !== currentRequestId || activeProjectIdRef.current !== activeProjectId) return;
      if (abortController.signal.aborted) return;

      if (!receivedTokens) {
        setMessages((current) => current.filter((msg) => msg.id !== assistantMsgId));
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
  // Sidebar Content Helper (ChatGPT-style compact neutral layout)
  // ───────────────────────────────────────────────────────────────────────────

  const renderSidebarContent = (isCollapsed: boolean) => {
    if (isCollapsed) {
      return (
        <div className="flex h-full flex-col items-center justify-between py-2.5">
          {/* Top section: Toggle button + New Chat */}
          <div className="flex flex-col items-center gap-2.5 w-full">
            {/* Sidebar Expand Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              title="Open sidebar"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              <PanelLeftOpen className="size-4" />
            </button>

            {/* New Chat Icon Button */}
            <button
              type="button"
              onClick={() => void handleNewChat()}
              disabled={isSubmitting}
              title="New chat"
              className="flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>

            <div className="h-px w-5 bg-zinc-800 my-0.5" />

            {/* Conversation Icons List */}
            <div className="flex flex-col items-center gap-1 overflow-y-auto max-h-[calc(100vh-220px)] w-full px-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => void handleSelectConversation(conv.id)}
                    title={conv.title}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                      isActive
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <MessageSquare className="size-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom logo */}
          <div
            title="CodeGraph AI"
            className="flex size-7 items-center justify-center rounded-md bg-zinc-800/80 border border-zinc-700/50 text-cyan-400 font-mono font-bold text-[10px]"
          >
            CG
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {/* Top Header: Branding + Toggle Button */}
        <div className="flex items-center justify-between pb-2.5 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/60 text-cyan-400 font-mono font-bold text-[11px]">
              CG
            </div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate">
              CodeGraph AI
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Close sidebar"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={() => void handleNewChat()}
          disabled={isSubmitting}
          className="flex items-center justify-between gap-2 w-full rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 px-3 py-2 text-xs font-medium border border-zinc-800 transition-all hover:border-zinc-700 disabled:opacity-40"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-cyan-400" />
            <span>New chat</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-500">Ctrl+N</span>
        </button>

        {/* Conversation History List */}
        <div className="mt-3 flex-1 min-h-0 flex flex-col">
          <div className="px-2 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
            Recent chats
          </div>

          {isLoadingConversations ? (
            <div className="flex items-center gap-2 py-4 px-2 font-mono text-xs text-zinc-500">
              <LoaderCircle className="size-3.5 animate-spin text-cyan-400" />
              Loading history…
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-4 px-2 text-xs text-zinc-500">No conversations yet.</p>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = conv.id === editingConversationId;
                const isMenuOpen = conv.id === menuOpenConversationId;

                if (isEditing) {
                  return (
                    <div
                      key={conv.id}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 rounded-lg border border-cyan-500/60 bg-zinc-800 px-2 py-1 text-xs shadow-md"
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
                        className="min-w-0 flex-1 rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-cyan-400"
                        placeholder="Chat title…"
                        maxLength={255}
                      />
                      <button
                        type="button"
                        onClick={() => void saveRename(conv.id)}
                        title="Save title (Enter)"
                        className="shrink-0 rounded p-0.5 text-emerald-400 hover:bg-zinc-700 hover:text-emerald-300 transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        title="Cancel (Esc)"
                        className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={conv.id}
                    onClick={() => void handleSelectConversation(conv.id)}
                    className={`group relative flex cursor-pointer items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      isActive
                        ? "bg-[#212121] text-white font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 pr-1">
                      <MessageSquare className="size-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
                      <span
                        className="truncate leading-snug text-zinc-200 group-hover:text-white text-xs"
                        title={conv.title}
                      >
                        {conv.title}
                      </span>
                    </div>

                    {/* Options Menu (visible on hover or when open) */}
                    <div className="relative shrink-0 flex items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenConversationId(isMenuOpen ? null : conv.id);
                        }}
                        title="Chat options"
                        className={`rounded p-1 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-zinc-200 ${
                          isMenuOpen
                            ? "opacity-100 bg-zinc-700 text-zinc-200"
                            : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                        }`}
                      >
                        <MoreVertical className="size-3" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full z-40 mt-1 w-28 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl backdrop-blur-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => startRenaming(conv, e)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-cyan-300 transition-colors"
                          >
                            <Pencil className="size-3 text-cyan-400" />
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
                            <Trash2 className="size-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // JSX Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden bg-[#0d0d0d]">
      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs font-mono text-zinc-400">
          <LoaderCircle className="size-4 animate-spin text-cyan-400" />
          Loading project context…
        </div>
      ) : errorLoadingProjects ? (
        <div className="m-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 text-xs text-rose-200">
          <p className="font-semibold text-rose-100">Could not load projects</p>
          <p className="mt-1 text-zinc-400">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center font-mono">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-400/10 border border-amber-400/20">
            <MessageSquare className="size-7 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-200">Choose a project to start chatting</h2>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
              Chat answers are always scoped to one scanned project. Select a project from the dropdown or create one first.
            </p>
          </div>
          <div className="w-72">
            <ProjectSelector
              projects={projects}
              selectedProjectId={activeProjectId}
              onSelect={selectProject}
            />
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            <Sparkles className="size-4" />
            Go to projects
          </Link>
        </section>
      ) : (
        /* ── Main Workspace: Compact Left Sidebar + Conversation Area ── */
        <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden">

          {/* ── Desktop Left Sidebar (Collapsible: Expanded w-60 vs Collapsed w-12) ── */}
          <aside
            className={`hidden md:flex shrink-0 flex-col border-r border-zinc-800/70 bg-[#171717] transition-all duration-200 ease-in-out ${
              isSidebarCollapsed ? "w-12 p-1.5" : "w-60 p-2.5"
            }`}
          >
            {renderSidebarContent(isSidebarCollapsed)}
          </aside>

          {/* ── Mobile Sidebar Drawer & Backdrop ── */}
          {isMobileDrawerOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileDrawerOpen(false)}
              />
              <aside className="relative z-10 flex w-68 flex-col border-r border-zinc-800 bg-[#171717] p-3 shadow-2xl">
                {renderSidebarContent(false)}
              </aside>
            </div>
          )}

          {/* ── Main Conversation Area ── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0d0d0d] overflow-hidden">

            {/* Top Navigation Bar: Reduced Height & Clean Neutral Border */}
            <header className="relative z-30 flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-[#0d0d0d]/90 px-3 sm:px-6 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-2.5">
                {/* Mobile drawer toggle */}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 md:hidden"
                  aria-label="Open sidebar drawer"
                >
                  <Menu className="size-4" />
                </button>

                {/* Quick Expand button when desktop sidebar is collapsed */}
                {isSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    title="Open sidebar"
                    className="hidden md:flex rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  >
                    <PanelLeft className="size-4" />
                  </button>
                )}

                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-400">
                    CODEGRAPH AI
                  </span>
                  <span className="text-zinc-700">/</span>
                  <span className="truncate text-xs font-medium text-zinc-300">
                    {activeProject?.name ?? `Project #${activeProjectId}`}
                  </span>
                </div>
              </div>

              <div className="shrink-0 max-w-[50vw]">
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={activeProjectId}
                  onSelect={selectProject}
                  className="py-1 px-2.5 text-xs rounded-lg border-zinc-800 bg-zinc-900/80"
                />
              </div>
            </header>

            {/* Messages Stream */}
            <div
              role="region"
              aria-label="Conversation timeline"
              aria-live="polite"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              {isLoadingMessages ? (
                <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-zinc-500">
                  <LoaderCircle className="size-4 animate-spin text-cyan-400" />
                  Loading conversation…
                </div>
              ) : messages.length === 0 && !isSubmitting ? (
                /* Empty state — ChatGPT-style Clean Minimal Greeting */
                <div className="my-auto flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700/60 text-cyan-400 mb-3 shadow-sm">
                    <Bot className="size-5" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
                    Understand your codebase
                  </h2>
                  <p className="mt-1.5 max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Ask questions about dependencies, functions, architecture, or code quality.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
                    {[
                      "Analyze dependencies",
                      "Explain this project",
                      "Find dead code",
                      "Show architecture",
                    ].map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => setQuestion(hint)}
                        className="rounded-full border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 hover:text-cyan-200 px-4 py-2 text-xs text-zinc-300 transition-all text-center shadow-sm cursor-pointer"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Active Message Stream: Centered readable max-width */
                <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 sm:px-6 py-6">
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
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-auto w-full max-w-[880px] px-4 sm:px-6 mb-2">
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-rose-100">Could not answer question</p>
                    <p className="mt-0.5 text-rose-200/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bottom Floating Composer (ChatGPT-style Compact Rounded Container) ── */}
            <div className="shrink-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent px-4 sm:px-6 pb-3 sm:pb-4 pt-2">
              <form
                onSubmit={(event) => void submitQuestion(event)}
                className="mx-auto w-full max-w-[880px]"
              >
                <div className="relative flex items-center gap-2 rounded-[26px] border border-zinc-700/60 bg-[#212121] shadow-xl transition-all focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-600 px-4 py-2">
                  <label htmlFor="codebase-question" className="sr-only">
                    Ask about your codebase
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="codebase-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={1}
                    placeholder="Ask about your codebase..."
                    className="block w-full resize-none bg-transparent py-1 text-[14.5px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] max-h-36"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !question.trim()}
                    className="size-8 shrink-0 rounded-full bg-zinc-100 text-zinc-950 hover:bg-white flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600 shadow-sm active:scale-95"
                    title="Send message"
                  >
                    {isSubmitting ? (
                      <LoaderCircle className="size-4 animate-spin text-zinc-600" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                  </button>
                </div>
                <div className="mt-1.5 text-center">
                  <span className="text-[11px] text-zinc-500 select-none">
                    Enter to send · Shift + Enter for new line
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
