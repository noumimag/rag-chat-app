import { Document, Chunk, Vector } from '../lib/schema';

// Worker context - this runs in a separate thread
const ctx: Worker = self as any;

interface IngestMessage {
  type: 'ingest';
  document: Document;
  chunkSize?: number;
  overlap?: number;
}

interface IngestResponse {
  type: 'ingest_complete';
  result: {
    documentId: string;
    chunksCreated: number;
    vectorsCreated: number;
    processingTime: number;
  };
}

interface ErrorResponse {
  type: 'error';
  error: string;
}

// Improved text chunking function for better content preservation
function chunkText(text: string, chunkSize: number = 1200, overlap: number = 200): string[] {
  console.log(
    'Worker: Starting chunking, text length:',
    text.length,
    'chunkSize:',
    chunkSize,
    'overlap:',
    overlap
  );

  // Validate inputs
  if (!text || text.length === 0) {
    console.log('Worker: Empty text, returning empty array');
    return [];
  }
  if (chunkSize <= 0) chunkSize = 1200; // Increased chunk size
  if (overlap < 0) overlap = 0;
  if (overlap >= chunkSize) overlap = Math.floor(chunkSize / 3);

  console.log('Worker: Validated parameters - chunkSize:', chunkSize, 'overlap:', overlap);

  // Split content into overlapping chunks
  const chunks: string[] = [];
  let startIndex = 0;

  try {
    while (startIndex < text.length) {
      console.log(
        'Worker: Processing chunk at startIndex:',
        startIndex,
        'text length:',
        text.length
      );

      const endIndex = Math.min(startIndex + chunkSize, text.length);
      let chunk = text.substring(startIndex, endIndex);

      console.log(
        'Worker: Created chunk, length:',
        chunk.length,
        'startIndex:',
        startIndex,
        'endIndex:',
        endIndex
      );

      // Try to break at better boundaries for more meaningful chunks
      if (endIndex < text.length && chunk.length > 300) {
        // Priority 1: Look for major section breaks (double newlines with headers)
        let breakPoint = chunk.lastIndexOf('\n##');
        if (breakPoint === -1) {
          breakPoint = chunk.lastIndexOf('\n#');
        }

        // Priority 2: Look for paragraph breaks (double newlines)
        if (breakPoint === -1) {
          breakPoint = chunk.lastIndexOf('\n\n');
        }

        // Priority 3: Look for meeting-specific boundaries
        if (breakPoint === -1) {
          const meetingBoundaries = [
            'MEETING ADJOURNED:',
            'NEXT MEETING:',
            'PROJECT MILESTONES:',
            'Q1 2024 Goals:',
            'Q2 2024 Goals:',
            '---',
          ];
          for (const boundary of meetingBoundaries) {
            const boundaryIndex = chunk.lastIndexOf(boundary);
            if (boundaryIndex > startIndex + chunkSize * 0.5) {
              breakPoint = boundaryIndex;
              break;
            }
          }
        }

        // Priority 4: Look for sentence endings
        if (breakPoint === -1) {
          const lastSentenceEnd = chunk.lastIndexOf('.');
          const lastNewline = chunk.lastIndexOf('\n');
          breakPoint = Math.max(lastSentenceEnd, lastNewline);
        }

        // Only break if we're not too far back and the break point is meaningful
        if (breakPoint > startIndex + chunkSize * 0.5) {
          chunk = chunk.substring(0, breakPoint + 1);
          console.log('Worker: Broke at boundary, new chunk length:', chunk.length);
        }
      }

      // Only add non-empty chunks with meaningful content
      if (chunk.trim().length > 150) {
        // Increased minimum length for better quality
        chunks.push(chunk);
        console.log('Worker: Added chunk, total chunks:', chunks.length);
      }

      // Move to next chunk position
      const nextStartIndex = startIndex + chunk.length - overlap;
      console.log('Worker: Moving from', startIndex, 'to', nextStartIndex);

      // Safety check to prevent infinite loops
      if (nextStartIndex <= startIndex) {
        console.warn('Worker: nextStartIndex not advancing, forcing advancement');
        startIndex = startIndex + chunkSize;
      } else {
        startIndex = nextStartIndex;
      }

      if (startIndex >= text.length) {
        console.log('Worker: Reached end of text, breaking');
        break;
      }

      // Additional safety check
      if (chunks.length > 100) {
        console.warn('Worker: Too many chunks, stopping to prevent infinite loop');
        break;
      }
    }
  } catch (error) {
    console.error('Worker: Error during chunking:', error);
    // Fallback: create one large chunk
    if (text.trim().length > 0) {
      chunks.push(text);
    }
  }

  console.log('Worker: Chunking complete, total chunks:', chunks.length);
  return chunks;
}

// Mock embedding function for now - in a real implementation, this would use the actual embedding model
async function generateEmbedding(_text: string): Promise<number[]> {
  // Simulate embedding generation with a delay
  await new Promise(resolve => setTimeout(resolve, 10));

  // Return a mock 384-dimensional vector (matching the model dimensions)
  const embedding = new Array(384).fill(0).map(() => Math.random() * 2 - 1);

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

// Process document ingestion
async function processDocument(
  document: Document,
  chunkSize: number = 1000,
  overlap: number = 200
): Promise<{
  chunks: Omit<Chunk, 'createdAt'>[];
  vectors: Omit<Vector, 'id' | 'createdAt'>[];
}> {
  console.log('Worker: Starting document processing for:', document.title);
  console.log('Worker: Document content length:', document.content.length);

  try {
    // Chunk the document
    const textChunks = chunkText(document.content, chunkSize, overlap);
    console.log('Worker: Text chunks created:', textChunks.length);

    // Create chunk objects
    const chunks: Omit<Chunk, 'createdAt'>[] = [];
    let currentIndex = 0;

    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      console.log(
        'Worker: Processing chunk',
        i,
        'length:',
        chunkText.length,
        'currentIndex:',
        currentIndex
      );

      const startIndex = currentIndex;
      const endIndex = startIndex + chunkText.length;

      // Validate indices
      if (startIndex >= 0 && endIndex <= document.content.length) {
        const chunkId = crypto.randomUUID();

        chunks.push({
          id: chunkId,
          documentId: document.id,
          content: chunkText,
          startIndex,
          endIndex,
        });

        console.log('Worker: Added chunk', i, 'startIndex:', startIndex, 'endIndex:', endIndex);
        currentIndex = endIndex - overlap;
      } else {
        console.warn('Worker: Invalid chunk indices:', {
          startIndex,
          endIndex,
          contentLength: document.content.length,
          chunkIndex: i,
        });
        // Skip this chunk if indices are invalid
        currentIndex += chunkSize - overlap;
      }
    }

    console.log('Worker: Chunks created:', chunks.length);

    // Generate embeddings for chunks
    const vectors: Omit<Vector, 'id' | 'createdAt'>[] = [];

    for (const chunk of chunks) {
      console.log('Worker: Generating embedding for chunk:', chunk.id);
      const embedding = await generateEmbedding(chunk.content);

      vectors.push({
        chunkId: chunk.id,
        documentId: document.id,
        embedding,
      });
    }

    console.log('Worker: Vectors created:', vectors.length);
    return { chunks, vectors };
  } catch (error) {
    console.error('Worker: Error in processDocument:', error);
    throw error;
  }
}

// Handle messages from the main thread
ctx.addEventListener('message', async (event: MessageEvent<IngestMessage>) => {
  try {
    if (event.data.type === 'ingest') {
      const { document, chunkSize = 1000, overlap = 200 } = event.data;

      console.log(`Worker: Processing document "${document.title}"`);
      console.log(`Worker: Document size: ${document.content.length} characters`);

      const startTime = performance.now();

      try {
        const { chunks, vectors } = await processDocument(document, chunkSize, overlap);

        const response: IngestResponse = {
          type: 'ingest_complete',
          result: {
            documentId: document.id,
            chunksCreated: chunks.length,
            vectorsCreated: vectors.length,
            processingTime: performance.now() - startTime,
          },
        };

        // Send the processed data back to the main thread
        ctx.postMessage({
          type: 'ingest_data',
          chunks,
          vectors,
        });

        ctx.postMessage(response);
      } catch (processingError) {
        console.error('Worker: Document processing failed:', processingError);
        ctx.postMessage({
          type: 'error',
          error: `Document processing failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`,
        });
      }
    }
  } catch (error) {
    console.error('Worker: Message handling error:', error);
    const errorResponse: ErrorResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    ctx.postMessage(errorResponse);
  }
});

// Handle errors
ctx.addEventListener('error', error => {
  console.error('Worker error:', error);
  ctx.postMessage({
    type: 'error',
    error: 'Worker encountered an error',
  });
});

export {};
