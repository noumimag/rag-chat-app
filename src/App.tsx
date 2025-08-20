import React, { useState } from 'react'
import RagSidebar from './components/RagSidebar'
import RagToggle from './components/RagToggle'

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Changed to true to keep sidebar open

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* RAG Sidebar - Always open */}
      <RagSidebar 
        isOpen={true} 
        onClose={() => {}} // Empty function since we don't want to close it
      />
    </div>
  )
}

export default App 