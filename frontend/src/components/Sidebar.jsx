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
  HardDrive,
  Sparkles
} from 'lucide-react';
import FileUploader from './FileUploader';
import { PaladinLogo } from './ui/PaladinLogo';

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
      className={`h-screen drawer-transition flex flex-col z-20 border-r border-violet-900/30 bg-[#0a0818]/95 backdrop-blur-2xl ${
        isOpen ? 'w-80' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
        {isOpen ? (
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <PaladinLogo size={28} />
            <div>
              <h1 className="text-sm font-black text-white leading-none tracking-tight">PALADIN AI</h1>
              <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase mt-0.5 block">Intelligence Guardian</span>
            </div>
          </div>
        ) : (
          <div 
            className="flex items-center justify-center mx-auto cursor-pointer"
            onClick={() => window.location.href = '/'}
            title="PALADIN AI"
          >
            <PaladinLogo size={28} />
          </div>
        )}
        
        {isOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white btn-tactile focus-ring"
            title="Collapse Sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Main Action - New Session */}
      <div className="p-4">
        {isOpen ? (
          <button
            onClick={startNewSession}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-xs shadow-lg shadow-violet-900/40 hover:shadow-violet-900/60 btn-tactile focus-ring"
          >
            <Plus size={16} />
            <span>New Analysis Session</span>
          </button>
        ) : (
          <button
            onClick={startNewSession}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-violet-900/40 btn-tactile focus-ring"
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
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center space-x-1.5">
                <HardDrive size={12} className="text-violet-400" />
                <span>Upload Data Sources</span>
              </h3>
              <FileUploader />
            </div>
          ) : (
            <div className="flex justify-center">
              <button 
                onClick={toggleSidebar}
                className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center"
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
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center space-x-1.5">
              <MessageSquare size={12} className="text-amber-400" />
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
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 font-bold shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => switchSession(sessId)}
                      className="flex-1 flex items-center space-x-2 truncate p-1.5 text-left btn-tactile focus-ring rounded-lg"
                      aria-label={`Switch to session ${sessId.replace('session_', '')}`}
                    >
                      <MessageSquare size={13} className={isActive ? 'text-amber-400 shrink-0' : 'text-slate-500 shrink-0'} />
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
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 btn-tactile focus-ring"
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
              className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center"
              title="View Chat Sessions"
            >
              <MessageSquare size={18} />
            </button>
          </div>
        )}

        {/* Uploaded Files Inventory */}
        {isOpen && (
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 flex items-center space-x-1.5">
              <span>Source Inventory ({uploadedFiles.length})</span>
            </h3>
            
            {uploadedFiles.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
                No active source data uploaded.
              </p>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start space-x-2.5 transition-all duration-200 hover:border-violet-500/30"
                  >
                    <div className="mt-0.5">
                      {file.type === 'CSV' || file.type === 'SQLITE' || file.type === 'DB' ? (
                        <Database size={16} className="text-amber-400" />
                      ) : (
                        <FileText size={16} className="text-violet-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <span className="text-[10px] text-slate-500 font-medium">
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
      <div className="p-4 border-t border-white/[0.06] flex flex-col space-y-3">
        {isOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <MessageSquare size={14} />
              <span className="truncate w-36 font-mono text-[10px]">{sessionId}</span>
            </div>
            
            <button 
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white btn-tactile focus-ring"
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
              className="w-10 h-10 rounded-xl bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white btn-tactile focus-ring flex items-center justify-center"
              aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-10 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white btn-tactile focus-ring flex items-center justify-center"
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
