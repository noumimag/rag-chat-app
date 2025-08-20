import React, { useState, useEffect } from 'react'
import { MessageCircle, Upload, FileText, Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import { Document } from '../lib/schema'
import { db } from '../lib/db'
import DocumentUpload from './DocumentUpload'
import ChatInterface from './ChatInterface'
import DocumentList from './DocumentList'

interface RagSidebarProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'chat' | 'upload' | 'documents'

const RagSidebar: React.FC<RagSidebarProps> = ({ isOpen }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat') // Chat is default
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({ totalDocuments: 0, totalChunks: 0, totalSize: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Load documents and stats on mount
  useEffect(() => {
    loadDocuments()
    loadStats()
  }, [])

  const loadDocuments = async () => {
    try {
      const docs = await db.getAllDocuments()
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const loadStats = async () => {
    try {
      const statsData = await db.getStats()
      setStats({ 
        totalDocuments: statsData.documents, 
        totalChunks: statsData.chunks, 
        totalSize: statsData.vectors 
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleDocumentAdded = async () => {
    await loadDocuments()
    await loadStats()
    setShowUploadModal(false)
    setActiveTab('chat') // Return to chat after upload
  }

  const handleDocumentDeleted = async (documentId: string) => {
    await loadDocuments()
    await loadStats()
  }

  const menuItems = [
    { 
      id: 'chat' as TabType, 
      label: 'Chat', 
      icon: MessageCircle, 
      description: 'Ask anything about your documents',
      badge: null
    },
    { 
      id: 'upload' as TabType, 
      label: 'Upload', 
      icon: Upload, 
      description: 'Add new documents',
      badge: null
    },
    { 
      id: 'documents' as TabType, 
      label: 'Documents', 
      icon: FileText, 
      description: 'Manage your documents',
      badge: documents.length > 0 ? documents.length.toString() : null
    }
  ]

  return (
    <div className="rag-sidebar">
      <div className="rag-content">
        <div className="rag-header">
          <h1 className="text-xl font-bold text-white mb-2">RAG Assistant</h1>
          <p className="text-sm text-gray-400">Your personal AI research assistant</p>
        </div>
        
        <div className="rag-body">
          {/* Vertical Navigation using Tailwind design */}
          <nav className="space-y-2 p-3">
            {menuItems.map((item) => (
              <a
                key={item.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveTab(item.id)
                }}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  activeTab === item.id
                    ? 'bg-gray-800 text-white border-l-4 border-primary-500'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                )}
              >
                <item.icon 
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    activeTab === item.id ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
                  )} 
                  aria-hidden="true" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    'text-xs truncate',
                    activeTab === item.id ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-400'
                  )}>
                    {item.description}
                  </p>
                </div>
              </a>
            ))}
          </nav>

          {/* Stats Section */}
          <div className="mt-8 px-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Documents</span>
                <span className="font-medium text-white">{stats.totalDocuments}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Chunks</span>
                <span className="font-medium text-white">{stats.totalChunks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Storage</span>
                <span className="font-medium text-white">{stats.totalSize}</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Main Content Area */}
      <div className="chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'chat' && 'Chat with RAG'}
              {activeTab === 'upload' && 'Upload Documents'}
              {activeTab === 'documents' && 'Document Library'}
            </h2>
            
            {/* Chat Actions */}
            {activeTab === 'chat' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Clear chat functionality
                    if (window.confirm('Are you sure you want to clear the chat history?')) {
                      // This will be handled by the ChatInterface component
                      window.dispatchEvent(new CustomEvent('clearChat'))
                    }
                  }}
                  className="px-3 py-2 text-gray-400 hover:text-gray-100 transition-colors text-sm"
                >
                  Clear Chat
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Documents
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' && (
            <ChatInterface />
          )}
          
          {activeTab === 'upload' && (
            <div className="p-6">
              <DocumentUpload onDocumentAdded={handleDocumentAdded} />
            </div>
          )}
          
          {activeTab === 'documents' && (
            <div className="p-6">
              <DocumentList 
                documents={documents} 
                onDocumentDeleted={handleDocumentDeleted}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal for Chat Tab */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Documents</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <DocumentUpload onDocumentAdded={handleDocumentAdded} />
          </div>
        </div>
      )}
    </div>
  )
}

export default RagSidebar 