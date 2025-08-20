import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  Download,
  Calendar,
  FileType,
  Search,
  Filter,
  Grid,
  List,
  File,
  FileCode,
  FileArchive,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/db';
import { Document } from '../lib/schema';
import { formatDate, formatRelativeTime, truncateText } from '../lib/utils';

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted: (documentId: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onDocumentDeleted }) => {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await db.deleteDocument(documentId);
      onDocumentDeleted(documentId);
      setShowDeleteConfirm(null);
      if (selectedDocument?.id === documentId) {
        setSelectedDocument(null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleResetDatabase = async () => {
    if (confirm('This will delete ALL documents and data. Are you sure?')) {
      try {
        await db.resetDatabase();
        alert('Database reset successfully. Please refresh the page.');
      } catch (error) {
        console.error('Failed to reset database:', error);
        alert('Failed to reset database. Please refresh the page manually.');
      }
    }
  };

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'markdown':
      case 'mdx':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'json':
        return <FileCode className="h-6 w-6 text-green-500" />;
      case 'code':
        return <FileCode className="h-6 w-6 text-purple-500" />;
      case 'text':
        return <File className="h-6 w-6 text-gray-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: Document['type']) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getSourceLabel = (source: string) => {
    if (source.startsWith('file://')) return 'File Upload';
    if (source === 'pasted_text') return 'Pasted Text';
    if (source.startsWith('api://')) return 'API Import';
    return source;
  };

  const getTypeColor = (type: Document['type']) => {
    switch (type) {
      case 'markdown':
      case 'mdx':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'json':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'code':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'text':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const exportDocument = (doc: Document) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.${doc.type === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (documents.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="mb-3 text-xl font-semibold">No documents yet</h3>
        <p className="mx-auto max-w-md text-gray-600">
          Upload some documents to get started with your RAG system. You can upload text files,
          markdown, or paste content directly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="mt-1 text-gray-600">Manage and organize your documents</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDatabase}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 transition-colors duration-200 hover:bg-red-50"
              title="Reset database (clears all data)"
            >
              Reset Database
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-lg p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search documents by title or content..."
              className="focus:border-transparen w-full rounded-lg border border-gray-700 bg-gray-900 py-3 pl-10 pr-4 transition-colors focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200',
                  filterType === 'all'
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                )}
              >
                All ({documents.length})
              </button>
              {['markdown', 'mdx', 'json', 'text', 'code'].map(type => {
                const count = documents.filter(d => d.type === type).length;
                if (count === 0) return null;

                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200',
                      filterType === type
                        ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    )}
                  >
                    {getTypeLabel(type as Document['type'])} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Documents</p>
              <p className="text-2xl font-bold text-blue-900">{documents.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Document Types</p>
              <p className="text-2xl font-bold text-green-900">
                {new Set(documents.map(d => d.type)).size}
              </p>
            </div>
            <FileType className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Storage Used</p>
              <p className="text-2xl font-bold text-purple-900">
                {Math.round(documents.reduce((acc, doc) => acc + doc.content.length, 0) / 1024)} KB
              </p>
            </div>
            <FileArchive className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Document Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map(document => (
            <div
              key={document.id}
              className={cn(
                'group cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-lg',
                selectedDocument?.id === document.id
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : ''
              )}
              onClick={() =>
                setSelectedDocument(selectedDocument?.id === document.id ? null : document)
              }
            >
              <div className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  {getDocumentIcon(document.type)}
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        exportDocument(document);
                      }}
                      className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                      title="Export document"
                    >
                      <Download className="h-4 w-4 text-gray-500" />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowDeleteConfirm(document.id);
                      }}
                      className="rounded-lg p-1.5 transition-colors hover:bg-red-100"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <h4 className="mb-2 line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
                  {document.title}
                </h4>

                <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                  {truncateText(document.content, 120)}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-medium',
                        getTypeColor(document.type)
                      )}
                    >
                      {getTypeLabel(document.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(document.updatedAt)}
                    </span>
                  </div>

                  <div className="truncate text-xs text-gray-500">
                    {getSourceLabel(document.source)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(document => (
            <div
              key={document.id}
              className={cn(
                'group cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-md',
                selectedDocument?.id === document.id
                  ? 'border-primary-500 ring-2 ring-primary-500'
                  : ''
              )}
              onClick={() =>
                setSelectedDocument(selectedDocument?.id === document.id ? null : document)
              }
            >
              <div className="flex items-start gap-4">
                {getDocumentIcon(document.type)}

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between">
                    <h4 className="font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
                      {document.title}
                    </h4>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          exportDocument(document);
                        }}
                        className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                        title="Export document"
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </button>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowDeleteConfirm(document.id);
                        }}
                        className="rounded-lg p-1.5 transition-colors hover:bg-red-100"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                    {truncateText(document.content, 150)}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 font-medium',
                        getTypeColor(document.type)
                      )}
                    >
                      {getTypeLabel(document.type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatRelativeTime(document.updatedAt)}
                    </span>
                    <span className="truncate">{getSourceLabel(document.source)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail View */}
      {selectedDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-3">
                {getDocumentIcon(selectedDocument.type)}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedDocument.title}</h3>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(selectedDocument.type)} •{' '}
                    {getSourceLabel(selectedDocument.source)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-200"
              >
                <span className="sr-only">Close</span>
                <span className="text-2xl text-gray-500">&times;</span>
              </button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-700">Type</span>
                  <p className="mt-1 text-gray-900">{getTypeLabel(selectedDocument.type)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-700">Source</span>
                  <p className="mt-1 text-gray-900">{getSourceLabel(selectedDocument.source)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <span className="text-sm font-medium text-gray-700">Last Updated</span>
                  <p className="mt-1 text-gray-900">{formatDate(selectedDocument.updatedAt)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <h4 className="mb-3 text-sm font-medium text-gray-700">Content</h4>
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
                  {selectedDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Document</h3>
            </div>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="py-12 text-center text-gray-500">
          <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">No documents found</h3>
          <p className="text-gray-600">
            No documents match your search criteria. Try adjusting your search term or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
