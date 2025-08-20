import { LLMConfig, LLMResponse, Citation, SearchResult } from './schema'

export interface StreamChunk {
  type: 'content' | 'citation' | 'done' | 'error'
  content?: string
  citation?: Citation
  error?: string
  metadata?: Record<string, any>
}

export class LLMStreamer {
  private config: LLMConfig
  private abortController: AbortController | null = null

  constructor(config: LLMConfig) {
    this.config = config
  }

  async streamResponse(
    query: string,
    context: SearchResult[],
    onChunk: (chunk: StreamChunk) => void
  ): Promise<void> {
    try {
      this.abortController = new AbortController()
      
      const response = await this.makeStreamingRequest(query, context, this.abortController.signal)
      
      if (!response.body) {
        throw new Error('No response body received')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.trim() === '') continue
            
            // Handle Ollama format (local LLM)
            if (this.config.provider === 'local') {
              try {
                const data = JSON.parse(line)
                console.log('Ollama response data:', data)
                
                if (data.response) {
                  console.log('Ollama content chunk:', data.response)
                  onChunk({
                    type: 'content',
                    content: data.response
                  })
                }
                if (data.done) {
                  console.log('Ollama response complete')
                  onChunk({ type: 'done' })
                  return
                }
              } catch (e) {
                console.log('Ollama line parse error:', line, e)
                // Skip malformed JSON
              }
            } else {
              // Handle OpenAI/Anthropic format
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                
                if (data === '[DONE]') {
                  onChunk({ type: 'done' })
                  return
                }
                
                try {
                  const parsed = JSON.parse(data)
                  this.handleStreamChunk(parsed, onChunk)
                } catch (e) {
                  // Skip malformed JSON
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onChunk({ type: 'error', error: 'Request was cancelled' })
      } else {
        onChunk({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        })
      }
    }
  }

  private async makeStreamingRequest(
    query: string,
    context: SearchResult[],
    signal: AbortSignal
  ): Promise<Response> {
    const { provider, apiKey, model, temperature = 0.7, maxTokens = 1000, systemPrompt } = this.config
    
    // Build context from search results
    const contextText = context.map(result => 
      `Source: ${result.document.title}\nContent: ${result.chunk.content}\nRelevance: ${result.score.toFixed(3)}\n---`
    ).join('\n')

    const messages = [
      {
        role: 'system',
        content: systemPrompt || `You are a helpful AI assistant. Answer questions based on the provided context. Always cite your sources using the [Source: Title] format when referencing information.`
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nQuestion: ${query}\n\nPlease answer the question based on the context above. Include citations for any information you use.`
      }
    ]

    switch (provider) {
      case 'openai':
        if (!apiKey) {
          throw new Error('OpenAI API key is required')
        }
        return this.openAIStream(messages, model, temperature, maxTokens, apiKey, signal)
      
      case 'anthropic':
        if (!apiKey) {
          throw new Error('Anthropic API key is required')
        }
        return this.anthropicStream(messages, model, temperature, maxTokens, apiKey, signal)
      
      case 'local':
        return this.streamLocalLLM(query, context, signal)
      
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private async openAIStream(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
    signal: AbortSignal
  ): Promise<Response> {
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    return response
  }

  private async anthropicStream(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiKey: string,
    signal: AbortSignal
  ): Promise<Response> {
    if (!apiKey) {
      throw new Error('Anthropic API key is required')
    }

    // Convert OpenAI format to Anthropic format
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.role === 'system' ? `System: ${msg.content}` : msg.content
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: anthropicMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
    }

    return response
  }

  // Stream response from local LLM (Ollama)
  private async streamLocalLLM(
    query: string,
    context: SearchResult[],
    signal: AbortSignal
  ): Promise<Response> {
    try {
      const baseUrl = (this.config as any).baseUrl || 'http://localhost:11434'
      const model = this.config.model || 'llama2:7b'
      const timeout = (this.config as any).timeout || 30000
      
      // Build context from search results
      const contextText = context.map(result => 
        `Source: ${result.document.title}\nContent: ${result.chunk.content}\nRelevance: ${result.score.toFixed(3)}\n---`
      ).join('\n')
      
      // Create the prompt for the local LLM
      const prompt = this.createLocalLLMPrompt(query, contextText, this.config.systemPrompt)
      
      console.log('Local LLM: Sending request to Ollama')
      console.log('Local LLM: Model:', model)
      console.log('Local LLM: Base URL:', baseUrl)
      
      // Make request to Ollama
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: true,
          options: {
            temperature: this.config.temperature || 0.7,
            num_predict: this.config.maxTokens || 1000,
          }
        }),
        signal: AbortSignal.timeout(timeout)
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }
      
      return response
      
    } catch (error) {
      console.error('Local LLM request error:', error)
      throw error
    }
  }
  
  // Create prompt for local LLM
  private createLocalLLMPrompt(query: string, context: string, systemPrompt?: string): string {
    const prompt = `${systemPrompt || 'You are a helpful RAG assistant.'}

Context from documents:
${context}

Question: ${query}

Answer based on the context above:`
    
    return prompt
  }

  private handleStreamChunk(data: any, onChunk: (chunk: StreamChunk) => void) {
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0]
      
      if (choice.delta && choice.delta.content) {
        onChunk({
          type: 'content',
          content: choice.delta.content,
          metadata: {
            finishReason: choice.finish_reason,
            index: choice.index
          }
        })
      }
    } else if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
      // Anthropic format
      onChunk({
        type: 'content',
        content: data.delta.text,
        metadata: {
          index: data.index
        }
      })
    }
  }

  // Extract citations from streaming text
  extractCitations(text: string, context: SearchResult[]): Citation[] {
    const citations: Citation[] = []
    const citationRegex = /\[Source:\s*([^\]]+)\]/g
    
    let match
    while ((match = citationRegex.exec(text)) !== null) {
      const sourceTitle = match[1].trim()
      const contextResult = context.find(result => 
        result.document.title.toLowerCase().includes(sourceTitle.toLowerCase())
      )
      
      if (contextResult) {
        citations.push({
          chunkId: contextResult.chunk.id,
          documentId: contextResult.document.id,
          title: contextResult.document.title,
          content: contextResult.chunk.content,
          score: contextResult.score
        })
      }
    }
    
    return citations
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Factory function for creating streamers
export function createLLMStreamer(config: LLMConfig): LLMStreamer {
  return new LLMStreamer(config)
}

// Default configurations
export const defaultConfigs = {
  openai: {
    provider: 'openai' as const,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful RAG assistant that answers questions based on provided context. Always cite your sources and provide accurate information.'
  },
  anthropic: {
    provider: 'anthropic' as const,
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful RAG assistant that answers questions based on provided context. Always cite your sources and provide accurate information.'
  },
  local: {
    provider: 'local' as const,
    model: 'llama2:7b',
    temperature: 0.7,
    maxTokens: 1000,
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
    systemPrompt: 'You are a helpful RAG assistant that answers questions based on provided context. Always cite your sources and provide accurate information.'
  }
} 