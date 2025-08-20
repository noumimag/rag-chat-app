import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, StopCircle, Copy, MessageCircle, FileText, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { searchEngine } from '../lib/search'
import { createLLMStreamer, defaultConfigs } from '../lib/llmStream'
import { SearchResult, Citation, LLMConfig } from '../lib/schema'
import { copyToClipboard, truncateText } from '../lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  searchResults?: SearchResult[]
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('')
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(defaultConfigs.local)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const llmStreamerRef = useRef(createLLMStreamer(llmConfig))

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStreamingMessage])

  // Listen for clear chat event from sidebar
  useEffect(() => {
    const handleClearChat = () => {
      clearChat()
    }
    
    window.addEventListener('clearChat', handleClearChat)
    return () => window.removeEventListener('clearChat', handleClearChat)
  }, [])

  // Initialize LLM streamer when config changes
  useEffect(() => {
    llmStreamerRef.current = createLLMStreamer(llmConfig)
  }, [llmConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setCurrentStreamingMessage('')

    try {
      // Search for relevant context
      const searchResults = await searchEngine.search({
        query: input.trim(),
        limit: 5,
        threshold: 0.01  // Back to 0.01 for mock embeddings
      })

      if (searchResults.length === 0) {
        const noContextMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "I couldn't find any relevant documents to answer your question. Please try uploading some documents first or rephrasing your question.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, noContextMessage])
        setIsStreaming(false)
        return
      }

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        searchResults
      }

      // Don't add the empty message to the array yet - wait for content
      // setMessages(prev => [...prev, assistantMessage])

      // Stream response from LLM
      try {
        await llmStreamerRef.current.streamResponse(
          input.trim(),
          searchResults,
          (chunk) => {
            console.log('Received chunk:', chunk)
            
            if (chunk.type === 'content' && chunk.content) {
              console.log('Adding content chunk:', chunk.content)
              setCurrentStreamingMessage(prev => {
                const newContent = prev + chunk.content
                console.log('Updated streaming message:', newContent)
                return newContent
              })
            } else if (chunk.type === 'done') {
              // Use a callback to get the current streaming message value
              setCurrentStreamingMessage(currentMessage => {
                console.log('Streaming done, finalizing message with content:', currentMessage)
                // Now add the complete message to the array
                const finalMessage: ChatMessage = {
                  ...assistantMessage,
                  content: currentMessage
                }
                setMessages(prev => [...prev, finalMessage])
                setIsStreaming(false)
                return '' // Clear the streaming message
              })
            } else if (chunk.type === 'error') {
              console.error('LLM streaming error:', chunk.error)
              // Provide mock response when API fails
              const mockResponse = generateMockResponse(input.trim(), searchResults)
              const finalMessage: ChatMessage = {
                ...assistantMessage,
                content: mockResponse
              }
              setMessages(prev => [...prev, finalMessage])
              setCurrentStreamingMessage('')
              setIsStreaming(false)
            }
          }
        )
      } catch (error) {
        console.error('LLM streaming failed:', error)
        // Provide mock response when API fails
        const mockResponse = generateMockResponse(input.trim(), searchResults)
        const finalMessage: ChatMessage = {
          ...assistantMessage,
          content: mockResponse
        }
        setMessages(prev => [...prev, finalMessage])
        setCurrentStreamingMessage('')
        setIsStreaming(false)
      }

    } catch (error) {
      console.error('Chat failed:', error)
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsStreaming(false)
    }
  }

  const stopStreaming = () => {
    llmStreamerRef.current.abort()
    setIsStreaming(false)
    
    // Finalize the current streaming message
    if (currentStreamingMessage) {
      setMessages(prev => prev.map(msg => 
        msg.role === 'assistant' && !msg.content
          ? { ...msg, content: currentStreamingMessage }
          : msg
      ))
      setCurrentStreamingMessage('')
    }
  }

  const copyMessage = async (content: string) => {
    await copyToClipboard(content)
  }

  const clearChat = () => {
    setMessages([])
    setCurrentStreamingMessage('')
    setIsStreaming(false)
  }

  const updateLLMConfig = (newConfig: Partial<LLMConfig>) => {
    setLlmConfig(prev => ({ ...prev, ...newConfig }))
    setShowSettings(false)
  }

  // Update API key in LLM config
  const updateAPIKey = (key: string) => {
    setApiKey(key)
    setLlmConfig(prev => ({ ...prev, apiKey: key }))
  }

  // Generate mock response when API is unavailable
  const generateMockResponse = (query: string, searchResults: SearchResult[]): string => {
    if (searchResults.length === 0) {
      return "I couldn't find any relevant documents to answer your question. Please try uploading some documents first or rephrasing your question."
    }

    // Sort results by relevance score (highest first)
    const sortedResults = [...searchResults].sort((a, b) => b.score - a.score)
    const topResult = sortedResults[0]
    
    // For mock embeddings, accept lower scores but provide context about relevance
    const isHighlyRelevant = topResult.score > 0.3
    const isModeratelyRelevant = topResult.score > 0.15
    const isLowRelevance = topResult.score <= 0.15

    let response = `Based on the search results, I found information in "${topResult.document.title}" `
    
    if (isHighlyRelevant) {
      response += `(high relevance: ${(topResult.score * 100).toFixed(1)}%).\n\n`
    } else if (isModeratelyRelevant) {
      response += `(moderate relevance: ${(topResult.score * 100).toFixed(1)}%).\n\n`
    } else {
      response += `(low relevance: ${(topResult.score * 100).toFixed(1)}% - this might not be the best match).\n\n`
    }
    
    // Clean and format the content from the top result
    const cleanedContent = cleanMarkdownContent(topResult.chunk.content)
    
    // For agenda-related queries, try to provide more complete information
    const isAgendaQuery = query.toLowerCase().includes('agenda') || 
                         query.toLowerCase().includes('meeting') ||
                         query.toLowerCase().includes('what was')
    
    if (isAgendaQuery) {
      response += `Here's what I found about the meeting agenda:\n\n${cleanedContent}\n\n`
      
      // Try to find additional agenda-related content from other results
      const agendaResults = sortedResults.filter(r => 
        r.score > 0.1 && 
        r.chunk.content.toLowerCase().includes('agenda') ||
        r.chunk.content.toLowerCase().includes('meeting') ||
        r.chunk.content.toLowerCase().includes('topics:') ||
        r.chunk.content.toLowerCase().includes('discussion points')
      )
      
      if (agendaResults.length > 1) {
        // Find the most complete agenda content
        const bestAgendaResult = agendaResults.reduce((best, current) => {
          const bestScore = best.chunk.content.toLowerCase().includes('agenda') ? 2 : 1
          const currentScore = current.chunk.content.toLowerCase().includes('agenda') ? 2 : 1
          return (currentScore > bestScore) ? current : best
        })
        
        if (bestAgendaResult.chunk.id !== topResult.chunk.id) {
          const additionalContent = cleanMarkdownContent(bestAgendaResult.chunk.content)
          if (additionalContent.length > 200) {
            response += `Additional agenda information:\n\n${additionalContent}\n\n`
          }
        }
      }
    } else {
      // Standard response for other queries
      response += `Here's what I found:\n\n${cleanedContent}\n\n`
    }
    
    // Add additional context if available, but be more selective and avoid duplication
    if (sortedResults.length > 1) {
      const relevantResults = sortedResults.filter(r => r.score > 0.05)
      const uniqueResults = relevantResults.filter((result, index, self) => 
        index === self.findIndex(r => r.chunk.content.substring(0, 100) === result.chunk.content.substring(0, 100))
      )
      
      if (uniqueResults.length > 1) {
        response += `I also found ${uniqueResults.length - 1} other relevant sections. `
        response += `The search found content across ${new Set(uniqueResults.map(r => r.document.title)).size} different documents.\n\n`
        
        // Add a snippet from the second most relevant result if it's available and adds value
        if (uniqueResults[1] && uniqueResults[1].score > 0.1) {
          const secondContent = cleanMarkdownContent(uniqueResults[1].chunk.content)
          if (secondContent.length > 150 && !cleanedContent.includes(secondContent.substring(0, 100))) {
            response += `Additional relevant information from "${uniqueResults[1].document.title}":\n\n`
            const cleanedSnippet = cleanMarkdownContent(secondContent.substring(0, 500))
            response += `${cleanedSnippet}...\n\n`
          }
        }
      }
    }
    
    // Add guidance based on relevance
    if (isLowRelevance) {
      response += `⚠️ Note: The relevance score is quite low, which might mean this content isn't directly answering your question. `
      response += `Try rephrasing your question or using more specific terms.\n\n`
    }
    
    response += `Note: This is a mock response since the AI service is currently unavailable. In a production environment, this would be a full AI-generated response based on your documents.`
    
    return response
  }

  // Clean markdown content for better readability while preserving important information
  const cleanMarkdownContent = (content: string): string => {
    return content
      // Remove markdown headers but preserve the text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove bold/italic but preserve the text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove HTML tags (like <mark>)
      .replace(/<[^>]*>/g, '')
      // Clean up extra whitespace but preserve line breaks for structure
      .replace(/\n\s*\n/g, '\n\n')
      // Preserve important meeting markers
      .replace(/(MEETING ADJOURNED:|NEXT MEETING:|PROJECT MILESTONES:|Q1 2024 Goals:|Q2 2024 Goals:)/g, '\n$1')
      .trim()
  }

  // Highlight search query terms in content
  const highlightQuery = (query: string, content: string): string => {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
    let highlightedContent = content
    
    for (const word of queryWords) {
      const regex = new RegExp(`(${word})`, 'gi')
      highlightedContent = highlightedContent.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    }
    
    return highlightedContent
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="chat-messages space-y-6">
        {messages.length === 0 ? (
          // Welcome message when no chat history
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to RAG Assistant</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Ask me anything about your documents. I can help you find information, answer questions, and provide insights from your uploaded content.
            </p>
            {/* <div className="space-y-3 text-sm text-gray-500">
              <p>💡 Try asking:</p>
              <div className="space-y-2">
                <p>"What are the main features of this project?"</p>
                <p>"Summarize the key points from the meeting notes"</p>
                <p>"Find information about authentication implementation"</p>
              </div>
            </div> */}
          </div>
        ) : (
          // Chat messages using Flowbite chat bubble design
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-2.5',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-primary-600" />
                  </div>
                )}
                
                <div
                  className={cn(
                    'flex flex-col w-full max-w-[80%] leading-1.5 p-4 rounded-xl',
                    message.role === 'user'
                      ? 'bg-primary-600 text-white rounded-e-xl rounded-es-xl'
                      : 'bg-gray-100 text-gray-900 rounded-s-xl rounded-se-xl dark:bg-gray-700 dark:text-white'
                  )}
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <span className="text-sm font-semibold">
                      {message.role === 'user' ? 'You' : 'RAG Assistant'}
                    </span>
                    <span className="text-sm font-normal opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="text-sm font-normal py-2.5 whitespace-pre-wrap">
                    {message.content}
                  </div>
                  
                  {/* Citations with better styling */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Sources:</div>
                      <div className="space-y-2">
                        {message.citations.map((citation, index) => (
                          <div key={index} className="text-xs bg-gray-50 dark:bg-gray-600 p-2 rounded-lg border border-gray-200 dark:border-gray-500">
                            <div className="font-medium text-gray-800 dark:text-white">{citation.title}</div>
                            <div className="text-gray-600 dark:text-gray-300 mt-1">
                              {truncateText(citation.content, 100)}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 mt-1">
                              Relevance: {(citation.score * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Message status */}
                  <span className="text-sm font-normal opacity-70 mt-2">
                    {message.role === 'user' ? 'Sent' : 'Delivered'}
                  </span>
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">U</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming message with Flowbite design */}
            {isStreaming && (
              <div className="flex items-start gap-2.5 justify-start">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-primary-600" />
                </div>
                <div className="flex flex-col w-full max-w-[80%] leading-1.5 p-4 bg-gray-100 text-gray-900 rounded-s-xl rounded-se-xl dark:bg-gray-700 dark:text-white">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                    <span className="text-sm font-semibold">RAG Assistant</span>
                    <span className="text-sm font-normal opacity-70">Now</span>
                  </div>
                  <div className="text-sm font-normal py-2.5">
                    {currentStreamingMessage ? (
                      <>
                        {currentStreamingMessage}
                        <span className="typing-indicator ml-1"></span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-gray-600 dark:text-gray-300">Analyzing your documents...</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-normal opacity-70 mt-2">
                    {currentStreamingMessage ? 'Typing...' : 'Processing...'}
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form with better styling */}
      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your documents..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:outline-none focus:ring-primary-300 focus:border-primary-500 text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-primary-800 dark:focus:border-primary-500"
            disabled={isStreaming}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 transition-colors"
              title="Stop generating"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default ChatInterface 