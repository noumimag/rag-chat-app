import { pipeline, env } from '@xenova/transformers';

// Configure transformers to use ONNX runtime
env.useBrowserCache = true;
env.allowLocalModels = false;

export class EmbeddingModel {
  private static instance: EmbeddingModel;
  private model: any = null;
  private isReady = false;

  private constructor() {}

  static getInstance(): EmbeddingModel {
    if (!EmbeddingModel.instance) {
      EmbeddingModel.instance = new EmbeddingModel();
    }
    return EmbeddingModel.instance;
  }

  async initialize(): Promise<void> {
    if (this.isReady) return;

    try {
      console.log('Initializing embedding model...');

      // Use a lightweight sentence transformer model
      this.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: false,
      });

      this.isReady = true;
      console.log('Embedding model ready!');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  async encode(text: string): Promise<number[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      const result = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array and cast to number[]
      const embedding = Array.from(result.data) as number[];
      return embedding;
    } catch (error) {
      console.error('Failed to encode text:', error);
      throw error;
    }
  }

  async encodeBatch(texts: string[]): Promise<number[][]> {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      const embeddings: number[][] = [];

      // Process in batches to avoid memory issues
      const batchSize = 4;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(batch.map(text => this.encode(text)));
        embeddings.push(...batchEmbeddings);
      }

      return embeddings;
    } catch (error) {
      console.error('Failed to encode batch:', error);
      throw error;
    }
  }

  isModelReady(): boolean {
    return this.isReady;
  }

  getModelInfo(): { name: string; dimensions: number } | null {
    if (!this.isReady) return null;

    return {
      name: 'all-MiniLM-L6-v2',
      dimensions: 384, // Standard dimension for this model
    };
  }
}

// Global instance - use the singleton pattern
export const embeddingModel = EmbeddingModel.getInstance();

// Utility function for cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}
