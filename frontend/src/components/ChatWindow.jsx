import React, { useContext, useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { ApiContext } from '../context/ApiContext';
import { 
  Send, 
  Download, 
  Terminal, 
  BookOpen, 
  BrainCircuit, 
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Mic,
  MicOff,
  BarChart3,
  Plus
} from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  "Calculate my total percentage",
  "Which subject do I need to improve the most?",
  "Show a summary of my uploaded document",
  "What is the roll number of Kartik Bhardwaj?",
  "Who issued this certificate?",
  "Calculate my average grade score",
  "Show top 5 records from database",
  "List all subjects on my marksheet",
  "What are the key achievements in Nexume?",
  "Explain IntelliJudge project duration and details"
];

const ChatWindow = () => {
  const {
    messages,
    sendMessage,
    loading,
    loadingMessage,
    exportPdf,
    analyticsPanelOpen,
    setAnalyticsPanelOpen,
    uploadFile,
    isUploading
  } = useContext(ApiContext);

  const [input, setInput] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      e.target.value = ''; // Reset selection
    }
  };

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      console.log("[Voice] 5s silence detected, stopping...");
      stopRecording();
    }, 5000);
  };

  const startRecording = async () => {
    setInput('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsRecording(true);
          resetSilenceTimer();
        };

        rec.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          const transcript = finalTranscript + interimTranscript;
          if (transcript.trim()) {
            setInput(transcript);
            resetSilenceTimer();
          }
        };

        rec.onerror = (e) => {
          console.error("Speech recognition error:", e);
        };

        rec.onend = () => {
          setIsRecording(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.error("Failed to start SpeechRecognition:", err);
        fallbackAudioRecording();
      }
    } else {
      fallbackAudioRecording();
    }
  };

  const fallbackAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Transcription failed.');
          }

          const data = await response.json();
          if (data.text) {
            setInput(data.text);
          }
        } catch (error) {
          console.error("Failed to transcribe:", error);
          alert("Transcription failed. Please check mic permissions.");
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      console.error("Mic access denied:", err);
      alert("Microphone access denied. Please verify browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
    setFilteredSuggestions([]);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50 dark:bg-darkBg">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between glass">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <BrainCircuit size={18} className="text-electricIndigo" />
            <span>AI Analyst Workspace</span>
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase">
            Active Multi-Agent Orchestration
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!analyticsPanelOpen && (
            <button
              onClick={() => setAnalyticsPanelOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-electricIndigo border border-indigo-500/20 text-xs font-semibold shadow-sm animate-fade-in btn-tactile focus-ring"
              title="Show Analytics Panel"
            >
              <BarChart3 size={14} />
              <span>Show Analytics</span>
            </button>
          )}

          <button
            onClick={exportPdf}
            className="flex items-center space-x-1.5 py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold btn-tactile focus-ring"
            title="Export Session as PDF"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-electricIndigo/20 to-routePurple/20 flex items-center justify-center text-electricIndigo shadow-inner">
              <BrainCircuit size={36} className="glow-indigo" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Welcome to Enterprise AI Analyst
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Ask analytical questions across documents or tabular database files. The state machine will automatically route your query, fetch contexts, execute SQL, and generate charts.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}

        {/* Shimmer loaders based on active execution nodes */}
        {loading && (
          <div className="flex items-start space-x-3 max-w-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-electricIndigo shrink-0 animate-pulse">
              <Activity size={16} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1526]/50 border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden">
                <div className="shimmer absolute inset-0"></div>
                <p className="text-xs font-medium text-electricIndigo dark:text-indigo-400 animate-pulse flex items-center space-x-2">
                  <span>{loadingMessage}</span>
                </p>
                <div className="space-y-1.5 mt-2">
                  <div className="h-2 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 glass relative">
        {isRecording && (
          <div className="absolute left-4 right-4 -top-12 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500/20 to-pink-500/20 dark:from-rose-500/10 dark:to-pink-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-between shadow-lg backdrop-blur-md z-20 animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-bold tracking-wider uppercase select-none">Microphone Listening Live</span>
            </div>
            <div className="flex items-center space-x-1 select-none">
              <span className="w-0.5 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-0.5 h-4.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              <span className="w-0.5 h-2 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-0.5 h-4 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              <span className="w-0.5 h-2.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
            </div>
            <span className="text-[9px] font-semibold opacity-90 select-none">Pause 5s or click mic to stop</span>
          </div>
        )}
        {/* Auto-complete suggestions list */}
        {filteredSuggestions.length > 0 && (
          <div className="absolute left-4 right-4 bottom-16 bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100 dark:divide-slate-800/40 backdrop-blur-md">
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  setFilteredSuggestions([]);
                }}
                className="w-full text-left px-3 py-2 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors font-medium flex items-center space-x-2"
              >
                <span className="text-electricIndigo">✨</span>
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center w-full gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.docx,.csv,.sqlite,.db,.png,.jpg,.jpeg"
          />
          {/* Add file button container */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              disabled={loading || isUploading}
              aria-label="Upload photos and files"
              className={`p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm transition-all shrink-0 flex items-center justify-center btn-tactile focus-ring ${
                isUploading ? 'animate-pulse bg-indigo-500/10 border-indigo-500/20 text-electricIndigo' : 'bg-white dark:bg-[#0E1526]/50'
              }`}
              title="Upload photos & files"
            >
              <Plus size={14} />
            </button>

            {/* Custom upload popover menu */}
            {showUploadMenu && (
              <div className="absolute left-0 bottom-14 w-60 bg-white dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-1.5 animate-fade-in border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors btn-tactile focus-ring"
                >
                  <Plus size={14} className="text-electricIndigo shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Add photos & files</span>
                    <span className="text-[9px] text-slate-400 font-normal">Upload from computer</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val.trim()) {
                  const matches = PROMPT_SUGGESTIONS.filter(
                    s => s.toLowerCase().includes(val.toLowerCase()) && 
                         s.toLowerCase() !== val.toLowerCase()
                  );
                  setFilteredSuggestions(matches);
                } else {
                  setFilteredSuggestions([]);
                }
              }}
              placeholder={isRecording ? "Listening... start speaking now" : (loading ? "Executing state graph..." : "Ask questions like 'Show me orders over $500' or 'Summarize cancellation rules'...")}
              disabled={loading}
              readOnly={isRecording}
              className="w-full pl-4 pr-20 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526]/50 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-electricIndigo dark:focus:border-electricIndigo focus-ring shadow-sm transition-all placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
            />
            <div className="absolute right-2 flex items-center space-x-1.5">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading}
                aria-label={isRecording ? "Stop recording voice question" : "Record voice question"}
                className={`p-2 rounded-lg transition-all border btn-tactile focus-ring ${
                  isRecording 
                    ? 'bg-rose-500 text-white animate-pulse border-rose-600' 
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200/20'
                }`}
                title={isRecording ? "Stop recording" : "Record voice question"}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                type="submit"
                disabled={loading || isRecording || !input.trim()}
                aria-label="Send message"
                className="p-2 rounded-lg bg-electricIndigo text-white hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-electricIndigo transition-all btn-tactile focus-ring"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const { sendMessage, loading } = useContext(ApiContext);
  const [citationsOpen, setCitationsOpen] = useState(false);

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className={`py-1.5 px-4 rounded-full border text-[11px] font-semibold text-center ${
          message.isError 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400'
            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
        }`}>
          {message.text}
        </div>
      </div>
    );
  }

  // Parse follow-up questions from response to make them interactive buttons
  let mainContent = message.text;
  let suggestions = [];

  if (!isUser) {
    const parts = message.text.split(/### 💬 You Can Also Ask|### You Can Also Ask|\*\*You Can Also Ask\*\*|You Can Also Ask/i);
    if (parts.length > 1) {
      mainContent = parts[0];
      const suggestionPart = parts[1];
      const matches = suggestionPart.match(/-\s*["']?([^"\n\r]+)["']?/g);
      if (matches) {
        suggestions = matches.map(m => m.replace(/^-\s*["']?|["']?$/g, '').trim());
      }
    }
  }

  return (
    <div className={`flex items-start space-x-3 animate-message-entry ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-md ${
          message.isError
            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            : 'bg-gradient-to-tr from-electricIndigo to-routePurple text-white'
        }`}>
          {message.isError ? <AlertTriangle size={16} /> : <BrainCircuit size={16} />}
        </div>
      )}

      <div className={`max-w-xl space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`p-4 rounded-2xl border shadow-sm ${
          isUser 
            ? 'bg-electricIndigo border-indigo-600 text-white rounded-tr-none' 
            : message.isError
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-tl-none'
              : 'bg-white dark:bg-[#0E1526]/50 border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-200 rounded-tl-none'
        }`}>
          {/* Answer Text */}
          <div className="text-xs leading-relaxed font-normal">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                ul: ({node, ...props}) => <ul className={`list-disc pl-4 my-2 space-y-1 ${isUser ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`} {...props} />,
                ol: ({node, ...props}) => <ol className={`list-decimal pl-4 my-2 space-y-1 ${isUser ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`} {...props} />,
                li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                h1: ({node, ...props}) => <h1 className={`text-sm font-bold mt-3 mb-1 ${isUser ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`} {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-xs font-bold mt-3 mb-1 ${isUser ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`} {...props} />,
                h3: ({node, ...props}) => <h3 className={`text-xs font-semibold mt-3 mb-1 ${isUser ? 'text-white' : 'text-indigo-400 dark:text-indigo-300'}`} {...props} />,
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                strong: ({node, ...props}) => <strong className={`font-bold ${isUser ? 'text-white' : 'text-slate-900 dark:text-white'}`} {...props} />,
                code: ({node, ...props}) => <code className={`px-1 py-0.5 rounded font-mono text-[10px] ${isUser ? 'bg-indigo-600/50 text-white' : 'bg-slate-100 dark:bg-slate-900'}`} {...props} />,
                // Highlighted key results — rendered when LLM wraps answer in <mark> tags
                mark: ({node, ...props}) => (
                  <mark
                    style={{
                      background: 'linear-gradient(120deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#1c1917',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)',
                      fontSize: '0.8rem',
                    }}
                    {...props}
                  />
                ),
                // Table rendering — requires remark-gfm
                table: ({node, ...props}) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full border-collapse text-[11px] text-left" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-slate-100 dark:bg-slate-800/80" {...props} />,
                tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="px-3 py-2 font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide text-[10px] border-b border-slate-200 dark:border-slate-700" {...props} />,
                td: ({node, ...props}) => <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-medium" {...props} />,
                // Custom tag for bracketed citations (e.g. [Kartik_Resume.pdf])
                'cite-pill': ({node, children, ...props}) => (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm align-middle"
                    {...props}
                  >
                    <FileText size={10} className="text-routeTeal" />
                    <span>{children}</span>
                  </span>
                ),
              }}
            >
              {(() => {
                if (isUser) return mainContent;
                // Match [text] not followed by ( link syntax
                return mainContent.replace(/\[([^\]]+)\](?!\()/g, '<cite-pill>$1</cite-pill>');
              })()}
            </ReactMarkdown>

            {/* Click-to-Ask suggestion pill buttons */}
            {suggestions.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Suggested Questions</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => !loading && sendMessage(sug)}
                      disabled={loading}
                      className="text-[10px] text-electricIndigo dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-left transition-all hover:scale-[1.01] hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Render SQL Block if executed */}
          {!isUser && message.sql_query && (
            <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950/40">
              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <Terminal size={12} className="text-routeCoral" />
                <span>Generated SQL Query</span>
              </div>
              <pre className="p-3 text-[10px] font-mono text-routeCoral overflow-x-auto">
                {message.sql_query}
              </pre>
            </div>
          )}

          {/* Render SQL Results Table */}
          {!isUser && message.sql_results && message.sql_results.length > 0 && (
            <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full border-collapse text-[11px] text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    {Object.keys(message.sql_results[0]).map((key) => (
                      <th key={key} className="p-2 font-bold text-slate-400">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {message.sql_results.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="p-2 text-slate-600 dark:text-slate-300 font-medium">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Metrics Badge */}
          {!isUser && message.metrics && (
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
              <span className="text-[9px] font-semibold bg-indigo-500/10 text-electricIndigo py-0.5 px-2 rounded-full border border-indigo-500/10">
                Faithfulness: {message.metrics.faithfulness?.toFixed(2) || '1.00'}
              </span>
              <span className="text-[9px] font-semibold bg-indigo-500/10 text-electricIndigo py-0.5 px-2 rounded-full border border-indigo-500/10">
                Relevance: {message.metrics.answer_relevancy?.toFixed(2) || '1.00'}
              </span>
            </div>
          )}
        </div>

        {/* Footnote citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="border border-slate-200/50 dark:border-slate-800/50 rounded-xl overflow-hidden bg-white dark:bg-[#0E1526]/30">
            <button
              onClick={() => setCitationsOpen(!citationsOpen)}
              className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span className="flex items-center space-x-1.5">
                <BookOpen size={14} className="text-routeTeal" />
                <span>Sources & Citations ({message.citations.length})</span>
              </span>
              {citationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {citationsOpen && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 divide-y divide-slate-100 dark:divide-slate-800 space-y-2.5">
                {message.citations.map((cit, cIdx) => (
                  <div key={cIdx} className="pt-2 text-[10px] space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-routeTeal uppercase tracking-wider">
                      <FileText size={10} />
                      <span>{cit.source} • Page {cit.page} (Score: {cit.score?.toFixed(2)})</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-normal italic pl-3 border-l border-slate-200 dark:border-slate-800">
                      "{cit.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
          {message.timestamp}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-electricIndigo shrink-0 font-bold border border-indigo-500/20 shadow-sm">
          U
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
