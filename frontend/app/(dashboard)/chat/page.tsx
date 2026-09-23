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
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { useActiveProject } from "@/hooks/useActiveProject";
import {
  addChatMessage,
  createConversation,
  deleteConversation,
  getConversationMessages,
  getConversations,
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
// Markdown & Typography Renderer
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
        <strong key={key++} className="font-semibold text-slate-100">
          {m[2]}
        </strong>
      );
    else if (m[3] !== undefined)
      parts.push(
        <em key={key++} className="italic text-slate-300">
          {m[3]}
        </em>
      );
    else if (m[4] !== undefined)
      parts.push(
        <code
          key={key++}
          className="rounded bg-slate-800/90 border border-slate-700/60 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300"
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
          className="text-cyan-400 underline decoration-cyan-400/40 hover:text-cyan-300 hover:decoration-cyan-300"
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
    <div className="my-5 min-w-0 overflow-hidden rounded-lg border border-slate-700/80 bg-[#090f19]">
      <div className="flex items-center justify-between border-b border-slate-700/60 bg-slate-900/90 px-4 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-medium text-slate-300">{lang || "code"}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
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
      <pre className="overflow-x-auto p-4 text-[13.5px] sm:text-sm leading-relaxed">
        <code className="font-mono text-slate-200 [overflow-wrap:normal] [word-break:normal]">
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
        <ol key={k++} className="my-3.5 list-decimal space-y-2 pl-6 text-[15px] sm:text-base leading-relaxed text-slate-200">
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
        <ul key={k++} className="my-3.5 list-disc space-y-2 pl-6 text-[15px] sm:text-base leading-relaxed text-slate-200">
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
          ? "mt-7 mb-3 text-xl font-bold text-slate-100 tracking-tight"
          : lvl === 2
            ? "mt-6 mb-2.5 text-lg font-semibold text-cyan-100 tracking-tight pb-1 border-b border-slate-800/60"
            : "mt-5 mb-2 text-base font-semibold text-slate-200 uppercase tracking-wide";
      result.push(
        <p key={k++} className={cls}>
          {renderInline(content)}
        </p>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      result.push(<hr key={k++} className="my-6 border-slate-800" />);
      continue;
    }

    // Regular paragraph
    const lines = trimmed.split("\n");
    result.push(
      <p key={k++} className="my-3 text-[15px] sm:text-base leading-[1.75] text-slate-200 [overflow-wrap:anywhere]">
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
// Source Card (compact & secondary)
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
    <article className="group flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 transition-colors hover:border-cyan-500/40 hover:bg-slate-900">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileCode2 className="size-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <span className="min-w-0 truncate font-mono text-xs font-semibold text-slate-200">
            {sourceLabel(source)}
          </span>
          {source.entity_type && (
            <span className="ml-auto shrink-0 rounded bg-emerald-950/60 border border-emerald-700/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300">
              {source.entity_type}
            </span>
          )}
        </div>
        {source.file_path && (
          <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={source.file_path}>
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
// Graph Context (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

function GraphContext({ details, projectId }: { details: GraphContextDetail[]; projectId: number }) {
  const [open, setOpen] = useState(false);
  if (details.length === 0) return null;
  return (
    <div className="mt-4 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/40 px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <GitGraph className="size-3.5 text-cyan-400" />
        <span>Graph Context ({details.length})</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
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
                className="border-l-2 border-cyan-400/30 pl-3"
              >
                <p className="font-mono text-xs font-medium text-slate-200">
                  {detail.entity_name ?? detail.file_path}
                </p>
                {detail.entity_name && (
                  <p className="truncate font-mono text-[11px] text-slate-500">{detail.file_path}</p>
                )}
                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {groups
                    .filter(([, values]) => values.length > 0)
                    .map(([label, values]) => (
                      <div key={label} className="text-xs">
                        <span className="font-medium text-slate-400">{label}:</span>{" "}
                        <span className="break-words font-mono text-slate-300">{values.join(", ")}</span>
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
// Assistant Message — ChatGPT open document layout
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
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-sm">
        <Bot className="size-4" />
      </div>

      {/* Answer content */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-800/40 pb-2">
          <span className="text-sm font-semibold text-slate-100">CodeGraph AI</span>
          {response.model && response.model !== "Searching…" && (
            <span className="rounded bg-slate-800/60 border border-slate-700/50 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {response.model} · {response.total_chunks}{" "}
              {response.total_chunks === 1 ? "chunk" : "chunks"}
            </span>
          )}
        </div>

        {/* Answer body */}
        {response.answer ? (
          <div className="min-w-0 text-slate-200">
            <MarkdownContent text={response.answer} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 py-3 text-sm text-slate-400">
            <LoaderCircle className="size-4 animate-spin text-cyan-400" />
            <span>Analyzing codebase and graph relationships…</span>
          </div>
        )}

        {/* Sources */}
        {response.sources.length > 0 && (
          <div className="mt-6 min-w-0 border-t border-slate-800/60 pt-4">
            <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
              Retrieved Sources ({response.sources.length})
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
// User Message — ChatGPT right-aligned bubble
// ─────────────────────────────────────────────────────────────────────────────

function UserMessage({ question }: { question: string }) {
  return (
    <article className="flex w-full min-w-0 shrink-0 justify-end gap-3 py-1">
      <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl rounded-tr-sm bg-cyan-950/40 border border-cyan-500/25 px-4 py-3 text-[15px] sm:text-[15.5px] leading-relaxed text-slate-100 shadow-sm shadow-cyan-950/20">
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {question}
        </p>
      </div>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
        <User className="size-4" />
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

  const requestId = useRef(0);
  const activeProjectIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  activeProjectIdRef.current = activeProjectId;

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
    setError(null);
    await loadConversationMessages(convId, activeProjectId);
  };

  const handleNewChat = async () => {
    if (!activeProjectId || isSubmitting) return;
    try {
      const newConv = await createConversation(activeProjectId, "New Chat");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
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
  // JSX Render — ChatGPT-style conversation interface
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden bg-[#060a12]">
      {isLoadingProjects ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-400">
          <LoaderCircle className="size-5 animate-spin text-cyan-400" />
          Loading project context…
        </div>
      ) : errorLoadingProjects ? (
        <div className="m-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <p className="font-semibold">Could not load projects</p>
          <p className="mt-1 text-slate-400">{errorLoadingProjects}</p>
        </div>
      ) : !activeProjectId ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-400/20">
            <MessageSquare className="size-7 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-200">Choose a project to start chatting</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
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
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-400/20"
          >
            <Sparkles className="size-4" />
            Go to projects
          </Link>
        </section>
      ) : (
        /* ── ChatGPT Interface: Left History Pane + Main Conversation ── */
        <div className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden">

          {/* ── Left Sidebar (ChatGPT-style conversation history) ── */}
          <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-slate-800/60 bg-[#080d17] p-3">
            {/* New Chat Button */}
            <button
              type="button"
              onClick={() => void handleNewChat()}
              disabled={isSubmitting}
              className="flex items-center justify-between gap-2 w-full rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-200 px-3.5 py-2.5 text-xs font-medium border border-slate-700/50 transition-colors shadow-sm disabled:opacity-40"
            >
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-cyan-400" />
                <span>New chat</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Ctrl+N</span>
            </button>

            {/* Conversation History List */}
            <div className="mt-3 flex-1 min-h-0 flex flex-col">
              <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Recent chats
              </div>

              {isLoadingConversations ? (
                <div className="flex items-center gap-2 py-4 px-2 text-xs text-slate-500">
                  <LoaderCircle className="size-3.5 animate-spin text-cyan-400" />
                  Loading history…
                </div>
              ) : conversations.length === 0 ? (
                <p className="py-4 px-2 text-xs text-slate-600">No conversations yet.</p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
                  {conversations.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => void handleSelectConversation(conv.id)}
                        className={`group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                          isActive
                            ? "bg-slate-800/90 text-cyan-200 font-medium"
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate leading-snug">{conv.title}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(conv.updated_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => void handleDeleteConversation(conv.id, e)}
                          title="Delete conversation"
                          className="shrink-0 rounded p-1 text-slate-500 opacity-0 transition-all hover:text-rose-400 group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Conversation Area (ChatGPT Layout) ── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#060a12] overflow-hidden">

            {/* Top Navigation Bar: Minimalist & Clean */}
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800/50 bg-[#060a12]/80 px-4 sm:px-6 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  CodeGraph AI
                </span>
                <span className="text-slate-700">/</span>
                <span className="truncate text-xs font-medium text-slate-200">
                  {activeProject?.name ?? `Project #${activeProjectId}`}
                </span>
              </div>
              <div className="w-48 sm:w-64 lg:w-72 [&>label]:py-1 [&>label]:px-2.5 [&>label]:text-xs [&>label]:rounded-lg [&>label]:border-slate-800 [&>label]:bg-slate-900/60">
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={activeProjectId}
                  onSelect={selectProject}
                />
              </div>
            </header>

            {/* Messages Stream (THE PRIMARY AND ONLY VERTICAL SCROLLBAR) */}
            <div
              role="region"
              aria-label="Conversation timeline"
              aria-live="polite"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              {isLoadingMessages ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
                  <LoaderCircle className="size-5 animate-spin text-cyan-400" />
                  Loading conversation…
                </div>
              ) : messages.length === 0 && !isSubmitting ? (
                /* Empty state — ChatGPT Style centered greeting & prompt chips */
                <div className="my-auto flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 mb-4 shadow-sm">
                    <Bot className="size-6" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                    Ask anything about this codebase.
                  </h2>
                  <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Ask architecture questions, trace request flows, find functions, or inspect module dependencies.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
                    {[
                      "Explain the complete flow when a user sends a message",
                      "Where are database operations performed?",
                      "Which files import from the rag module?",
                      "How is project selection and routing structured?",
                    ].map((hint) => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => setQuestion(hint)}
                        className="rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 hover:border-cyan-500/40 hover:text-cyan-200 px-3.5 py-2 text-xs text-slate-300 transition-all text-left"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Active Message Stream: Centered Content Area with 850-950px max-width */
                <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 sm:px-6 py-6">
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
              <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6 mb-2">
                <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Could not answer question</p>
                    <p className="mt-0.5 text-rose-200/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── ChatGPT Bottom Composer ── */}
            <div className="shrink-0 bg-gradient-to-t from-[#060a12] via-[#060a12] to-transparent px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
              <form
                onSubmit={(event) => void submitQuestion(event)}
                className="mx-auto w-full max-w-[900px]"
              >
                <div className="relative flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl transition-all focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-cyan-500/20 p-2.5 sm:p-3">
                  <label htmlFor="codebase-question" className="sr-only">
                    Ask a question about the active codebase
                  </label>
                  <textarea
                    id="codebase-question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder={`Ask about ${activeProject?.name ?? "this codebase"}…`}
                    className="block w-full resize-none bg-transparent px-2 text-[15px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-36"
                  />
                  <div className="mt-2 flex items-center justify-between border-t border-slate-800/50 pt-2 px-1">
                    <span className="text-[11px] text-slate-500 select-none hidden sm:inline">
                      <kbd className="font-mono text-slate-400">Enter</kbd> to send ·{" "}
                      <kbd className="font-mono text-slate-400">Shift + Enter</kbd> for new line
                    </span>
                    <span className="text-[11px] text-slate-500 select-none sm:hidden">
                      Ask CodeGraph AI
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting || !question.trim()}
                      className="size-8 rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 shadow-md"
                      title="Send message"
                    >
                      {isSubmitting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


