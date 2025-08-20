import { db } from './db';
import { embeddingModel, cosineSimilarity } from './embeddings';
import { SearchResult, SearchQuery } from './schema';

export class SearchEngine {
  private static instance: SearchEngine;

  private constructor() {}

  static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine();
    }
    return SearchEngine.instance;
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      console.log('Search query:', query.query);

      // Generate embedding for the search query
      const queryEmbedding = await embeddingModel.encode(query.query);
      console.log('Query embedding generated, length:', queryEmbedding.length);

      // Get all vectors from the database
      const vectors = await db.searchVectors(queryEmbedding, query.limit || 50);
      console.log('Vectors found in database:', vectors.length);

      if (vectors.length === 0) {
        console.log('No vectors found in database');
        return [];
      }

      // Get chunks and documents for the vectors
      const chunkIds = vectors.map(v => v.chunkId);
      console.log('Chunk IDs from vectors:', chunkIds.length);

      const chunks = await db.chunks.where('id').anyOf(chunkIds).toArray();
      console.log('Chunks found in database:', chunks.length);

      const documentIds = [...new Set(chunks.map(c => c.documentId))];
      console.log('Document IDs from chunks:', documentIds.length);

      const documents = await db.documents.where('id').anyOf(documentIds).toArray();
      console.log('Documents found in database:', documents.length);

      // Create a map for quick lookups
      const chunkMap = new Map(chunks.map(c => [c.id, c]));
      const documentMap = new Map(documents.map(d => [d.id, d]));

      console.log('Chunk map size:', chunkMap.size);
      console.log('Document map size:', documentMap.size);

      // Calculate similarity scores
      const results: SearchResult[] = [];

      for (const vector of vectors) {
        const chunk = chunkMap.get(vector.chunkId);
        const document = documentMap.get(vector.documentId);

        console.log('Processing vector:', {
          chunkId: vector.chunkId,
          documentId: vector.documentId,
          chunkFound: !!chunk,
          documentFound: !!document,
        });

        if (chunk && document) {
          const similarity = cosineSimilarity(queryEmbedding, vector.embedding);
          console.log('Similarity score:', similarity, 'threshold:', query.threshold || 0.01);

          // Enhanced relevance scoring system
          let finalScore = similarity;

          // 1. Keyword relevance boost (for mock embeddings)
          if (similarity < 0.1) {
            const keywordScore = this.calculateKeywordRelevance(
              query.query,
              chunk.content,
              document.title
            );
            finalScore = Math.max(similarity, keywordScore * 0.6); // Increased for better mock embedding handling
            console.log('Keyword relevance score:', keywordScore, 'Base score:', finalScore);
          }

          // 2. Title match boost (strong indicator of relevance)
          const titleMatch = document.title.toLowerCase().includes(query.query.toLowerCase());
          if (titleMatch) {
            finalScore += 0.3; // Increased for better title matching
            console.log('Title match boost applied, new score:', finalScore);
          }

          // 3. Full query match boost (exact content match - HIGHEST PRIORITY)
          const fullQueryMatch = chunk.content.toLowerCase().includes(query.query.toLowerCase());
          if (fullQueryMatch) {
            finalScore += 0.5; // Increased for exact matches
            console.log('Full query match boost applied, new score:', finalScore);
          }

          // 4. Exact phrase match boost (even higher priority for multi-word queries)
          const exactPhraseMatch = this.hasExactPhrase(query.query, chunk.content);
          if (exactPhraseMatch) {
            finalScore += 0.6; // Highest boost for exact phrase matches
            console.log('Exact phrase match boost applied, new score:', finalScore);
          }

          // 5. Agenda-specific boost for meeting-related queries
          const isAgendaQuery = this.isAgendaRelatedQuery(query.query);
          const hasAgendaContent = this.hasAgendaContent(chunk.content);
          if (isAgendaQuery && hasAgendaContent) {
            finalScore += 0.4; // Significant boost for agenda content
            console.log('Agenda content boost applied, new score:', finalScore);
          }

          // 6. Query word density boost (increased weight for better relevance)
          const queryWordDensity = this.calculateQueryWordDensity(query.query, chunk.content);
          finalScore += queryWordDensity * 0.1; // Increased for better relevance
          console.log(
            'Query word density boost:',
            queryWordDensity * 0.1,
            'New score:',
            finalScore
          );

          // 7. Content quality boost (increased weight for better content)
          const contentQuality = this.calculateContentQuality(chunk.content);
          finalScore += contentQuality * 0.05; // Increased for better content quality
          console.log('Content quality boost:', contentQuality * 0.05, 'Final score:', finalScore);

          if (finalScore >= (query.threshold || 0.01)) {
            results.push({
              chunk,
              document,
              score: finalScore,
              metadata: {
                chunkId: vector.chunkId,
                documentId: vector.documentId,
                similarity: similarity,
                keywordScore: finalScore !== similarity ? finalScore : undefined,
                titleMatch: titleMatch,
                fullQueryMatch: fullQueryMatch,
                exactPhraseMatch: exactPhraseMatch,
                queryWordDensity: queryWordDensity,
                contentQuality: contentQuality,
              },
            });
            console.log('Result added, total results:', results.length, 'Final score:', finalScore);
          } else {
            console.log('Result filtered out due to low similarity');
          }
        } else {
          console.log('Missing chunk or document for vector');
        }
      }

      // Sort by similarity score (highest first)
      results.sort((a, b) => b.score - a.score);
      console.log(
        'Results sorted by score, top 3 scores:',
        results.slice(0, 3).map(r => r.score)
      );

      // Apply MMR (Maximal Marginal Relevance) re-ranking for diversity
      if (results.length > 1) {
        const reRanked = this.mmrReRank(results, query.limit || 10);
        console.log(
          'MMR re-ranking applied, final order:',
          reRanked.map(r => ({ title: r.document.title, score: r.score }))
        );
        return reRanked;
      }

      return results.slice(0, query.limit || 10);
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  // MMR re-ranking to improve result diversity
  private mmrReRank(results: SearchResult[], limit: number, lambda: number = 0.7): SearchResult[] {
    if (results.length <= limit) return results;

    // Start with the highest scoring result
    const selected: SearchResult[] = [results[0]];
    const remaining = results.slice(1);

    console.log('MMR: Starting with highest score result:', results[0].score);

    while (selected.length < limit && remaining.length > 0) {
      let bestScore = -1;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = remaining[i].score;
        const diversity = this.calculateDiversity(remaining[i], selected);

        // MMR formula: λ * relevance + (1-λ) * diversity
        // Higher lambda = more emphasis on relevance
        const mmrScore = lambda * relevance + (1 - lambda) * diversity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        const selectedResult = remaining[bestIndex];
        selected.push(selectedResult);
        remaining.splice(bestIndex, 1);

        console.log(
          'MMR: Selected result with score:',
          selectedResult.score,
          'MMR score:',
          bestScore
        );
      } else {
        break;
      }
    }

    console.log(
      'MMR: Final selection order by score:',
      selected.map(r => r.score)
    );
    return selected;
  }

  // Calculate diversity score based on similarity to already selected results
  private calculateDiversity(candidate: SearchResult, selected: SearchResult[]): number {
    if (selected.length === 0) return 1;

    let maxSimilarity = 0;

    for (const selectedResult of selected) {
      // Use content similarity as a proxy for embedding similarity
      const contentSimilarity = this.calculateContentSimilarity(
        candidate.chunk.content,
        selectedResult.chunk.content
      );

      // Also consider document diversity (different documents = more diverse)
      const documentDiversity = candidate.document.id === selectedResult.document.id ? 0 : 0.3;

      // Combined similarity (content + document)
      const totalSimilarity = contentSimilarity + documentDiversity;
      maxSimilarity = Math.max(maxSimilarity, totalSimilarity);
    }

    // Return diversity as 1 - similarity (higher diversity = lower similarity)
    return Math.max(0, 1 - maxSimilarity);
  }

  // Simple content similarity using Jaccard similarity
  private calculateContentSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // Search with filters
  async searchWithFilters(
    query: SearchQuery,
    filters: {
      documentTypes?: string[];
      dateRange?: { start: Date; end: Date };
      sources?: string[];
    }
  ): Promise<SearchResult[]> {
    const results = await this.search(query);

    if (!filters || Object.keys(filters).length === 0) {
      return results;
    }

    return results.filter(result => {
      // Filter by document type
      if (filters.documentTypes && !filters.documentTypes.includes(result.document.type)) {
        return false;
      }

      // Filter by date range
      if (filters.dateRange) {
        const docDate = result.document.createdAt;
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false;
        }
      }

      // Filter by source
      if (filters.sources && !filters.sources.includes(result.document.source)) {
        return false;
      }

      return true;
    });
  }

  // Get search suggestions based on existing documents
  async getSearchSuggestions(partialQuery: string, limit: number = 5): Promise<string[]> {
    if (partialQuery.length < 2) return [];

    try {
      const documents = await db.getAllDocuments();
      const suggestions = new Set<string>();

      for (const doc of documents) {
        const words = doc.title.toLowerCase().split(/\s+/);
        const contentWords = doc.content.toLowerCase().split(/\s+/);

        for (const word of [...words, ...contentWords]) {
          if (word.startsWith(partialQuery.toLowerCase()) && word.length > 2) {
            suggestions.add(word);
            if (suggestions.size >= limit) break;
          }
        }

        if (suggestions.size >= limit) break;
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  // Calculate keyword relevance as fallback for mock embeddings
  private calculateKeywordRelevance(query: string, content: string, title: string): number {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    const contentWords = (content + ' ' + title).toLowerCase().split(/\s+/);

    let matches = 0;
    const totalQueryWords = queryWords.length;
    let exactMatches = 0;

    for (const queryWord of queryWords) {
      if (
        contentWords.some(
          contentWord => contentWord.includes(queryWord) || queryWord.includes(contentWord)
        )
      ) {
        matches++;

        // Check for exact matches (higher score)
        if (contentWords.some(contentWord => contentWord === queryWord)) {
          exactMatches++;
        }
      }
    }

    // Base score from partial matches
    let score = totalQueryWords > 0 ? matches / totalQueryWords : 0;

    // Bonus for exact matches
    if (exactMatches > 0) {
      score += exactMatches * 0.3;
    }

    // Special boost for term-related queries
    if (query.toLowerCase().includes('term') && content.toLowerCase().includes('term')) {
      score += 0.4;
    }

    // Special boost for date-related queries
    if (query.toLowerCase().includes('start') && content.toLowerCase().includes('start date')) {
      score += 0.5;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Check if the query is an exact phrase match in the content
  private hasExactPhrase(query: string, content: string): boolean {
    const queryLower = query.toLowerCase().trim();
    const contentLower = content.toLowerCase();

    // First check for exact query match
    if (contentLower.includes(queryLower)) {
      console.log('Exact query match found:', queryLower);
      return true;
    }

    // Extract key phrases from the query for better matching
    const keyPhrases = this.extractKeyPhrases(queryLower);
    console.log('Extracted key phrases:', keyPhrases);

    // Check if any key phrase is found in the content
    for (const phrase of keyPhrases) {
      if (contentLower.includes(phrase)) {
        console.log('Key phrase match found:', phrase);
        return true;
      }
    }

    console.log('No phrase matches found');
    return false;
  }

  // Extract key phrases from a query for better matching
  private extractKeyPhrases(query: string): string[] {
    const phrases: string[] = [];

    // Extract "term X" patterns (e.g., "term 1", "term 2")
    const termMatches = query.match(/term\s+\d+/gi);
    if (termMatches) {
      phrases.push(...termMatches);
    }

    // Extract "when will X" patterns (e.g., "when will term 1 starts")
    const whenMatches = query.match(/when\s+will\s+([^?]+)/gi);
    if (whenMatches) {
      const extracted = whenMatches.map(m => m.replace(/when\s+will\s+/i, '').trim());
      phrases.push(...extracted);
    }

    // Extract other key terms
    const keyTerms = ['start', 'begin', 'schedule', 'calendar', 'dates', 'beginning'];
    for (const term of keyTerms) {
      if (query.includes(term)) {
        phrases.push(term);
      }
    }

    // Extract date-related terms
    const dateTerms = ['start date', 'end date', 'beginning', 'first day'];
    for (const term of dateTerms) {
      if (query.includes(term)) {
        phrases.push(term);
      }
    }

    return phrases;
  }

  // Check if query is related to meeting agenda or schedules
  private isAgendaRelatedQuery(query: string): boolean {
    const agendaKeywords = [
      'agenda',
      'meeting agenda',
      'what was the meeting',
      'meeting topics',
      'meeting schedule',
      'meeting plan',
      'what was discussed',
      'meeting outline',
      'when will',
      'start date',
      'end date',
      'term',
      'semester',
      'schedule',
      'calendar',
      'dates',
      'beginning',
      'first day',
      'school year',
      'academic year',
    ];
    const queryLower = query.toLowerCase();
    return agendaKeywords.some(keyword => queryLower.includes(keyword));
  }

  // Check if content contains agenda-related information
  private hasAgendaContent(content: string): boolean {
    const agendaIndicators = [
      'agenda:',
      'agenda items',
      'meeting agenda',
      'topics:',
      'discussion points',
      'next meeting:',
      'meeting adjourned',
      'meeting notes',
      'standup',
      'sprint',
      'term',
      'semester',
      'start date',
      'end date',
      'academic year',
      'school year',
      'calendar',
      'schedule',
      'holidays',
      'breaks',
      'mid-term',
    ];
    const contentLower = content.toLowerCase();
    return agendaIndicators.some(indicator => contentLower.includes(indicator));
  }

  // Get better content chunks by finding the most relevant section
  private getBestContentSection(query: string, content: string, maxLength: number = 500): string {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Find the best starting position based on query word density
    let bestStart = 0;
    let bestScore = 0;

    for (let i = 0; i < content.length - maxLength; i += 100) {
      const section = content.substring(i, i + maxLength);
      const sectionWords = section.toLowerCase().split(/\s+/);

      let score = 0;
      for (const queryWord of queryWords) {
        if (sectionWords.some(word => word.includes(queryWord))) {
          score++;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }

    // Get the best section and try to break at sentence boundaries
    let bestSection = content.substring(bestStart, bestStart + maxLength);

    // Try to start at a sentence boundary
    const firstSentence = bestSection.search(/[.!?]\s+/);
    if (firstSentence > 0 && firstSentence < maxLength * 0.3) {
      bestSection = bestSection.substring(firstSentence + 1);
    }

    // Try to end at a sentence boundary
    const lastSentence = bestSection.lastIndexOf('.');
    if (lastSentence > maxLength * 0.7) {
      bestSection = bestSection.substring(0, lastSentence + 1);
    }

    return bestSection.trim();
  }

  // Calculate query word density
  private calculateQueryWordDensity(query: string, content: string): number {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    const contentWords = content.toLowerCase().split(/\s+/);

    let density = 0;
    for (const queryWord of queryWords) {
      if (contentWords.some(contentWord => contentWord.includes(queryWord))) {
        density++;
      }
    }
    return density / queryWords.length;
  }

  // Calculate content quality (e.g., length, sentence structure)
  private calculateContentQuality(content: string): number {
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const averageSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentenceCount;

    // Simple quality score based on sentence count and average sentence length
    // Higher scores for more sentences and longer sentences
    return sentenceCount * 0.5 + (averageSentenceLength / 10) * 0.5;
  }
}

export const searchEngine = SearchEngine.getInstance();
