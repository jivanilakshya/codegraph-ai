export interface RAGAskRequest {
  project_id: number;
  question: string;
}

export interface RAGChunkResult {
  score: number;
  file_path: string | null;
  start_line: number | null;
  end_line: number | null;
  start_byte: number | null;
  end_byte: number | null;
  language: string | null;
  entity_type: string | null;
  name: string | null;
  entity_name: string | null;
  project_id: number | null;
  content: string;
  metadata: Record<string, unknown>;
}

export interface GraphContextDetail {
  file_path: string;
  entity_name: string | null;
  entity_type: string | null;
  calls: string[];
  called_by: string[];
  imports: string[];
  imported_by: string[];
}

export interface GraphRAGGenerationResponse {
  query: string;
  project_id: number | null;
  answer: string;
  model: string;
  total_chunks: number;
  sources: RAGChunkResult[];
  graph_context: GraphContextDetail[];
  context: string;
}

export interface RAGStreamMetadata {
  query: string;
  project_id: number | null;
  model: string;
  total_chunks: number;
  sources: RAGChunkResult[];
  graph_context: GraphContextDetail[];
}

export interface RAGStreamCallbacks {
  onMetadata?: (metadata: RAGStreamMetadata) => void;
  onToken?: (token: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface Conversation {
  id: number;
  project_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  sources?: RAGChunkResult[] | null;
  graph_context?: GraphContextDetail[] | null;
  created_at: string;
}


