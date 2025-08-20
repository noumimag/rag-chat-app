export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'mdx' | 'json' | 'text' | 'code';
  source: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  embedding?: number[];
  createdAt: Date;
}

export interface Vector {
  chunkId: string;
  documentId: string;
  embedding: number[];
  createdAt: Date;
}

export interface SearchResult {
  chunk: Chunk;
  document: Document;
  score: number;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  citations: Citation[];
  metadata?: Record<string, any>;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
}

export interface IngestResult {
  documentId: string;
  chunksCreated: number;
  vectorsCreated: number;
  processingTime: number;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: Record<string, any>;
}

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}
