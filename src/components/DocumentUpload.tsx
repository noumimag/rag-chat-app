import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Plus, X, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { db } from '../lib/db'
import { Document } from '../lib/schema'
import { 
  isValidFileType, 
  readFileAsText, 
  readFileAsJson, 
  extractTitleFromContent,
  cleanText 
} from '../lib/utils'

interface DocumentUploadProps {
  onDocumentAdded: () => void
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onDocumentAdded }) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('Processing files...')

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (!isValidFileType(file.name)) {
          setUploadStatus(`Skipping ${file.name} - unsupported file type`)
          continue
        }

        setUploadStatus(`Processing ${file.name}...`)
        
        let content: string
        let documentType: Document['type']

        if (isMarkdownFile(file.name)) {
          content = await readFileAsText(file)
          documentType = 'markdown'
        } else if (isJsonFile(file.name)) {
          const jsonData = await readFileAsJson(file)
          content = JSON.stringify(jsonData, null, 2)
          documentType = 'json'
        } else {
          content = await readFileAsText(file)
          documentType = 'text'
        }

        // Clean and process content
        content = cleanText(content)
        
        if (content.length < 50) {
          setUploadStatus(`Skipping ${file.name} - content too short`)
          continue
        }

        // Create document
        const document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
          title: file.name,
          content,
          type: documentType,
          source: `file://${file.name}`,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedAt: new Date().toISOString()
          }
        }

        // Add document to database
        const documentId = await db.addDocument(document)
        
        // Process with worker for chunking and embeddings
        await processDocumentWithWorker(documentId, document)
        
        setUploadProgress(((i + 1) / files.length) * 100)
      }

      setUploadStatus('Upload complete!')
      onDocumentAdded()
      
      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadStatus('')
        setUploadProgress(0)
      }, 3000)
    }
  }, [onDocumentAdded])

  const processDocumentWithWorker = async (documentId: string, document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        workerRef.current = new Worker(new URL('../workers/ingest.worker.ts', import.meta.url), {
          type: 'module'
        })
      }

      const worker = workerRef.current
      
      worker.onmessage = async (event) => {
        console.log('Worker message received:', event.data)
        const { type, chunks, vectors } = event.data
        
        if (type === 'ingest_data') {
          try {
            console.log('Processing ingest data:', { chunks: chunks.length, vectors: vectors.length })
            // Add chunks to database (they already have IDs from the worker)
            await db.addChunks(chunks)
            
            // Add vectors to database (they already have chunk IDs from the worker)
            await db.addVectors(vectors)
            
            resolve()
          } catch (error) {
            console.error('Error processing worker data:', error)
            reject(error)
          }
        } else if (type === 'error') {
          reject(new Error(event.data.error))
        }
      }

      worker.onerror = (error) => {
        reject(error)
      }

      // Send document to worker
      worker.postMessage({
        type: 'ingest',
        document: { 
          id: documentId, 
          title: document.title,
          content: document.content,
          type: document.type,
          source: document.source,
          metadata: document.metadata
        },
        chunkSize: 1000,
        overlap: 200
      })
    })
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !textTitle.trim()) return

    setIsUploading(true)
    setUploadStatus('Processing text...')

    try {
      const content = cleanText(textInput)
      
      const document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
        title: textTitle,
        content,
        type: 'text',
        source: 'pasted_text',
        metadata: {
          inputMethod: 'pasted_text',
          contentLength: content.length,
          submittedAt: new Date().toISOString()
        }
      }

      const documentId = await db.addDocument(document)
      await processDocumentWithWorker(documentId, document)
      
      setUploadStatus('Text added successfully!')
      onDocumentAdded()
      
      // Reset form
      setTextInput('')
      setTextTitle('')
      
    } catch (error) {
      console.error('Text submission failed:', error)
      setUploadStatus(`Failed to add text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadStatus('')
      }, 3000)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const isMarkdownFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ['md', 'markdown', 'mdx'].includes(ext || '')
  }

  const isJsonFile = (filename: string): boolean => {
    return filename.split('.').pop()?.toLowerCase() === 'json'
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('file')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'file'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          File Upload
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'text'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Paste Text
        </button>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 m-2 text-center hover:border-primary-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="text-sm text-gray-400 mb-4">
            <p className="font-medium">Drop files here or click to browse</p>
            <p className="text-xs mt-1">Supports Markdown, MDX, JSON, and text files</p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.markdown,.mdx,.json,.txt,.text"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Processing...
              </>
            ) : (
              'Choose Files'
            )}
          </button>
        </div>
      )}

      {/* Text Input Tab */}
      {activeTab === 'text' && (
        <div className="space-y-4 px-2">
          <div>
            <label htmlFor="text-title" className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              id="text-title"
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Enter a title for your text"
              className="w-full px-3 py-2 border border-gray-700 bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="text-content" className="block text-sm font-medium mb-2">
              Content
            </label>
            <textarea
              id="text-content"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste or type your content here..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-700 bg-gray-900 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || !textTitle.trim() || isUploading}
            className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Adding Text...
              </>
            ) : (
              'Add Text'
            )}
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Processing...</span>
            <span className="text-sm text-blue-600">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {uploadStatus && (
            <p className="text-sm text-blue-700 mt-2">{uploadStatus}</p>
          )}
        </div>
      )}

      {/* Upload Status */}
      {!isUploading && uploadStatus && (
        <div className={cn(
          'border rounded-lg p-4',
          uploadStatus.includes('failed') || uploadStatus.includes('Failed')
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-green-50 border-green-200 text-green-800'
        )}>
          <p className="text-sm">{uploadStatus}</p>
        </div>
      )}
    </div>
  )
}

export default DocumentUpload 