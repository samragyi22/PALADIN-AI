import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ChartRenderer from '../components/ChartRenderer';

export const WorkspaceConsole = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-darkBg">
      {/* Sidebar (Column 1) */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Workspace: Chat (Column 2) */}
      <ChatWindow />
      
      {/* Right Panel: Analytics Chart (Column 3) */}
      <ChartRenderer />
    </div>
  );
};
