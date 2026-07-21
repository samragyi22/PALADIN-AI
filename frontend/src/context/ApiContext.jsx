import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Set global API base URL for deployment environments (split backend/frontend)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Auto-attach X-CSRF-Token header from the csrf_token cookie on every
// state-changing request. This satisfies the backend CSRF double-submit check
// without manually threading the token through every component.
axios.interceptors.request.use((config) => {
  const method = (config.method || '').toLowerCase();
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    const match = document.cookie.match(/(^|;\s*)csrf_token=([^;]+)/);
    const token = match ? decodeURIComponent(match[2]) : null;
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});


export const ApiContext = createContext();

export const ApiProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [theme, setTheme] = useState('dark');
  const [activeChartConfig, setActiveChartConfig] = useState(null);
  const [analyticsPanelOpen, setAnalyticsPanelOpen] = useState(true);

  // Load state and restore session lists
  useEffect(() => {
    // 1. Session management initialization
    const savedSessions = JSON.parse(localStorage.getItem('enterprise_sessions') || '[]');
    let activeSess = localStorage.getItem('session_id');
    
    if (!activeSess) {
      activeSess = `session_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('session_id', activeSess);
    }
    
    // Add active to list if not already there
    const updatedSessions = savedSessions.includes(activeSess) 
      ? savedSessions 
      : [...savedSessions, activeSess];
      
    setSessions(updatedSessions);
    setSessionId(activeSess);
    localStorage.setItem('enterprise_sessions', JSON.stringify(updatedSessions));

    // 2. Restore active session's messages
    const savedMessages = JSON.parse(localStorage.getItem(`messages_${activeSess}`) || '[]');
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    } else {
      setMessages([
        {
          sender: 'system',
          text: 'New session started. Upload files and ask questions to begin.',
          timestamp: new Date().toLocaleTimeString(),
        }
      ]);
    }

    // 3. Restore active session's uploaded files list
    const savedFiles = JSON.parse(localStorage.getItem(`files_${activeSess}`) || '[]');
    setUploadedFiles(savedFiles);

    // 4. Restore active chart if applicable
    const lastChart = savedMessages.find(m => m.sender === 'bot' && m.chart_config)?.chart_config;
    if (lastChart) {
      setActiveChartConfig(lastChart);
    }

    // 5. Theme restoration
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // Initial system notification for uploading
    setMessages((prev) => [
      ...prev,
      {
        sender: 'system',
        text: `Uploading and processing "${file.name}"...`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileId = response.data.file_id;
      
      // Poll background status
      let pollCount = 0;
      const maxPolls = 60; // 60 seconds timeout
      let completed = false;
      let errorMsg = null;

      while (pollCount < maxPolls && !completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        pollCount++;

        try {
          const statusRes = await axios.get(`/api/upload/status/${fileId}`);
          if (statusRes.data.status === 'completed') {
            completed = true;
          } else if (statusRes.data.status === 'failed') {
            completed = true;
            errorMsg = statusRes.data.error || 'Ingestion failed.';
          }
        } catch (pollErr) {
          console.error('Error polling status:', pollErr);
        }
      }

      if (errorMsg) {
        throw new Error(errorMsg);
      }
      if (!completed) {
        throw new Error('Upload processing timed out.');
      }

      const newFile = {
        id: fileId || Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.name.split('.').pop().toUpperCase(),
      };

      setUploadedFiles((prev) => {
        const updated = [...prev, newFile];
        localStorage.setItem(`files_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
      
      // Add a system notification in the chat
      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            sender: 'system',
            text: `File "${file.name}" successfully indexed and ready for analysis.`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
        localStorage.setItem(`messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Upload failed:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Failed to upload file.';
      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            sender: 'system',
            isError: true,
            text: `Upload/Ingestion failed: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
        localStorage.setItem(`messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
      return { success: false, error: errMsg };
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      localStorage.setItem(`messages_${sessionId}`, JSON.stringify(updated));
      return updated;
    });
    setLoading(true);
    setLoadingMessage('Routing query intent...');

    // Dynamic loading messages to simulate the state machine
    const messagesSequence = [
      'Rewriting query context & intent...',
      'Retrieving documents & computing similarity search...',
      'Synthesizing database queries & schemas...',
      'Validating SQL query safety using AST rules...',
      'Executing SQL data queries...',
      'Merging documents and database responses...',
      'Generating custom Recharts visualization configurations...',
      'Evaluating answer faithfulness & relevancy metrics...'
    ];

    let seqIndex = 0;
    const interval = setInterval(() => {
      if (seqIndex < messagesSequence.length) {
        setLoadingMessage(messagesSequence[seqIndex]);
        seqIndex++;
      }
    }, 1200);

    try {
      const activeFileNames = uploadedFiles.map(f => f.name);
      const response = await axios.post('/api/chat', {
        query: text,
        session_id: sessionId,
        active_files: activeFileNames,
      });

      clearInterval(interval);

      const botMessage = {
        sender: 'bot',
        text: response.data.answer,
        citations: response.data.citations || [],
        sql_query: response.data.sql_query,
        sql_results: response.data.sql_results,
        metrics: response.data.evaluation_metrics,
        timestamp: new Date().toLocaleTimeString(),
        chart_config: response.data.chart_config
      };

      setMessages((prev) => {
        const updated = [...prev, botMessage];
        localStorage.setItem(`messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });

      if (response.data.chart_config) {
        setActiveChartConfig(response.data.chart_config);
        setAnalyticsPanelOpen(true); // Auto-open panel
      } else {
        setActiveChartConfig(null);
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Chat error:', error);
      const errMsg = error.response?.data?.detail || 'An error occurred while generating a response.';
      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            sender: 'bot',
            isError: true,
            text: `Error: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
        localStorage.setItem(`messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
      setActiveChartConfig(null);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const exportPdf = () => {
    window.open(`/api/export-pdf?session_id=${sessionId}`, '_blank');
  };

  const startNewSession = () => {
    const newSession = `session_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to persisted session lists
    setSessions((prev) => {
      const updated = [...prev, newSession];
      localStorage.setItem('enterprise_sessions', JSON.stringify(updated));
      return updated;
    });

    setSessionId(newSession);
    localStorage.setItem('session_id', newSession);
    
    const defaultMessages = [
      {
        sender: 'system',
        text: 'New session started. Upload files and ask questions to begin.',
        timestamp: new Date().toLocaleTimeString(),
      }
    ];
    setMessages(defaultMessages);
    localStorage.setItem(`messages_${newSession}`, JSON.stringify(defaultMessages));
    
    setUploadedFiles([]);
    localStorage.setItem(`files_${newSession}`, JSON.stringify([]));
    
    setActiveChartConfig(null);
  };

  const switchSession = async (targetSessionId) => {
    if (!targetSessionId) return;
    setLoading(true);
    setLoadingMessage('Loading chat history...');

    try {
      // 1. Fetch session logs from backend if available
      const response = await axios.get(`/api/session/${targetSessionId}`);
      const history = response.data.history || [];
      
      let restoredMessages = [];
      if (history.length > 0) {
        // Map backend history format back to chat messages structure
        history.forEach((turn) => {
          restoredMessages.push({
            sender: 'user',
            text: turn.query,
            timestamp: turn.timestamp || 'Past'
          });
          restoredMessages.push({
            sender: 'bot',
            text: turn.answer,
            citations: turn.citations || [],
            sql_query: turn.sql_query,
            sql_results: turn.sql_results,
            chart_config: turn.chart_config,
            timestamp: turn.timestamp || 'Past'
          });
        });
      }

      // If backend has no history, check local storage
      if (restoredMessages.length === 0) {
        const localMessages = JSON.parse(localStorage.getItem(`messages_${targetSessionId}`) || '[]');
        if (localMessages.length > 0) {
          restoredMessages = localMessages;
        } else {
          restoredMessages = [
            {
              sender: 'system',
              text: 'Active session loaded. Ask questions to begin.',
              timestamp: new Date().toLocaleTimeString(),
            }
          ];
        }
      }

      setMessages(restoredMessages);
      localStorage.setItem(`messages_${targetSessionId}`, JSON.stringify(restoredMessages));

      // 2. Load target files
      const savedFiles = JSON.parse(localStorage.getItem(`files_${targetSessionId}`) || '[]');
      setUploadedFiles(savedFiles);

      // 3. Set active chart
      const lastChart = restoredMessages.find(m => m.sender === 'bot' && m.chart_config)?.chart_config;
      if (lastChart) {
        setActiveChartConfig(lastChart);
        setAnalyticsPanelOpen(true); // Auto-open panel
      } else {
        setActiveChartConfig(null);
      }

      setSessionId(targetSessionId);
      localStorage.setItem('session_id', targetSessionId);

    } catch (err) {
      console.error('Failed to switch sessions:', err);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const deleteSession = (sessIdToDelete) => {
    if (sessions.length <= 1) {
      // Don't delete the last remaining session, just clear it
      startNewSession();
      return;
    }

    setSessions((prev) => {
      const updated = prev.filter(s => s !== sessIdToDelete);
      localStorage.setItem('enterprise_sessions', JSON.stringify(updated));
      return updated;
    });

    // Remove local storage items
    localStorage.removeItem(`messages_${sessIdToDelete}`);
    localStorage.removeItem(`files_${sessIdToDelete}`);

    // If we deleted the active session, switch to another one
    if (sessionId === sessIdToDelete) {
      const remaining = sessions.filter(s => s !== sessIdToDelete);
      switchSession(remaining[0]);
    }
  };

  return (
    <ApiContext.Provider
      value={{
        sessionId,
        sessions,
        messages,
        uploadedFiles,
        isUploading,
        loading,
        loadingMessage,
        theme,
        activeChartConfig,
        analyticsPanelOpen,
        setAnalyticsPanelOpen,
        toggleTheme,
        uploadFile,
        sendMessage,
        exportPdf,
        startNewSession,
        switchSession,
        deleteSession,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};
