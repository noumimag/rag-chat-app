import React, { useState } from 'react'
import { FileText, Trash2, Eye, Download, Calendar, FileType, Search, Filter, Grid, List, MoreVertical, File, FileCode, FileImage, FileArchive } from 'lucide-react'
import { cn } from '../lib/utils'
import { db } from '../lib/db'
import { Document } from '../lib/schema'
import { formatDate, formatRelativeTime, truncateText } from '../lib/utils'

interface DocumentListProps {
  documents: Document[]
  onDocumentDeleted: (documentId: string) => void
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onDocumentDeleted }) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || doc.type === filterType
    return matchesSearch && matchesType
  })

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await db.deleteDocument(documentId)
      onDocumentDeleted(documentId)
      setShowDeleteConfirm(null)
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null)
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleResetDatabase = async () => {
    if (confirm('This will delete ALL documents and data. Are you sure?')) {
      try {
        await db.resetDatabase()
        alert('Database reset successfully. Please refresh the page.')
      } catch (error) {
        console.error('Failed to reset database:', error)
        alert('Failed to reset database. Please refresh the page manually.')
      }
    }
  }

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'markdown':
      case 'mdx':
        return <FileText className="w-6 h-6 text-blue-500" />
      case 'json':
        return <FileCode className="w-6 h-6 text-green-500" />
      case 'code':
        return <FileCode className="w-6 h-6 text-purple-500" />
      case 'text':
        return <File className="w-6 h-6 text-gray-500" />
      default:
        return <File className="w-6 h-6 text-gray-500" />
    }
  }

  const getTypeLabel = (type: Document['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getSourceLabel = (source: string) => {
    if (source.startsWith('file://')) return 'File Upload'
    if (source === 'pasted_text') return 'Pasted Text'
    if (source.startsWith('api://')) return 'API Import'
    return source
  }

  const getTypeColor = (type: Document['type']) => {
    switch (type) {
      case 'markdown':
      case 'mdx':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'json':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'code':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'text':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const exportDocument = (doc: Document) => {
    const blob = new Blob([doc.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title}.${doc.type === 'markdown' ? 'md' : 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <FileText className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-3">No documents yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Upload some documents to get started with your RAG system. You can upload text files, markdown, or paste content directly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-600 mt-1">Manage and organize your documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDatabase}
              className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors duration-200"
              title="Reset database (clears all data)"
            >
              Reset Database
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents by title or content..."
              className="w-full pl-10 pr-4 py-3 border border-gray-700 bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparen transition-colors"
            />

          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200',
                  filterType === 'all'
                    ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                )}
              >
                All ({documents.length})
              </button>
              {['markdown', 'mdx', 'json', 'text', 'code'].map(type => {
                const count = documents.filter(d => d.type === type).length
                if (count === 0) return null
                
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200',
                      filterType === type
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    )}
                  >
                    {getTypeLabel(type as Document['type'])} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Documents</p>
              <p className="text-2xl font-bold text-blue-900">{documents.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Document Types</p>
              <p className="text-2xl font-bold text-green-900">
                {new Set(documents.map(d => d.type)).size}
              </p>
            </div>
            <FileType className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Storage Used</p>
              <p className="text-2xl font-bold text-purple-900">
                {Math.round(documents.reduce((acc, doc) => acc + doc.content.length, 0) / 1024)} KB
              </p>
            </div>
            <FileArchive className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Document Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className={cn(
                'group bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-300 cursor-pointer',
                selectedDocument?.id === document.id
                  ? 'ring-2 ring-primary-500 border-primary-500'
                  : ''
              )}
              onClick={() => setSelectedDocument(
                selectedDocument?.id === document.id ? null : document
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  {getDocumentIcon(document.type)}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        exportDocument(document)
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Export document"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(document.id)
                      }}
                      className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {document.title}
                </h4>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {truncateText(document.content, 120)}
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full border',
                      getTypeColor(document.type)
                    )}>
                      {getTypeLabel(document.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(document.updatedAt)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 truncate">
                    {getSourceLabel(document.source)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <div
              key={document.id}
              className={cn(
                'group bg-white rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer',
                selectedDocument?.id === document.id
                  ? 'ring-2 ring-primary-500 border-primary-500'
                  : ''
              )}
              onClick={() => setSelectedDocument(
                selectedDocument?.id === document.id ? null : document
              )}
            >
              <div className="flex items-start gap-4">
                {getDocumentIcon(document.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {document.title}
                    </h4>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          exportDocument(document)
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Export document"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(document.id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {truncateText(document.content, 150)}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className={cn(
                      'px-2 py-1 font-medium rounded-full border',
                      getTypeColor(document.type)
                    )}>
                      {getTypeLabel(document.type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatRelativeTime(document.updatedAt)}
                    </span>
                    <span className="truncate">
                      {getSourceLabel(document.source)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail View */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                {getDocumentIcon(selectedDocument.type)}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedDocument.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(selectedDocument.type)} • {getSourceLabel(selectedDocument.source)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl text-gray-500">&times;</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm font-medium text-gray-700">Type</span>
                  <p className="text-gray-900 mt-1">{getTypeLabel(selectedDocument.type)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm font-medium text-gray-700">Source</span>
                  <p className="text-gray-900 mt-1">{getSourceLabel(selectedDocument.source)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <span className="text-sm font-medium text-gray-700">Last Updated</span>
                  <p className="text-gray-900 mt-1">{formatDate(selectedDocument.updatedAt)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Content</h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                  {selectedDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Document
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600">
            No documents match your search criteria. Try adjusting your search term or filters.
          </p>
        </div>
      )}
    </div>
  )
}

export default DocumentList 