import React from 'react';
import RagSidebar from './components/RagSidebar';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* RAG Sidebar - Always open */}
      <RagSidebar />
    </div>
  );
}

export default App;
