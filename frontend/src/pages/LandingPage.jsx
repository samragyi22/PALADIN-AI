import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PaladinLogo } from '../components/ui/PaladinLogo';
import {
  Bot, Sparkles, ArrowRight, ShieldCheck, FileText, BarChart3,
  Zap, Layers, Award, ChevronRight, Database, Mic,
  Brain, GitBranch, CheckCircle2, ExternalLink, X, Menu,
  Lock, MessageSquare,
} from 'lucide-react';

const Github = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// UTILITY HOOKS
// ─────────────────────────────────────────────────────────────

const useIntersectionObserver = (threshold = 0.15) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setIsVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, isVisible];
};

const useAnimatedCounter = (target, isVisible, duration = 1800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);
  return count;
};

const useTypeWriter = (phrases, speed = 68, pause = 2400) => {
  const [text, setText] = useState('');
  const [pi, setPi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const cur = phrases[pi];
    const t = setTimeout(() => {
      if (!del) {
        setText(cur.slice(0, ci + 1));
        if (ci + 1 === cur.length) setTimeout(() => setDel(true), pause);
        else setCi(c => c + 1);
      } else {
        setText(cur.slice(0, ci - 1));
        if (ci - 1 === 0) { setDel(false); setCi(0); setPi(i => (i + 1) % phrases.length); }
        else setCi(c => c - 1);
      }
    }, del ? speed / 2 : speed);
    return () => clearTimeout(t);
  }, [text, pi, ci, del, phrases, speed, pause]);
  return text;
};

// ─────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────

const Navbar = ({ isAuthenticated, navigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-[#080710]/90 backdrop-blur-2xl border-b border-violet-900/30' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <PaladinLogo size={32} />
          <div>
            <span className="text-base font-black text-white tracking-tight block leading-none">PALADIN AI</span>
            <span className="text-[9px] font-bold text-amber-400 tracking-widest uppercase block mt-0.5">Intelligence Guardian</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[['Features', '#features'], ['How It Works', '#pipeline'], ['Use Cases', '#usecases'], ['Tech Stack', '#techstack']].map(([label, href]) => (
            <a key={label} href={href}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors duration-200">
              {label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button onClick={() => navigate('/dashboard')}
              className="btn-tactile flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-900/40 transition-all">
              Console <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-xs font-semibold text-slate-400 hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/signup"
                className="btn-tactile flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-bold shadow-lg shadow-violet-900/40 transition-all">
                Get Started <ChevronRight className="h-3 w-3" />
              </Link>
            </>
          )}
          <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setOpen(o => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-violet-900/30 bg-[#080710]/98 backdrop-blur-2xl px-6 py-5 space-y-4">
          {[['Features', '#features'], ['How It Works', '#pipeline'], ['Use Cases', '#usecases']].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1.5 transition-colors">
              {label}
            </a>
          ))}
          <div className="pt-2 flex gap-3">
            <Link to="/login" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 text-xs font-semibold text-slate-300 border border-white/10 rounded-xl hover:border-violet-500/30 transition-colors">Sign In</Link>
            <Link to="/signup" onClick={() => setOpen(false)} className="flex-1 text-center py-2.5 text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-violet-500 rounded-xl">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
};

// ─────────────────────────────────────────────────────────────
// HERO SECTION
// ─────────────────────────────────────────────────────────────

const HeroSection = ({ isAuthenticated }) => {
  const typed = useTypeWriter([
    'Analyze financial reports with natural language',
    'Query databases without writing a single SQL line',
    'Extract insights from PDFs and DOCX instantly',
    'Generate charts automatically from your data',
  ]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
      {/* Animated grid */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      {/* Radial vignette over grid */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, #080710 100%)'
      }} />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-[15%] w-[480px] h-[480px] bg-violet-700/20 rounded-full blur-[140px] animate-orb-1 pointer-events-none" />
      <div className="absolute top-[30%] right-[12%] w-[360px] h-[360px] bg-amber-500/12 rounded-full blur-[120px] animate-orb-2 pointer-events-none" />
      <div className="absolute bottom-[20%] left-[35%] w-[280px] h-[280px] bg-violet-500/15 rounded-full blur-[100px] animate-orb-3 pointer-events-none" />

      <div className="relative z-10 text-center max-w-5xl mx-auto space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          Powered by LangGraph Multi-Agent Orchestration
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.02]">
          PALADIN{' '}
          <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            AI
          </span>{' '}
          <br className="hidden sm:block" />
          Intelligence{' '}
          <span className="bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent">
            Guardian
          </span>
        </h1>

        {/* Typewriter subtitle */}
        <div className="min-h-[28px] flex items-center justify-center">
          <p className="text-lg sm:text-xl text-slate-300 font-medium">
            {typed}
            <span className="inline-block w-0.5 h-5 bg-violet-400 ml-0.5 animate-blink align-middle" />
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          The only AI analyst that simultaneously queries unstructured documents and structured databases — with automatic visualization, citations, and quality scoring.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to={isAuthenticated ? '/workspace' : '/signup'}
            className="btn-tactile flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm shadow-2xl shadow-violet-900/50 transition-all hover:shadow-violet-900/70">
            <Sparkles className="h-4 w-4" />
            {isAuthenticated ? 'Launch Console' : 'Get Started Free'}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="https://github.com/kartikbhardwaj1111/Enterprise-AI-Analyst" target="_blank" rel="noopener noreferrer"
            className="btn-tactile flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.12] text-slate-300 hover:text-white font-semibold text-sm transition-all">
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
          {['Free to use', 'No credit card', 'Open source', 'Docker ready'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Product mockup */}
      <div className="relative z-10 mt-20 w-full max-w-4xl mx-auto animate-float">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-violet-900/30 overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex gap-1.5 shrink-0">
              <div className="h-3 w-3 rounded-full bg-rose-500/70" />
              <div className="h-3 w-3 rounded-full bg-amber-500/70" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="flex-1 mx-2">
              <div className="bg-white/[0.05] rounded-md px-3 py-1 text-[10px] font-mono text-slate-500 flex items-center gap-2">
                <Lock className="h-2.5 w-2.5 text-emerald-400" />
                enterprise-ai-analyst.onrender.com/workspace
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live Engine
            </div>
          </div>

          {/* App content preview */}
          <div className="p-5 grid grid-cols-12 gap-4 bg-[#0a0818]">
            {/* Sidebar */}
            <div className="col-span-3 space-y-2.5">
              <div className="h-8 rounded-xl bg-violet-600/25 border border-violet-500/20 flex items-center px-3 gap-2">
                <Bot className="h-3 w-3 text-violet-400" />
                <div className="h-1.5 w-16 rounded-full bg-violet-400/40" />
              </div>
              {['Q3 Finance Report', 'HR Database', 'Legal Contracts'].map((s, i) => (
                <div key={s} className={`h-7 rounded-lg flex items-center px-3 gap-2 border ${i === 0 ? 'bg-white/[0.05] border-white/[0.10]' : 'bg-transparent border-transparent'}`}>
                  <MessageSquare className="h-3 w-3 text-slate-500 shrink-0" />
                  <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${55 + i * 12}%` }} />
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-white/[0.05]">
                <div className="text-[9px] uppercase tracking-wider text-slate-600 px-2 mb-2">Source Inventory</div>
                <div className="h-6 rounded-lg bg-white/[0.03] border border-dashed border-white/[0.08] flex items-center justify-center">
                  <span className="text-[9px] text-slate-600">Q3_Report.pdf</span>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="col-span-9 space-y-3">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-violet-600/25 border border-violet-500/20 rounded-xl px-4 py-2.5 text-xs text-violet-100 max-w-xs">
                  Summarize Q3 revenue highlights and show me a chart
                </div>
              </div>
              {/* AI response */}
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-slate-300 max-w-sm space-y-2">
                  <p className="text-white font-bold">📊 Q3 Financial Summary</p>
                  <p>Total Revenue: <span className="text-amber-400 font-semibold">₹48.3 Cr</span> <span className="text-emerald-400">↑ 23% YoY</span></p>
                  <p>Net Margin: <span className="text-emerald-400 font-semibold">18.4%</span> (improved from 15.1%)</p>
                  <p>Top Segment: <span className="text-violet-300">Enterprise Suite — 67% of growth</span></p>
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">📄 Q3_Report.pdf · p.14</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">📊 Bar chart generated →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Glow under mockup */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-1/2 h-12 bg-violet-600/25 blur-2xl" />
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// STATS ROW
// ─────────────────────────────────────────────────────────────

const StatCard = ({ value, suffix, label, color }) => {
  const [ref, isVisible] = useIntersectionObserver(0.4);
  const count = useAnimatedCounter(value, isVisible);
  return (
    <div ref={ref} className="text-center space-y-2 px-4">
      <div className={`text-4xl sm:text-5xl font-black tabular-nums ${color}`}>
        {count}{suffix}
      </div>
      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
};

const StatsRow = () => (
  <section className="py-16 border-y border-white/[0.05] bg-white/[0.015]">
    <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 divide-x divide-white/[0.05]">
      <StatCard value={6} suffix="" label="LangGraph Agent Nodes" color="text-gradient-purple" />
      <StatCard value={5} suffix="+" label="File Formats Supported" color="text-gradient-gold" />
      <StatCard value={4} suffix="" label="Chart Types Auto-Generated" color="text-emerald-400" />
      <StatCard value={100} suffix="%" label="Safe — No Destructive SQL" color="text-cyan-400" />
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// LIVE DEMO STRIP
// ─────────────────────────────────────────────────────────────

const DEMO = [
  { role: 'user', text: 'What were the top 3 products by revenue in Q3?', delay: 600 },
  { role: 'typing', text: 'Analyzing sales_data.csv...', delay: 1300 },
  { role: 'bot', text: '1. Enterprise Suite — ₹18.2Cr (+34%)\n2. Analytics Pro — ₹12.7Cr (+18%)\n3. Data Connect — ₹9.4Cr (+52%)', citations: ['sales_data.csv · row 1–847'], delay: 3000 },
  { role: 'user', text: 'Show this as a bar chart', delay: 4500 },
  { role: 'typing', text: 'Generating Recharts visualization...', delay: 5200 },
  { role: 'chart', text: '📊 Revenue comparison chart rendered in Analytics Panel', delay: 6800 },
];

const LiveDemoStrip = () => {
  const [ref, isVisible] = useIntersectionObserver(0.2);
  const [msgs, setMsgs] = useState([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!isVisible || started) return;
    setStarted(true);
    DEMO.forEach((m, i) => {
      setTimeout(() => {
        setMsgs(prev => {
          const filtered = m.role !== 'typing' ? prev.filter(p => p.role !== 'typing') : prev;
          return [...filtered, { ...m, id: i }];
        });
      }, m.delay);
    });
  }, [isVisible, started]);

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Live Demo</span>
          <h2 className="text-4xl font-black text-white">Watch It Answer In Real Time</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">A live replay of the AI analyst responding to complex enterprise queries</p>
        </div>

        <div ref={ref} className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-violet-900/30 bg-[#0a0818] overflow-hidden shadow-2xl shadow-violet-900/30">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">AI Analyst Workspace</p>
                  <p className="text-[10px] text-slate-500">sales_data.csv · session_demo</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
              </span>
            </div>

            {/* Messages */}
            <div className="p-5 space-y-4 min-h-[300px]">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'gap-2.5'} animate-message-entry`}>
                  {(m.role === 'bot' || m.role === 'typing' || m.role === 'chart') && (
                    <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-xs sm:max-w-sm rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600/20 border border-violet-500/25 text-violet-100'
                      : m.role === 'chart'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold'
                      : m.role === 'typing'
                      ? 'bg-white/[0.03] border border-white/[0.07] text-slate-500 italic'
                      : 'bg-white/[0.04] border border-white/[0.08] text-slate-300'
                  }`}>
                    {m.role === 'typing' ? (
                      <span className="flex items-center gap-2">
                        {m.text}
                        <span className="flex gap-0.5">
                          {[0,1,2].map(d => (
                            <span key={d} className="h-1.5 w-1.5 rounded-full bg-violet-400/60 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                          ))}
                        </span>
                      </span>
                    ) : (
                      <div>
                        <p className="whitespace-pre-line">{m.text}</p>
                        {m.citations && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.citations.map(c => (
                              <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
                                📎 {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input stub */}
            <div className="px-5 py-3.5 border-t border-white/[0.05] flex items-center gap-3">
              <div className="flex-1 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 flex items-center gap-2">
                <span className="text-xs text-slate-600">Ask anything about your data...</span>
              </div>
              <button className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
                <ArrowRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// PIPELINE SECTION
// ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: '01', title: 'Intent Routing', desc: 'LLM classifies your query as Document RAG, SQL Query, or Hybrid — then routes to the correct agent path.', color: 'violet', Icon: Brain },
  { n: '02', title: 'RAG & SQL Execution', desc: 'ChromaDB + BM25 hybrid retrieval for documents. AST-guarded NL-to-SQL for structured CSV/SQLite data.', color: 'indigo', Icon: Database },
  { n: '03', title: 'Merge & Synthesize', desc: 'LangGraph merge node unifies document and SQL results into one coherent, source-cited final response.', color: 'amber', Icon: GitBranch },
  { n: '04', title: 'Evaluate & Visualize', desc: 'LLM-as-Judge scores faithfulness & relevancy. Chart node auto-generates interactive Recharts configs.', color: 'emerald', Icon: BarChart3 },
];

const colorMap = {
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
};

const PipelineSection = () => {
  const [ref, isVisible] = useIntersectionObserver(0.1);
  return (
    <section id="pipeline" className="py-24 bg-white/[0.02] border-y border-white/[0.04] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Under The Hood</span>
          <h2 className="text-4xl font-black text-white">4-Stage Processing Pipeline</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">Every query flows through a LangGraph state machine to deliver verified, cited, visualized answers</p>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <div key={s.n}
              className={`relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4 card-hover hover:border-violet-500/25 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'both' }}>
              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:flex absolute top-[42px] -right-3 z-10 items-center">
                  <div className="w-6 h-px bg-gradient-to-r from-white/20 to-transparent" />
                  <ChevronRight className="h-3 w-3 text-white/15 -ml-1" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className={`h-11 w-11 rounded-xl border flex items-center justify-center ${colorMap[s.color]}`}>
                  <s.Icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-black text-white/[0.06]">{s.n}</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-2">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// FEATURE TABS
// ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: 'rag', label: 'Hybrid RAG', Icon: FileText, col: 'violet',
    title: 'Multi-Modal Document Intelligence',
    desc: 'Upload PDFs (including scanned), DOCX, and images. Get precise answers with source citations combining ChromaDB vectors, BM25 keyword matching, and Cohere reranking.',
    points: ['OCR-powered via Tesseract for scanned PDFs', 'BM25 + Vector hybrid scoring', 'Cohere reranking for precision', 'Citations with page references'],
    code: ['query: "What is the net profit margin?"', 'answer: "18.4% — improved from 15.1%"', 'source: Q3_Report.pdf · page 14', 'faithfulness: 0.96'],
  },
  {
    id: 'sql', label: 'SQL Engine', Icon: Database, col: 'indigo',
    title: 'Natural Language → Safe SQL',
    desc: 'Ask any question in plain English. The SQL engine converts it to optimized queries, runs them on your CSV or SQLite data, and returns structured results — safely.',
    points: ['NL-to-SQL powered by Groq LLaMA', 'AST parser blocks DROP, DELETE, ALTER', 'Auto-retry loop on failed queries', 'Works on CSV and SQLite uploads'],
    code: ['input: "Top 3 products by Q3 sales"', 'sql: SELECT product, SUM(revenue)', '       FROM data GROUP BY product', '       ORDER BY total DESC LIMIT 3'],
  },
  {
    id: 'charts', label: 'Auto Charts', Icon: BarChart3, col: 'amber',
    title: 'Automatic Data Visualization',
    desc: 'The chart node detects numerical patterns in SQL results and auto-generates interactive Recharts configurations — no coding or setup needed.',
    points: ['Bar, Line, Area, Pie chart types', 'Multi-series overlay support', 'Custom color palettes', 'Embedded in PDF export'],
    code: ['type: BarChart', 'series: ["Q1", "Q2", "Q3", "Q4"]', 'values: [42.1, 58.3, 73.8, 91.2]', 'colors: ["#7c3aed", "#f59e0b"]'],
  },
  {
    id: 'voice', label: 'Voice Input', Icon: Mic, col: 'purple',
    title: 'Whisper Voice Transcription',
    desc: 'Speak your analytical query and Groq Whisper-large-v3-turbo transcribes it instantly — enabling hands-free data analysis at enterprise speed.',
    points: ['Groq Whisper-large-v3-turbo model', 'Real-time transcription stream', 'Multi-language support', 'Direct pipeline input'],
    code: ['model: whisper-large-v3-turbo', 'provider: Groq', 'latency: ~300ms', 'languages: 50+'],
  },
  {
    id: 'eval', label: 'LLM Eval', Icon: Award, col: 'rose',
    title: 'Automated Answer Quality Scoring',
    desc: 'Every response is scored by a second LLM judge for faithfulness to source material and relevancy — ensuring you can always trust the AI output.',
    points: ['Faithfulness score (0.0 – 1.0)', 'Answer relevancy metric', 'Context recall measurement', 'Shown on every response turn'],
    code: ['faithfulness: 0.94', 'relevancy: 0.91', 'context_recall: 0.88', 'overall: PASS ✓'],
  },
  {
    id: 'export', label: 'PDF Export', Icon: Layers, col: 'cyan',
    title: 'Executive Report Generation',
    desc: 'Compile your full analysis session — queries, responses, SQL results, citations, and charts — into a professionally formatted PDF report with one click.',
    points: ['ReportLab + Matplotlib rendering', 'Full session history included', 'Charts embedded as high-res images', 'One-click download from UI'],
    code: ['format: PDF/A', 'renderer: ReportLab', 'charts: Matplotlib', 'pages: auto-generated'],
  },
];

const CV = {
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', active: 'border-violet-500/40 bg-violet-500/10 text-violet-300' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', active: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', active: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', active: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', active: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', active: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
};

const FeatureTabs = () => {
  const [active, setActive] = useState('rag');
  const feat = FEATURES.find(f => f.id === active);
  const cv = CV[feat.col];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Enterprise Capabilities</span>
          <h2 className="text-4xl font-black text-white">Everything You Need to Analyze Data</h2>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FEATURES.map(f => {
            const isAct = f.id === active;
            const fcv = CV[f.col];
            return (
              <button key={f.id} onClick={() => setActive(f.id)}
                className={`btn-tactile flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  isAct ? fcv.active : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
                }`}>
                <f.Icon className="h-3.5 w-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div key={active} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center animate-fade-in-up">
          <div className="space-y-5">
            <div className={`inline-flex h-13 w-13 items-center justify-center rounded-2xl ${cv.bg} border ${cv.border}`}>
              <feat.Icon className={`h-7 w-7 ${cv.text}`} />
            </div>
            <h3 className="text-2xl font-black text-white">{feat.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
            <ul className="space-y-2.5">
              {feat.points.map(p => (
                <li key={p} className="flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${cv.text}`} />
                  <span className="text-slate-300">{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Code preview */}
          <div className={`rounded-2xl border ${cv.border} bg-[#0a0818] overflow-hidden`}>
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${cv.border} ${cv.bg}`}>
              <div className="flex gap-1">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className={`text-[10px] font-semibold ${cv.text} ml-1`}>{feat.label} Output</span>
            </div>
            <div className="p-5 font-mono text-xs text-slate-400 space-y-2">
              <p className="text-slate-600">{'// '}{feat.title}</p>
              {feat.code.map((line, i) => (
                <p key={i} className={i === 0 ? cv.text : i % 2 === 0 ? 'text-emerald-400' : 'text-slate-300'}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// USE CASE CARDS
// ─────────────────────────────────────────────────────────────

const CASES = [
  {
    icon: '💼', label: 'Finance & Investment',
    query: 'What was Q3 net revenue vs Q2, and which segment drove growth?',
    response: 'Q3 revenue: ₹48.3Cr (+23% vs Q2). Enterprise segment drove 67% of growth.',
    badge: 'Hybrid RAG + SQL',
    style: 'from-amber-600/15 to-transparent border-amber-500/20 hover:border-amber-500/40',
  },
  {
    icon: '⚖️', label: 'Legal & Compliance',
    query: 'Summarize all indemnification clauses across the vendor contracts',
    response: '4 clauses found across 3 contracts. Critical: Vendor A limits liability to ₹10L.',
    badge: 'Document RAG',
    style: 'from-violet-600/15 to-transparent border-violet-500/20 hover:border-violet-500/40',
  },
  {
    icon: '👥', label: 'HR & Recruitment',
    query: 'List all candidates with 5+ years Python experience from the resume database',
    response: 'Found 12 candidates. Top match: Priya S. — 8 years, ML engineer, Bangalore.',
    badge: 'SQL + RAG Hybrid',
    style: 'from-emerald-600/15 to-transparent border-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    icon: '⚙️', label: 'Operations & Logistics',
    query: 'Which warehouse has the lowest fulfillment rate this month?',
    response: 'Warehouse B: 67.3% fulfillment — 18% below average. Root cause: staffing gap.',
    badge: 'SQL Analysis',
    style: 'from-cyan-600/15 to-transparent border-cyan-500/20 hover:border-cyan-500/40',
  },
];

const UseCaseCards = () => {
  const [ref, isVisible] = useIntersectionObserver(0.1);
  return (
    <section id="usecases" className="py-24 bg-white/[0.015] border-y border-white/[0.04] px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Real-World Use Cases</span>
          <h2 className="text-4xl font-black text-white">Built for Every Industry</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">See how teams get answers in seconds, not hours</p>
        </div>

        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {CASES.map((c, i) => (
            <div key={c.label}
              className={`bg-gradient-to-br ${c.style} border rounded-2xl p-6 space-y-4 card-hover transition-all ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{c.icon}</span>
                  <h4 className="text-sm font-black text-white">{c.label}</h4>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08]">{c.badge}</span>
              </div>
              <div className="space-y-2">
                <div className="bg-white/[0.04] rounded-xl px-4 py-3 border border-white/[0.07]">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1.5">User Query</p>
                  <p className="text-xs text-slate-200 italic leading-relaxed">"{c.query}"</p>
                </div>
                <div className="bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.05]">
                  <p className="text-[9px] text-slate-600 uppercase font-bold mb-1.5">AI Response</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{c.response}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// TECH STACK
// ─────────────────────────────────────────────────────────────

const TECH = [
  { name: 'LangGraph', icon: '🔗', desc: 'Multi-agent orchestration' },
  { name: 'FastAPI', icon: '⚡', desc: 'Python backend' },
  { name: 'React 19', icon: '⚛️', desc: 'Frontend UI' },
  { name: 'ChromaDB', icon: '🗃️', desc: 'Vector database' },
  { name: 'Groq', icon: '🚀', desc: 'Ultra-fast inference' },
  { name: 'Cohere', icon: '🎯', desc: 'Embed & rerank' },
  { name: 'SQLite', icon: '🗄️', desc: 'Structured DB' },
  { name: 'Docker', icon: '🐳', desc: 'Containerized' },
  { name: 'Tesseract', icon: '👁️', desc: 'OCR engine' },
];

const TechStack = () => (
  <section id="techstack" className="py-24 px-6">
    <div className="max-w-5xl mx-auto">
      <div className="text-center space-y-3 mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-violet-400">Technology Stack</span>
        <h2 className="text-3xl font-black text-white">Enterprise-Grade Infrastructure</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {TECH.map(t => (
          <div key={t.name}
            className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-violet-500/30 rounded-2xl p-4 text-center space-y-2 transition-all duration-200 card-hover cursor-default">
            <div className="text-2xl">{t.icon}</div>
            <p className="text-xs font-bold text-white">{t.name}</p>
            <p className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors leading-snug">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// CTA BANNER
// ─────────────────────────────────────────────────────────────

const CTABanner = () => (
  <section className="py-24 px-6">
    <div className="max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl border border-violet-500/25 p-12 sm:p-16 text-center space-y-7 shadow-2xl shadow-violet-900/40"
        style={{ background: 'linear-gradient(135deg, rgba(109,40,217,0.25) 0%, #0a0818 50%, rgba(180,83,9,0.15) 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]" />
        {/* Corner glows */}
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-violet-600/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-7">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            Start free — no credit card required
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            Ready to unlock your{' '}
            <span className="bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
              data intelligence?
            </span>
          </h2>

          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Join the next generation of analysts who use AI to get answers from any document or database in seconds — not hours.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup"
              className="btn-tactile flex items-center gap-2 px-9 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm shadow-2xl shadow-violet-900/60 transition-all hover:shadow-violet-900/80">
              <Sparkles className="h-4 w-4" /> Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="https://enterprise-ai-analyst.onrender.com/docs" target="_blank" rel="noopener noreferrer"
              className="btn-tactile flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.12] text-slate-300 hover:text-white font-semibold text-sm transition-all">
              <ExternalLink className="h-4 w-4" /> API Docs
            </a>
          </div>

          <p className="text-xs text-slate-600">
            Live at{' '}
            <a href="https://enterprise-ai-analyst.onrender.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
              enterprise-ai-analyst.onrender.com
            </a>
          </p>
        </div>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────

const Footer = () => (
  <footer className="border-t border-white/[0.05] py-14 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
        <div className="sm:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Enterprise AI Analyst</p>
              <p className="text-[10px] text-slate-600">v1.2.0 · MIT License</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            An agentic multi-modal intelligence console for querying documents and databases using natural language.
          </p>
          <a href="https://github.com/kartikbhardwaj1111/Enterprise-AI-Analyst" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-violet-400 transition-colors">
            <Github className="h-3.5 w-3.5" /> github.com/kartikbhardwaj1111
          </a>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Product</p>
          {[
            { l: 'Live Demo', h: 'https://enterprise-ai-analyst.onrender.com' },
            { l: 'API Docs', h: 'https://enterprise-ai-analyst.onrender.com/docs' },
            { l: 'GitHub', h: 'https://github.com/kartikbhardwaj1111/Enterprise-AI-Analyst' },
            { l: 'CHANGELOG', h: 'https://github.com/kartikbhardwaj1111/Enterprise-AI-Analyst/blob/main/CHANGELOG.md' },
          ].map(({ l, h }) => (
            <a key={l} href={h} target="_blank" rel="noopener noreferrer" className="block text-xs text-slate-500 hover:text-violet-400 transition-colors">{l}</a>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Tech Stack</p>
          {['LangGraph', 'FastAPI', 'React 19', 'ChromaDB', 'Groq', 'Docker'].map(t => (
            <p key={t} className="text-xs text-slate-600">{t}</p>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-slate-700">© 2026 Enterprise AI Analyst — MIT License</p>
        <p className="text-xs text-slate-700">Built with ❤️ using LangGraph · FastAPI · React</p>
      </div>
    </div>
  </footer>
);

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080710] text-slate-100 selection:bg-violet-500/30 selection:text-white overflow-x-hidden">
      <Navbar isAuthenticated={isAuthenticated} navigate={navigate} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <StatsRow />
      <LiveDemoStrip />
      <PipelineSection />
      <FeatureTabs />
      <UseCaseCards />
      <TechStack />
      <CTABanner />
      <Footer />
    </div>
  );
};
