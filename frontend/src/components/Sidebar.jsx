import React, { useContext } from 'react';
import { ApiContext } from '../context/ApiContext';
import { 
  Plus, 
  FileText, 
  Database, 
  Trash2, 
  Sun, 
  Moon, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import FileUploader from './FileUploader';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const {
    uploadedFiles,
    theme,
    toggleTheme,
    startNewSession,
    sessionId,
    sessions,
    switchSession,
    deleteSession
  } = useContext(ApiContext);

  return (
    <div 
      className={`glass-premium h-screen drawer-transition flex flex-col z-20 border-r border-slate-200/50 dark:border-slate-800/50 ${
        isOpen ? 'w-80' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        {isOpen ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electricIndigo to-routePurple flex items-center justify-center font-bold text-white shadow-lg shadow-electricIndigo/30">
              EA
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">Enterprise AI</h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">Analyst Console</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-electricIndigo to-routePurple flex items-center justify-center font-bold text-white mx-auto shadow-md">
            EA
          </div>
        )}
        
        {isOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-tactile focus-ring"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Main Action - New Session */}
      <div className="p-4">
        {isOpen ? (
          <button
            onClick={startNewSession}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-electricIndigo hover:bg-indigo-600 text-white font-medium shadow-md shadow-electricIndigo/20 hover:shadow-lg text-sm btn-tactile focus-ring"
          >
            <Plus size={16} />
            <span>New Session</span>
          </button>
        ) : (
          <button
            onClick={startNewSession}
            className="w-10 h-10 rounded-xl bg-electricIndigo hover:bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md btn-tactile focus-ring"
            title="New Session"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {/* Scrollable File Inventory & Upload */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 py-2">
        {/* File Uploader */}
        <div>
          {isOpen ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <HardDrive size={12} />
                <span>Upload Sources</span>
              </h3>
              <FileUploader />
            </div>
          ) : (
            <div className="flex justify-center">
              <button 
                onClick={toggleSidebar}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
                title="Upload Source File"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Conversations History List */}
        {isOpen ? (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
              <MessageSquare size={12} />
              <span>Conversation History</span>
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {sessions.map((sessId) => {
                const isActive = sessId === sessionId;
                return (
                  <div
                    key={sessId}
                    className={`group flex items-center justify-between p-1 rounded-xl border text-xs transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-electricIndigo font-bold shadow-sm'
                        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100/60 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => switchSession(sessId)}
                      className="flex-1 flex items-center space-x-2 truncate p-1.5 text-left btn-tactile focus-ring rounded-lg"
                      aria-label={`Switch to session ${sessId.replace('session_', '')}`}
                    >
                      <MessageSquare size={13} className={isActive ? 'text-electricIndigo shrink-0' : 'text-slate-400 shrink-0'} />
                      <span className="truncate max-w-[140px] font-mono text-[10px]">
                        {sessId.replace('session_', 'Session: ')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(sessId);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 btn-tactile focus-ring"
                      aria-label={`Delete conversation session ${sessId.replace('session_', '')}`}
                      title="Delete Conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              title="View Chat Sessions"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        )}

        {/* Uploaded Files Inventory */}
        {isOpen && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              Source Inventory ({uploadedFiles.length})
            </h3>
            
            {uploadedFiles.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                No active source data uploaded.
              </p>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 flex items-start space-x-2.5 transition-all duration-200 hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div className="mt-0.5">
                      {file.type === 'CSV' || file.type === 'SQLITE' || file.type === 'DB' ? (
                        <Database size={16} className="text-routeCoral" />
                      ) : (
                        <FileText size={16} className="text-routeTeal" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        {file.type} • {file.size}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Settings & Toggles */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col space-y-3">
        {isOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500">
              <MessageSquare size={14} />
              <span className="truncate w-36 font-mono text-[10px]">{sessionId}</span>
            </div>
            
            <button 
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 btn-tactile focus-ring"
              aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <button 
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 btn-tactile focus-ring flex items-center justify-center"
              aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 btn-tactile focus-ring flex items-center justify-center"
              aria-label="Expand Sidebar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
