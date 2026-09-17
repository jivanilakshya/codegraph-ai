import type {
  ChatMessage,
  Conversation,
  GraphContextDetail,
  RAGChunkResult,
} from "@/types/rag";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

type ApiErrorResponse = { detail?: string };

export async function getConversations(projectId: number): Promise<Conversation[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/projects/${projectId}/conversations`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not load conversations.");
  }

  const data = (await response.json()) as { conversations: Conversation[] };
  return data.conversations ?? [];
}

export async function createConversation(projectId: number, title?: string): Promise<Conversation> {
  const response = await fetch(`${apiBaseUrl}/api/v1/projects/${projectId}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not create conversation.");
  }

  return (await response.json()) as Conversation;
}

export async function getConversationMessages(
  conversationId: number,
  projectId?: number
): Promise<ChatMessage[]> {
  const query = projectId ? `?project_id=${projectId}` : "";
  const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}/messages${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not load conversation messages.");
  }

  const data = (await response.json()) as { messages: ChatMessage[] };
  return data.messages ?? [];
}

export async function addChatMessage(
  conversationId: number,
  message: {
    role: "user" | "assistant";
    content: string;
    sources?: RAGChunkResult[];
    graph_context?: GraphContextDetail[];
  },
  projectId?: number
): Promise<ChatMessage> {
  const query = projectId ? `?project_id=${projectId}` : "";
  const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}/messages${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not save chat message.");
  }

  return (await response.json()) as ChatMessage;
}

export async function deleteConversation(
  conversationId: number,
  projectId?: number
): Promise<void> {
  const query = projectId ? `?project_id=${projectId}` : "";
  const response = await fetch(`${apiBaseUrl}/api/v1/conversations/${conversationId}${query}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not delete conversation.");
  }
}
