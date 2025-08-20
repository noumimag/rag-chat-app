import Dexie, { Table } from 'dexie';
import { Document, Chunk, Vector } from './schema';

export class RagDatabase extends Dexie {
  documents!: Table<Document>;
  chunks!: Table<Chunk>;
  vectors!: Table<Vector>;

  constructor() {
    super('RagDatabase');

    this.version(1).stores({
      documents: 'id, title, type, source, createdAt, updatedAt',
      chunks: 'id, documentId, startIndex, endIndex, createdAt',
      vectors: 'chunkId, documentId, createdAt',
    });
  }

  // Document operations
  async addDocument(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();

    await this.documents.add({
      ...document,
      id,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return await this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return await this.documents.orderBy('updatedAt').reverse().toArray();
  }

  async deleteDocument(id: string): Promise<void> {
    // Delete related chunks and vectors first
    const chunks = await this.chunks.where('documentId').equals(id).toArray();
    const chunkIds = chunks.map(c => c.id);

    await this.vectors.where('chunkId').anyOf(chunkIds).delete();
    await this.chunks.where('documentId').equals(id).delete();
    await this.documents.delete(id);
  }

  // Chunk operations
  async addChunks(chunks: Omit<Chunk, 'createdAt'>[]): Promise<void> {
    console.log('Database: Adding', chunks.length, 'chunks');
    const chunksWithDates = chunks.map(chunk => ({
      ...chunk,
      createdAt: new Date(),
    }));

    await this.chunks.bulkAdd(chunksWithDates);
    console.log('Database: Chunks added successfully');
  }

  async getChunksByDocument(documentId: string): Promise<Chunk[]> {
    return await this.chunks.where('documentId').equals(documentId).toArray();
  }

  // Vector operations
  async addVectors(vectors: Omit<Vector, 'createdAt'>[]): Promise<void> {
    console.log('Database: Adding', vectors.length, 'vectors');
    const vectorsWithDates = vectors.map(vector => ({
      ...vector,
      createdAt: new Date(),
    }));

    await this.vectors.bulkAdd(vectorsWithDates);
    console.log('Database: Vectors added successfully');
  }

  async getVectorsByChunks(chunkIds: string[]): Promise<Vector[]> {
    return await this.vectors.where('chunkId').anyOf(chunkIds).toArray();
  }

  // Search operations
  async searchVectors(embedding: number[], limit: number = 10): Promise<Vector[]> {
    // For now, return all vectors - similarity search will be implemented in search.ts
    const vectors = await this.vectors.limit(limit).toArray();
    console.log('Database: searchVectors called, returning', vectors.length, 'vectors');
    return vectors;
  }

  // Utility operations
  async getStats(): Promise<{ documents: number; chunks: number; vectors: number }> {
    const [documents, chunks, vectors] = await Promise.all([
      this.documents.count(),
      this.chunks.count(),
      this.vectors.count(),
    ]);

    return { documents, chunks, vectors };
  }

  async clearAll(): Promise<void> {
    await this.vectors.clear();
    await this.chunks.clear();
    await this.documents.clear();
  }

  async resetDatabase(): Promise<void> {
    await this.close();
    await this.delete();
    await this.open();
  }
}

export const db = new RagDatabase();
