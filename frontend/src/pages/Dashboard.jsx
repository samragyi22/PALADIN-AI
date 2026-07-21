import React, { useState, useEffect, useRef } from 'react';
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
  Plus,
  Compass,
  FileCode,
  CheckCircle2,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

// Animated counter hook
const useAnimatedCounter = (target, isVisible, duration = 1500) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const numTarget = Number(target) || 0;
    if (numTarget === 0) {
      setCount(0);
      return;
    }
    const step = numTarget / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= numTarget) {
        setCount(numTarget);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);
  return count;
};

const StatCard = ({ icon: Icon, label, value, unit = '', colorClass, bgClass, borderClass, loading }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const animatedVal = useAnimatedCounter(value, isVisible);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl border ${borderClass} bg-white/[0.03] backdrop-blur-xl p-6 card-hover shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgClass} border ${borderClass}`}>
          <Icon className={`h-6 w-6 ${colorClass}`} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
          Real-time
        </span>
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-black text-white tracking-tight flex items-baseline gap-1">
          {loading ? (
            <span className="inline-block w-12 h-7 bg-white/10 rounded animate-pulse" />
          ) : (
            <>
              {animatedVal}
              {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
            </>
          )}
        </p>
      </div>
      {/* Subtle bottom glow line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${bgClass}`} />
    </div>
  );
};

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
    <div className="min-h-screen bg-[#080710] text-slate-100 selection:bg-violet-500/30 selection:text-white">
      {/* Background Decorative Glow Effects */}
      <div className="fixed top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-violet-700/15 rounded-full blur-[140px] pointer-events-none animate-orb-1" />
      <div className="fixed bottom-0 right-1/4 translate-x-1/2 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-orb-2" />

      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-violet-900/30 bg-[#080710]/90 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-lg shadow-violet-900/50">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Enterprise AI Analyst
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full">
                  v1.2 Console
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/workspace')}
              className="btn-tactile hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-900/40 transition-all hover:shadow-violet-900/60"
            >
              <Plus className="h-4 w-4" />
              <span>New Session</span>
            </button>

            <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-amber-500 text-white flex items-center justify-center font-bold">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <p className="font-semibold text-white leading-none">{user?.full_name || 'Analyst'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-tactile flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold transition-all focus-ring"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in-up">
        {/* Welcome Hero Banner Card */}
        <div
          className="relative overflow-hidden rounded-3xl border border-violet-500/20 p-8 sm:p-10 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.2) 0%, #0d0b1e 60%, rgba(245,158,11,0.1) 100%)' }}
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Multi-Modal Intelligence Workspace</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                {user?.full_name || 'Analyst'}
              </span>{' '}
              👋
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Query unstructured documents (PDF, DOCX) and structured databases (CSV, SQLite) simultaneously using natural language.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/workspace')}
                className="btn-tactile flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm rounded-xl shadow-xl shadow-violet-900/50 transition-all hover:shadow-violet-900/70"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>Launch Analyst Console</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>

              <a
                href="https://enterprise-ai-analyst.onrender.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile flex items-center gap-2 px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all"
              >
                <FileCode className="h-4 w-4 text-violet-400" />
                <span>API Specs</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Stats Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            icon={MessageSquare}
            label="Active Intelligence Sessions"
            value={stats.active_sessions_count}
            colorClass="text-violet-400"
            bgClass="bg-violet-500/10"
            borderClass="border-violet-500/20"
            loading={loading}
          />
          <StatCard
            icon={FileText}
            label="Indexed Knowledge Files"
            value={stats.indexed_documents_count}
            unit="Files"
            colorClass="text-emerald-400"
            bgClass="bg-emerald-500/10"
            borderClass="border-emerald-500/20"
            loading={loading}
          />
          <StatCard
            icon={Database}
            label="Total Queries Executed"
            value={stats.total_queries_count}
            unit="Queries"
            colorClass="text-amber-400"
            bgClass="bg-amber-500/10"
            borderClass="border-amber-500/20"
            loading={loading}
          />
        </div>

        {/* Quick Action Hub */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="h-4 w-4 text-amber-400" />
            <span>Quick Start Hub</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => navigate('/workspace')}
              className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-violet-500/40 rounded-2xl p-5 transition-all card-hover space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">Start New Analysis</p>
                <p className="text-xs text-slate-400 mt-1">Query documents or database tables in natural language</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/workspace')}
              className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/40 rounded-2xl p-5 transition-all card-hover space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Upload Document / CSV</p>
                <p className="text-xs text-slate-400 mt-1">Index PDF, DOCX, CSV or SQLite files for hybrid search</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/workspace')}
              className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-5 transition-all card-hover space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Generate Recharts</p>
                <p className="text-xs text-slate-400 mt-1">Auto-detect tabular data & render interactive charts</p>
              </div>
            </div>

            <a
              href="https://enterprise-ai-analyst.onrender.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/40 rounded-2xl p-5 transition-all card-hover space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Interactive API Docs</p>
                <p className="text-xs text-slate-400 mt-1">Explore FastAPI endpoints & test OpenAPI routes live</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent Analysis Sessions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-violet-400" />
              <span>Recent Intelligence Sessions</span>
            </h3>

            <button
              onClick={() => navigate('/workspace')}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <span>Console Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {stats.recent_sessions && stats.recent_sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {stats.recent_sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/workspace?session_id=${session.id}`)}
                  className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-violet-500/40 rounded-2xl p-5 transition-all card-hover flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3 text-violet-400" />
                        {session.updated_at ? new Date(session.updated_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors line-clamp-2">
                      {session.title}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                    <span>{session.queriesCount || 0} turns</span>
                    <span className="font-semibold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Resume <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
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
                className="btn-tactile inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-900/40 transition-all hover:shadow-violet-900/60"
              >
                <Plus className="h-4 w-4" />
                <span>Start Your First Session</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature Capabilities Grid */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>AST SQL Guardian Engine</span>
            </div>
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
              <BarChart3 className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Automated Recharts Rendering</span>
            </div>
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
              <Zap className="h-4 w-4 text-violet-400 shrink-0" />
              <span>Whisper Voice Transcription</span>
            </div>
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300">
              <Sparkles className="h-4 w-4 text-rose-400 shrink-0" />
              <span>LLM-as-Judge Faithfulness</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
