import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileText,
  BarChart3,
  Zap,
  Layers,
  Award,
  ChevronRight
} from 'lucide-react';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-6');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Glow Orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Public Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
              <Bot className="h-6 w-6" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Enterprise AI Analyst
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-tactile flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all focus-ring"
              >
                <span>Go to Console</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-tactile px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all focus-ring"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-tactile flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all focus-ring"
                >
                  <span>Get Started Free</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold shadow-inner">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Powered by LangGraph Agentic Multi-Modal Orchestration</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Query, Analyze & Visualize <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500">
            Enterprise Intelligence
          </span>{' '}
          In Natural Language
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Simultaneously query unstructured documents (PDF, DOCX) and structured databases (CSV, SQLite) using an agentic hybrid RAG and text-to-SQL architecture.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/workspace"
                className="btn-tactile flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all focus-ring"
              >
                <Bot className="h-4 w-4" />
                <span>Launch Workspace Console</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="btn-tactile flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all focus-ring"
              >
                <span>View Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                className="btn-tactile flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all focus-ring"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/signup?redirect=%2Fworkspace"
                className="btn-tactile flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all focus-ring"
              >
                <Bot className="h-4 w-4 text-indigo-400" />
                <span>Try Live Console (Free Sign Up)</span>
              </Link>
            </>
          )}
        </div>

        {/* Visual Console Teaser Card */}
        <div className="pt-12 max-w-5xl mx-auto scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
          <div className="relative rounded-3xl border border-slate-800 bg-slate-900/90 p-3 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-slate-500">enterprise-analyst.internal/workspace</span>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live LangGraph Engine
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/60 space-y-2">
                  <p className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Hybrid RAG Stream
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    ChromaDB vector embedding & BM25 keyword reranking with PyTesseract OCR extraction.
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/60 space-y-2">
                  <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Dual SQL & AST Guardian
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Safe Text-to-SQL code generation verified against AST security parsers.
                  </p>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/60 space-y-2">
                  <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Recharts Synthesis
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Automated dynamic chart rendering (Bar, Line, Area, Pie) with multi-series overlay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Pipeline Architecture) */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-900 px-6">
        <div className="max-w-7xl mx-auto space-y-12 text-center">
          <div className="space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Under The Hood</h2>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              Agentic Multi-Stage Processing Pipeline
            </h3>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              How natural language queries flow through LangGraph nodes to generate verified insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h4 className="text-base font-bold text-white">Intent Routing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classifies incoming natural language prompts into Document RAG, SQL Data Query, or Hybrid Execution paths.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h4 className="text-base font-bold text-white">RAG & SQL Execution</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts chunks via BM25 + ChromaDB and executes AST-guarded SQLite queries simultaneously.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h4 className="text-base font-bold text-white">Recharts Synthesis</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Synthesizes tabular query results into automated interactive Recharts visual configurations.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h4 className="text-base font-bold text-white">LLM-as-Judge Eval</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates real-time Faithfulness and Relevancy quality scores for every generated response turn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Feature Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 scroll-reveal transition-all duration-700 opacity-0 translate-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Enterprise Capabilities</h2>
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            Built for Complex Analytical Workflows
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-indigo-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">Hybrid Document RAG</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combines ChromaDB vector search, BM25 keyword matching, and PyTesseract OCR for scanned PDFs and DOCX files.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-emerald-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">Dual SQL Engine & AST Guardian</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Natural language text-to-SQL generation with AST safety parsers preventing destructive database operations.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-amber-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">Automated Recharts Visualizer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-detects numerical series to generate interactive Bar, Line, Area, and Pie charts with customizable palettes.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-purple-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">Whisper Voice Ingestion</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transcribe voice prompts directly into analytical queries using Groq Whisper-large-v3-turbo.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-rose-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">LLM-as-Judge Evaluation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time automated scoring for response Faithfulness and Answer Relevancy on every turn.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-3 hover:border-cyan-500/50 transition-all scroll-reveal opacity-0 translate-y-6">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-white">Enterprise PDF Export</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile full session analysis histories and query logs into downloadable ReportLab executive PDF reports.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 px-6 max-w-7xl mx-auto text-center">
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 p-10 sm:p-14 space-y-6 shadow-2xl">
          <h3 className="text-3xl font-extrabold text-white tracking-tight">
            Ready to Supercharge Your Data Analytics?
          </h3>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Experience multi-modal document intelligence and SQL analytics powered by agentic AI.
          </p>
          <div className="pt-2">
            <Link
              to="/signup"
              className="btn-tactile inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all focus-ring"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Enterprise AI Analyst. Built with LangGraph, FastAPI & React.</p>
      </footer>
    </div>
  );
};
