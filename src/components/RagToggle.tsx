import React from 'react'
import { MessageSquare, X } from 'lucide-react'
import { cn } from '../lib/utils'

interface RagToggleProps {
  isOpen: boolean
  onToggle: () => void
}

const RagToggle: React.FC<RagToggleProps> = ({ isOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'rag-toggle',
        'transition-all duration-300 ease-in-out',
        isOpen && 'rotate-90'
      )}
      aria-label={isOpen ? 'Close RAG sidebar' : 'Open RAG sidebar'}
      title={isOpen ? 'Close RAG sidebar' : 'Open RAG sidebar'}
    >
      {isOpen ? (
        <X className="w-5 h-5" />
      ) : (
        <MessageSquare className="w-5 h-5" />
      )}
    </button>
  )
}

export default RagToggle 