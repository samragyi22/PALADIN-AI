import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Bot,
  LogOut,
  Sparkles,
  MessageSquare,
  FileText,
  Database,
  BarChart3,
  ArrowRight,
  Clock,
  ShieldCheck,
  Zap,
  Plus
} from 'lucide-react';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    active_sessions_count: 0,
    indexed_documents_count: 0,
    total_queries_count: 0,
    recent_sessions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/auth/dashboard/stats');
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.warn('Could not load user stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Glow Effects */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Enterprise AI Analyst
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  v1.0 Console
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="h-7 w-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left">
                <p className="font-semibold text-white leading-none">{user?.full_name || 'Analyst'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all focus-ring"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
        {/* Welcome Hero Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Multi-Modal Agentic Intelligence Engine</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Welcome back, {user?.full_name || 'Analyst'} 👋
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Query unstructured documents (PDF, DOCX) and structured databases (CSV, SQLite) simultaneously using natural language.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/workspace')}
                className="btn-tactile flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all focus-ring"
              >
                <Plus className="h-4 w-4" />
                <span>Launch AI Analyst Workspace</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Sessions</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {loading ? '...' : stats.active_sessions_count}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Indexed Documents</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {loading ? '...' : `${stats.indexed_documents_count} Files`}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Queries</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {loading ? '...' : `${stats.total_queries_count} Queries`}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Analysis Sessions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <span>Recent Intelligence Sessions</span>
            </h3>

            <button
              onClick={() => navigate('/workspace')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <span>View Workspace Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {stats.recent_sessions && stats.recent_sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {stats.recent_sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/workspace?session_id=${session.id}`)}
                  className="group cursor-pointer bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all shadow-lg hover:shadow-indigo-500/10 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        {session.updated_at ? new Date(session.updated_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {session.title}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>{session.queriesCount || 0} turns</span>
                    <span className="font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Resume <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800/90 bg-slate-900/40 p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">No active intelligence sessions yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload a document (PDF, DOCX, CSV) or run your first database query in the workspace console.
                </p>
              </div>
              <button
                onClick={() => navigate('/workspace')}
                className="btn-tactile inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all focus-ring"
              >
                <Plus className="h-4 w-4" />
                <span>Start Your First Session</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature Capabilities Grid */}
        <div className="pt-4 border-t border-slate-900">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>AST SQL Guardian</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <BarChart3 className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Automated Charting</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Whisper Voice Ingestion</span>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300">
              <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
              <span>LLM-as-Judge Metrics</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
