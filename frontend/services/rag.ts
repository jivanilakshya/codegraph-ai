import type {
  GraphContextDetail,
  GraphRAGGenerationResponse,
  RAGAskRequest,
  RAGChunkResult,
  RAGStreamCallbacks,
} from "@/types/rag";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

type ApiErrorResponse = { detail?: string };

function isGraphRagGenerationResponse(value: unknown): value is GraphRAGGenerationResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return typeof response.query === "string"
    && (typeof response.project_id === "number" || response.project_id === null)
    && typeof response.answer === "string"
    && typeof response.model === "string"
    && typeof response.total_chunks === "number"
    && Array.isArray(response.sources)
    && Array.isArray(response.graph_context)
    && typeof response.context === "string";
}

export async function askCodebaseQuestion(projectId: number, question: string): Promise<GraphRAGGenerationResponse> {
  const payload: RAGAskRequest = { project_id: projectId, question };
  const response = await fetch(`${apiBaseUrl}/api/v1/rag/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not answer that question. Please try again.");
  }

  const payloadResponse: unknown = await response.json().catch(() => null);
  if (!isGraphRagGenerationResponse(payloadResponse)) {
    throw new Error("The server returned an unexpected answer format. Please try again.");
  }

  return payloadResponse;
}

function processSseChunk(chunkText: string, callbacks: RAGStreamCallbacks) {
  const lines = chunkText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) continue;

    try {
      const eventData = JSON.parse(jsonStr) as {
        type: string;
        content?: string;
        message?: string;
        query?: string;
        project_id?: number | null;
        model?: string;
        total_chunks?: number;
        sources?: RAGChunkResult[];
        graph_context?: GraphContextDetail[];
      };

      if (eventData.type === "metadata") {
        callbacks.onMetadata?.({
          query: eventData.query ?? "",
          project_id: eventData.project_id ?? null,
          model: eventData.model ?? "",
          total_chunks: eventData.total_chunks ?? 0,
          sources: eventData.sources ?? [],
          graph_context: eventData.graph_context ?? [],
        });
      } else if (eventData.type === "token" && typeof eventData.content === "string") {
        callbacks.onToken?.(eventData.content);
      } else if (eventData.type === "done") {
        callbacks.onComplete?.();
      } else if (eventData.type === "error" && eventData.message) {
        callbacks.onError?.(new Error(eventData.message));
      }
    } catch {
      // Ignore malformed SSE JSON lines
    }
  }
}

export async function askCodebaseQuestionStream(
  projectId: number,
  question: string,
  callbacks: RAGStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const payload: RAGAskRequest = { project_id: projectId, question };
  const response = await fetch(`${apiBaseUrl}/api/v1/rag/ask-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(errorPayload?.detail ?? "Could not answer that question. Please try again.");
  }

  if (!response.body) {
    throw new Error("Response body is missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        processSseChunk(part, callbacks);
      }
    }

    if (buffer.trim()) {
      processSseChunk(buffer, callbacks);
    }

    callbacks.onComplete?.();
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
      return;
    }
    const error = err instanceof Error ? err : new Error("An unexpected error occurred during streaming.");
    callbacks.onError?.(error);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

