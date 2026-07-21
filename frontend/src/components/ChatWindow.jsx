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
  Plus,
  Sparkles,
  ArrowRight,
  Bot
} from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  "Calculate my total percentage",
  "Which subject do I need to improve the most?",
  "Show a summary of my uploaded document",
  "What is the roll number of Kartik Bhardwaj?",
  "Who issued this certificate?",
  "Calculate my average grade score",
  "Show top 5 records from database",
  "List all subjects on my marksheet"
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
  const messagesEndRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      e.target.value = '';
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
      alert("Microphone access denied. Please verify browser permissions.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#080710] text-slate-100 relative">
      {/* Background radial ambient light */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[350px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="h-16 px-6 border-b border-violet-900/30 bg-[#080710]/90 backdrop-blur-2xl flex items-center justify-between z-10">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <BrainCircuit size={18} className="text-violet-400 glow-purple" />
            <span>AI Analyst Workspace</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active Multi-Agent Orchestration
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {!analyticsPanelOpen && (
            <button
              onClick={() => setAnalyticsPanelOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/25 text-xs font-bold shadow-lg shadow-violet-900/30 transition-all btn-tactile focus-ring"
              title="Show Analytics Panel"
            >
              <BarChart3 size={14} />
              <span>Show Analytics Panel</span>
            </button>
          )}

          <button
            onClick={exportPdf}
            className="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] text-slate-200 text-xs font-semibold btn-tactile focus-ring transition-all"
            title="Export Session as PDF"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white shadow-xl shadow-violet-900/50">
              <Bot size={36} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">
                Welcome to Enterprise AI Analyst
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Ask questions across documents or tabular database files. The agentic state machine will dynamically route your query, retrieve contexts, execute SQL, and auto-render charts.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
              {PROMPT_SUGGESTIONS.slice(0, 4).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(sug)}
                  className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-violet-500/40 text-xs text-slate-300 hover:text-white transition-all text-left flex items-start gap-2 group card-hover"
                >
                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium line-clamp-2">{sug}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}

        {/* Shimmer loaders during state graph execution */}
        {loading && (
          <div className="flex items-start space-x-3 max-w-xl animate-fade-in-up">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white shrink-0 shadow-lg shadow-violet-900/40">
              <Activity size={16} className="animate-spin" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-xl relative overflow-hidden">
                <div className="shimmer absolute inset-0" />
                <p className="text-xs font-bold text-violet-300 flex items-center space-x-2">
                  <span>{loadingMessage}</span>
                </p>
                <div className="space-y-1.5 mt-2.5">
                  <div className="h-2 w-3/4 bg-white/10 rounded" />
                  <div className="h-2 w-1/2 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Bar */}
      <div className="p-4 border-t border-white/[0.06] bg-[#080710]/95 backdrop-blur-2xl relative">
        {isRecording && (
          <div className="absolute left-4 right-4 -top-12 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500/20 via-violet-500/20 to-amber-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-between shadow-2xl backdrop-blur-md z-20 animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-bold tracking-widest uppercase select-none text-white">Microphone Listening Live</span>
            </div>
            <div className="flex items-center space-x-1 select-none">
              <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-0.5 h-4.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-0.5 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-[9px] font-semibold text-slate-300 select-none">Pause 5s or click mic to stop</span>
          </div>
        )}

        {/* Auto-complete suggestions popup */}
        {filteredSuggestions.length > 0 && (
          <div className="absolute left-4 right-4 bottom-16 bg-[#0d0b1e] border border-violet-900/40 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-1 backdrop-blur-2xl">
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInput(suggestion);
                  setFilteredSuggestions([]);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors font-medium flex items-center space-x-2"
              >
                <Sparkles size={12} className="text-amber-400 shrink-0" />
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
          
          {/* Upload file plus button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              disabled={loading || isUploading}
              aria-label="Upload photos and files"
              className={`p-3 rounded-xl border border-white/[0.08] hover:border-violet-500/40 hover:bg-white/[0.06] text-slate-400 hover:text-white shadow-sm transition-all shrink-0 flex items-center justify-center btn-tactile focus-ring ${
                isUploading ? 'animate-pulse bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/[0.03]'
              }`}
              title="Upload photos & files"
            >
              <Plus size={16} />
            </button>

            {/* Popover menu */}
            {showUploadMenu && (
              <div className="absolute left-0 bottom-14 w-60 bg-[#0d0b1e] border border-violet-900/40 rounded-xl shadow-2xl z-30 p-2 animate-fade-in backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-left hover:bg-white/[0.06] rounded-lg transition-colors btn-tactile focus-ring"
                >
                  <Plus size={16} className="text-amber-400 shrink-0" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold text-white">Add document or dataset</span>
                    <span className="text-[9px] text-slate-400 font-medium">PDF, DOCX, CSV, SQLite</span>
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
              placeholder={isRecording ? "Listening... start speaking now" : (loading ? "Executing multi-agent state graph..." : "Ask questions like 'Show me orders over $500' or 'Summarize Q3 results'...")}
              disabled={loading}
              readOnly={isRecording}
              className="w-full pl-4 pr-20 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-xs focus:outline-none focus:border-violet-500 focus-ring shadow-inner transition-all placeholder-slate-500 disabled:opacity-50"
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
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/[0.06]'
                }`}
                title={isRecording ? "Stop recording" : "Record voice question"}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              <button
                type="submit"
                disabled={loading || isRecording || !input.trim()}
                aria-label="Send message"
                className="p-2 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 disabled:opacity-30 transition-all btn-tactile focus-ring shadow-lg shadow-violet-900/40"
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
        <div className={`py-1.5 px-4 rounded-full border text-[11px] font-bold text-center ${
          message.isError 
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
        }`}>
          {message.text}
        </div>
      </div>
    );
  }

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
    <div className={`flex items-start space-x-3 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
          message.isError
            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            : 'bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-violet-900/50'
        }`}>
          {message.isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
        </div>
      )}

      <div className={`max-w-xl space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`p-4.5 rounded-2xl border shadow-xl ${
          isUser 
            ? 'bg-gradient-to-r from-violet-600 to-violet-500 border-violet-500/50 text-white font-medium rounded-tr-none shadow-violet-900/40' 
            : message.isError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 rounded-tl-none'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-200 rounded-tl-none backdrop-blur-xl'
        }`}>
          {/* Answer Text */}
          <div className="text-xs leading-relaxed font-normal">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                ul: ({node, ...props}) => <ul className={`list-disc pl-4 my-2 space-y-1 ${isUser ? 'text-white' : 'text-slate-300'}`} {...props} />,
                ol: ({node, ...props}) => <ol className={`list-decimal pl-4 my-2 space-y-1 ${isUser ? 'text-white' : 'text-slate-300'}`} {...props} />,
                li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                h1: ({node, ...props}) => <h1 className={`text-sm font-bold mt-3 mb-1 ${isUser ? 'text-white' : 'text-white'}`} {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-xs font-bold mt-3 mb-1 ${isUser ? 'text-white' : 'text-white'}`} {...props} />,
                h3: ({node, ...props}) => <h3 className={`text-xs font-bold mt-3 mb-1 ${isUser ? 'text-white' : 'text-violet-300'}`} {...props} />,
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                strong: ({node, ...props}) => <strong className={`font-bold ${isUser ? 'text-white' : 'text-white'}`} {...props} />,
                code: ({node, ...props}) => <code className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${isUser ? 'bg-violet-700/50 text-white' : 'bg-white/[0.06] text-amber-300 border border-white/[0.08]'}`} {...props} />,
                mark: ({node, ...props}) => (
                  <mark
                    style={{
                      background: 'linear-gradient(120deg, #f59e0b 0%, #fbbf24 100%)',
                      color: '#080710',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontWeight: '800',
                      boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)',
                      fontSize: '0.8rem',
                    }}
                    {...props}
                  />
                ),
                table: ({node, ...props}) => (
                  <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0a0818]">
                    <table className="w-full border-collapse text-[11px] text-left" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-white/[0.04] border-b border-white/[0.08]" {...props} />,
                tbody: ({node, ...props}) => <tbody className="divide-y divide-white/[0.05]" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-white/[0.02] transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="px-3 py-2.5 font-bold text-violet-300 uppercase tracking-wider text-[10px]" {...props} />,
                td: ({node, ...props}) => <td className="px-3 py-2.5 text-slate-300 font-medium" {...props} />,
                'cite-pill': ({node, children, ...props}) => (
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-md bg-violet-500/15 border border-violet-500/25 text-[10px] font-bold text-violet-300 hover:bg-violet-500/25 transition-all cursor-pointer shadow-sm align-middle"
                    {...props}
                  >
                    <FileText size={10} className="text-amber-400" />
                    <span>{children}</span>
                  </span>
                ),
              }}
            >
              {(() => {
                if (isUser) return mainContent;
                return mainContent.replace(/\[([^\]]+)\](?!\()/g, '<cite-pill>$1</cite-pill>');
              })()}
            </ReactMarkdown>

            {/* Click-to-Ask suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                <span className="text-[9px] font-bold text-amber-400 block uppercase tracking-widest">Suggested Questions</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => !loading && sendMessage(sug)}
                      disabled={loading}
                      className="text-[10px] text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 rounded-lg px-2.5 py-1 text-left transition-all hover:scale-[1.01] disabled:opacity-50 font-semibold"
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
            <div className="mt-3 border border-violet-900/30 rounded-xl overflow-hidden bg-[#0a0818]">
              <div className="px-3.5 py-2 border-b border-white/[0.06] flex items-center space-x-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10">
                <Terminal size={12} className="text-amber-400" />
                <span>AST-Guarded SQL Query</span>
              </div>
              <pre className="p-3.5 text-[10px] font-mono text-amber-300 overflow-x-auto">
                {message.sql_query}
              </pre>
            </div>
          )}

          {/* Render SQL Results Table */}
          {!isUser && message.sql_results && message.sql_results.length > 0 && (
            <div className="mt-3 border border-white/[0.08] rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-[#0a0818]">
              <table className="w-full border-collapse text-[11px] text-left">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/[0.08]">
                    {Object.keys(message.sql_results[0]).map((key) => (
                      <th key={key} className="p-2.5 font-bold text-violet-300 uppercase tracking-wider text-[10px]">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {message.sql_results.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02]">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-slate-300 font-medium">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Render Quality Metrics Badges */}
          {!isUser && message.metrics && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2">
              <span className="text-[9px] font-bold bg-violet-500/15 text-violet-300 py-0.5 px-2.5 rounded-full border border-violet-500/25">
                Faithfulness: {message.metrics.faithfulness?.toFixed(2) || '1.00'}
              </span>
              <span className="text-[9px] font-bold bg-amber-500/10 text-amber-300 py-0.5 px-2.5 rounded-full border border-amber-500/20">
                Relevance: {message.metrics.answer_relevancy?.toFixed(2) || '1.00'}
              </span>
            </div>
          )}
        </div>

        {/* Footnote citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => setCitationsOpen(!citationsOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-white/[0.04] transition-all text-xs font-semibold text-slate-400 hover:text-white"
            >
              <span className="flex items-center space-x-1.5">
                <BookOpen size={14} className="text-violet-400" />
                <span>Sources & Citations ({message.citations.length})</span>
              </span>
              {citationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {citationsOpen && (
              <div className="p-3 border-t border-white/[0.06] divide-y divide-white/[0.05] space-y-2.5">
                {message.citations.map((cit, cIdx) => (
                  <div key={cIdx} className="pt-2 text-[10px] space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-violet-300 uppercase tracking-wider">
                      <FileText size={10} className="text-amber-400" />
                      <span>{cit.source} • Page {cit.page} (Score: {cit.score?.toFixed(2)})</span>
                    </div>
                    <p className="text-slate-400 leading-normal italic pl-3 border-l border-violet-500/30">
                      "{cit.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] font-medium text-slate-500">
          {message.timestamp}
        </p>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center text-white shrink-0 font-bold shadow-lg shadow-violet-900/40">
          U
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
