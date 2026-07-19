import React, { useState } from 'react';
import { ApiProvider } from './context/ApiContext';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ChartRenderer from './components/ChartRenderer';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ApiProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-darkBg">
        {/* Sidebar (Column 1) */}
        <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main Workspace: Chat (Column 2) */}
        <ChatWindow />
        
        {/* Right Panel: Analytics Chart (Column 3) */}
        <ChartRenderer />
      </div>
    </ApiProvider>
  );
}

export default App;
