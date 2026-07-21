import React, { useContext, useState, useEffect } from 'react';
import { ApiContext } from '../context/ApiContext';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart as RechartsLineChart, 
  Line, 
  AreaChart as RechartsAreaChart,
  Area,
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Brush,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Info, 
  AreaChart as AreaIcon,
  Calculator,
  Download,
  Grid,
  Tag,
  Palette,
  Image,
  ChevronRight,
  Search,
  Table,
  Sparkles
} from 'lucide-react';

const ChartRenderer = () => {
  const { activeChartConfig, analyticsPanelOpen, setAnalyticsPanelOpen } = useContext(ApiContext);
  const [chartType, setChartType] = useState('bar');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'data'
  const [searchQuery, setSearchQuery] = useState('');
  const [colorPalette, setColorPalette] = useState('purpleGold'); // 'purpleGold', 'emerald', 'sunset'
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (activeChartConfig?.type) {
      setChartType(activeChartConfig.type);
    }
  }, [activeChartConfig]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && analyticsPanelOpen) {
        setAnalyticsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [analyticsPanelOpen, setAnalyticsPanelOpen]);

  if (!activeChartConfig && !analyticsPanelOpen) {
    return (
      <div className="w-0 overflow-hidden border-l-0 h-screen drawer-transition bg-[#080710] hidden lg:block" />
    );
  }

  const { data = [], xAxis = '', yAxis = '', title = 'Analytics Visualizer' } = activeChartConfig || {};

  // Color Palette configurations
  const palettes = {
    purpleGold: {
      primary: '#7c3aed',
      secondary: '#f59e0b',
      gradientStart: '#8b5cf6',
      gradientEnd: '#f59e0b',
      pieColors: ['#7c3aed', '#f59e0b', '#8b5cf6', '#fbbf24', '#a78bfa', '#fcd34d'],
      fill: 'url(#colorPurpleGold)'
    },
    emerald: {
      primary: '#10B981',
      secondary: '#34D399',
      gradientStart: '#10B981',
      gradientEnd: '#047857',
      pieColors: ['#10B981', '#059669', '#047857', '#065F46', '#34D399', '#6EE7B7'],
      fill: 'url(#colorEmerald)'
    },
    sunset: {
      primary: '#F97316',
      secondary: '#F87171',
      gradientStart: '#EC4899',
      gradientEnd: '#F97316',
      pieColors: ['#EC4899', '#F43F5E', '#E11D48', '#BE123C', '#F97316', '#FB923C'],
      fill: 'url(#colorSunset)'
    }
  };

  const currentTheme = palettes[colorPalette] || palettes.purpleGold;

  // Multi-Series Detection
  const allKeys = data && data.length > 0 ? Object.keys(data[0] || {}) : [];
  const numericKeys = allKeys.filter(key => {
    if (key === xAxis || key === 'index' || key.toLowerCase().includes('id')) return false;
    return data.some(row => {
      const val = Number(row[key]);
      return !isNaN(val) && val !== 0;
    });
  });

  const activeYKeys = numericKeys.length > 0 ? numericKeys.slice(0, 3) : [yAxis];

  // Statistical Calculations
  const primaryY = activeYKeys[0];
  const numericValues = data.map(item => Number(item[primaryY])).filter(v => !isNaN(v));
  const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
  const avg = numericValues.length ? (sum / numericValues.length) : 0;
  const max = numericValues.length ? Math.max(...numericValues) : 0;
  const min = numericValues.length ? Math.min(...numericValues) : 0;

  // Export JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${title.replace(/\s+/g, '_')}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export PNG
  const handleExportPNG = () => {
    const svgElement = document.querySelector('.recharts-responsive-container svg');
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;
      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.fillStyle = '#080710';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      const pngURL = canvas.toDataURL('image/png');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", pngURL);
      downloadAnchor.setAttribute("download", `${title.replace(/\s+/g, '_')}_chart.png`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-[#080710]/80 backdrop-blur-md z-40 transition-opacity duration-300 lg:hidden ${
          analyticsPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setAnalyticsPanelOpen(false)}
        aria-hidden="true"
      />

      {/* Main Drawer Container */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Analytics Chart Visualizer"
        className={`fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl border-t border-violet-900/40 bg-[#0d0b1e] p-6 overflow-y-auto shadow-2xl bottom-sheet-transition lg:relative lg:inset-auto lg:h-screen lg:rounded-none lg:border-t-0 lg:border-l lg:border-violet-900/30 lg:bg-[#0a0818]/95 lg:shadow-none lg:backdrop-blur-2xl drawer-transition flex flex-col space-y-5 text-slate-100 ${
          analyticsPanelOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto lg:w-[420px] lg:translate-y-0' 
            : 'translate-y-full opacity-0 pointer-events-none lg:w-0 lg:translate-y-0 lg:opacity-0 lg:overflow-hidden lg:border-l-0'
        }`}
      >
        {/* Mobile Grab Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-2 mb-1 shrink-0 lg:hidden" />

        {!activeChartConfig ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setAnalyticsPanelOpen(false)}
              className="absolute top-0 left-0 p-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] btn-tactile focus-ring"
              title="Collapse Panel"
              aria-label="Collapse Analytics Panel"
            >
              <ChevronRight size={14} />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shadow-inner">
              <BarChart3 size={28} className="animate-pulse" />
            </div>
            <div className="max-w-xs space-y-1.5">
              <h3 className="text-xs font-bold text-white tracking-widest uppercase">Analytics Visualizer</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload CSV or database files and ask quantitative questions to see automated Recharts visualizations render here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Title & Action Buttons */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <button
                  onClick={() => setAnalyticsPanelOpen(false)}
                  className="p-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] shrink-0 mt-0.5 btn-tactile focus-ring"
                  title="Collapse Panel"
                >
                  <ChevronRight size={14} />
                </button>
                <div>
                  <h3 className="text-xs font-bold text-white max-w-[170px] truncate" title={title}>
                    {title}
                  </h3>
                  <span className="text-[9px] text-violet-400 font-bold tracking-widest uppercase flex items-center space-x-1 mt-0.5">
                    <Sparkles size={10} className="text-amber-400" />
                    <span>Interactive Visualizer</span>
                  </span>
                </div>
              </div>
              <div className="flex space-x-1.5 shrink-0">
                <button
                  onClick={handleExportPNG}
                  title="Download PNG Image"
                  className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white btn-tactile focus-ring border border-white/[0.08]"
                >
                  <Image size={13} />
                </button>
                <button
                  onClick={handleExportData}
                  title="Export Sliced JSON"
                  className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white btn-tactile focus-ring border border-white/[0.08]"
                >
                  <Download size={13} />
                </button>
              </div>
            </div>

            {/* Visualizer Mode Tabs */}
            <div className="flex border border-white/[0.08] p-1 rounded-xl bg-white/[0.02] shrink-0">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === 'chart'
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 shadow-md text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 size={11} />
                <span>Chart View</span>
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-[9px] font-bold tracking-widest uppercase transition-all ${
                  activeTab === 'data'
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 shadow-md text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table size={11} />
                <span>Raw Spreadsheet</span>
              </button>
            </div>

            {activeTab === 'chart' ? (
              <>
                {/* Chart type selector */}
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {[
                    { id: 'bar', label: 'Bar', icon: BarChart3 },
                    { id: 'line', label: 'Line', icon: LineChart },
                    { id: 'area', label: 'Area', icon: AreaIcon },
                    { id: 'pie', label: 'Pie', icon: PieChart }
                  ].map(btn => {
                    const Icon = btn.icon;
                    const active = chartType === btn.id;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => setChartType(btn.id)}
                        aria-label={`${btn.label} Chart View`}
                        className={`py-2 px-1.5 rounded-lg flex flex-col items-center justify-center space-y-1 btn-tactile focus-ring ${
                          active
                            ? 'bg-violet-600/30 border border-violet-500/40 text-violet-300 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon size={14} className={active ? 'scale-105 text-amber-400' : ''} />
                        <span className="text-[8px] font-bold uppercase tracking-wider">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Settings Controls */}
                <div className="flex items-center justify-between px-1">
                  {/* Palette selector */}
                  <div className="flex items-center space-x-2">
                    <Palette size={12} className="text-slate-500" />
                    <div className="flex space-x-1.5">
                      {[
                        { id: 'purpleGold', color: 'bg-gradient-to-r from-violet-500 to-amber-500' },
                        { id: 'emerald', color: 'bg-emerald-500' },
                        { id: 'sunset', color: 'bg-gradient-to-tr from-rose-500 to-orange-400' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setColorPalette(p.id)}
                          aria-label={`Select ${p.id} Theme`}
                          className={`w-4 h-4 rounded-full ${p.color} transition-all border focus-ring btn-tactile ${
                            colorPalette === p.id 
                              ? 'scale-125 border-white ring-2 ring-violet-500' 
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          title={`${p.id} Theme`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Grid & Label toggles */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowGrid(!showGrid)}
                      aria-label="Toggle Gridlines"
                      title="Toggle Gridlines"
                      className={`p-1.5 rounded-lg border btn-tactile focus-ring ${
                        showGrid 
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' 
                          : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Grid size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLabels(!showLabels)}
                      aria-label="Toggle Labels"
                      title="Toggle Labels"
                      className={`p-1.5 rounded-lg border btn-tactile focus-ring ${
                        showLabels 
                          ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' 
                          : 'border-white/[0.08] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Tag size={12} />
                    </button>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="h-72 w-full bg-[#0a0818] border border-white/[0.08] rounded-2xl p-3 shadow-xl flex items-center justify-center relative overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <RechartsBarChart data={data}>
                        <defs>
                          <linearGradient id="colorPurpleGold" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.95}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.35}/>
                          </linearGradient>
                          <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#047857" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorSunset" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#F97316" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e1a38" vertical={false} />}
                        <XAxis dataKey={xAxis} tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            background: '#0d0b1e', 
                            border: '1px solid rgba(139, 92, 246, 0.3)', 
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '9px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                        {activeYKeys.map((key, idx) => (
                          <Bar 
                            key={key}
                            name={key}
                            dataKey={key} 
                            fill={idx === 0 ? currentTheme.fill : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                            radius={[6, 6, 0, 0]}
                            label={showLabels ? { position: 'top', fontSize: 8, fill: '#f59e0b' } : false}
                          />
                        ))}
                        {data.length > 8 && (
                          <Brush 
                            dataKey={xAxis} 
                            height={12} 
                            stroke="#7c3aed" 
                            tickFormatter={() => ''}
                            wrapperStyle={{ bottom: -5 }}
                          />
                        )}
                      </RechartsBarChart>
                    ) : chartType === 'line' ? (
                      <RechartsLineChart data={data}>
                        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e1a38" vertical={false} />}
                        <XAxis dataKey={xAxis} tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            background: '#0d0b1e', 
                            border: '1px solid rgba(139, 92, 246, 0.3)', 
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '9px'
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                        {activeYKeys.map((key, idx) => (
                          <Line 
                            key={key}
                            name={key}
                            type="monotone" 
                            dataKey={key} 
                            stroke={idx === 0 ? currentTheme.primary : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3, fill: '#f59e0b' }}
                            label={showLabels ? { position: 'top', fontSize: 8, fill: '#f59e0b' } : false}
                          />
                        ))}
                        {data.length > 8 && (
                          <Brush 
                            dataKey={xAxis} 
                            height={12} 
                            stroke="#7c3aed" 
                            tickFormatter={() => ''}
                            wrapperStyle={{ bottom: -5 }}
                          />
                        )}
                      </RechartsLineChart>
                    ) : chartType === 'area' ? (
                      <RechartsAreaChart data={data}>
                        <defs>
                          <linearGradient id="colorPurpleArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e1a38" vertical={false} />}
                        <XAxis dataKey={xAxis} tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} stroke="#1e1a38" axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            background: '#0d0b1e', 
                            border: '1px solid rgba(139, 92, 246, 0.3)', 
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '9px'
                          }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '9px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                        {activeYKeys.map((key, idx) => (
                          <Area 
                            key={key}
                            name={key}
                            type="monotone" 
                            dataKey={key} 
                            stroke={idx === 0 ? currentTheme.primary : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                            fill="url(#colorPurpleArea)"
                            label={showLabels ? { position: 'top', fontSize: 8, fill: '#f59e0b' } : false}
                          />
                        ))}
                        {data.length > 8 && (
                          <Brush 
                            dataKey={xAxis} 
                            height={12} 
                            stroke="#7c3aed" 
                            tickFormatter={() => ''}
                            wrapperStyle={{ bottom: -5 }}
                          />
                        )}
                      </RechartsAreaChart>
                    ) : (
                      <RechartsPieChart>
                        <Pie
                          data={data}
                          dataKey={primaryY}
                          nameKey={xAxis}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={showLabels ? { fontSize: 8, fill: '#94a3b8' } : false}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={currentTheme.pieColors[index % currentTheme.pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            background: '#0d0b1e', 
                            border: '1px solid rgba(139, 92, 246, 0.3)', 
                            borderRadius: '10px',
                            color: '#f8fafc',
                            fontSize: '9px'
                          }} 
                        />
                      </RechartsPieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <>
                {/* Search Spreadsheet */}
                <div className="relative w-full shrink-0">
                  <Search size={12} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search spreadsheet records..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-white/[0.08] bg-[#0a0818] text-white text-[10px] focus:outline-none focus:border-violet-500 shadow-inner placeholder-slate-500"
                  />
                </div>

                {/* Raw Table */}
                <div className="h-72 w-full bg-[#0a0818] border border-white/[0.08] rounded-2xl overflow-auto shadow-xl">
                  {(() => {
                    const filteredRows = data.filter(row => {
                      if (!searchQuery.trim()) return true;
                      return Object.values(row).some(val => 
                        String(val).toLowerCase().includes(searchQuery.toLowerCase())
                      );
                    });

                    if (filteredRows.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                          <Table size={20} className="mb-1 opacity-50" />
                          <span>No matching rows found</span>
                        </div>
                      );
                    }

                    const headers = Object.keys(data[0] || {});

                    return (
                      <table className="w-full text-left border-collapse text-[9px]">
                        <thead className="bg-white/[0.04] border-b border-white/[0.08] sticky top-0 z-10">
                          <tr>
                            {headers.map(h => (
                              <th key={h} className="px-3 py-2 font-bold text-violet-300 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                              {headers.map((h, cIdx) => (
                                <td key={cIdx} className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{String(row[h] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Statistical Summary Panel */}
            <div className="border border-white/[0.08] bg-white/[0.02] rounded-2xl p-4 shadow-xl space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                <Calculator size={12} className="text-amber-400" />
                <span>Statistical Summary ({primaryY})</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 block font-semibold uppercase">Average</span>
                  <span className="text-sm font-black text-violet-300 mt-0.5 block">
                    {avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 block font-semibold uppercase">Maximum</span>
                  <span className="text-sm font-black text-amber-400 mt-0.5 block">
                    {max.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 block font-semibold uppercase">Minimum</span>
                  <span className="text-sm font-black text-slate-200 mt-0.5 block">
                    {min.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 block font-semibold uppercase">Total Sum</span>
                  <span className="text-sm font-black text-emerald-400 mt-0.5 block">
                    {sum.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Dataset Context Card */}
            <div className="border border-white/[0.08] bg-white/[0.02] rounded-2xl p-4 shadow-xl space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data Source Context</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Total Rows:</span>
                  <span className="font-bold text-white">{data.length}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Labels Column:</span>
                  <span className="font-bold text-violet-300">{xAxis}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Plotted Series:</span>
                  <span className="font-bold text-amber-400 truncate max-w-[130px]" title={activeYKeys.join(', ')}>
                    {activeYKeys.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChartRenderer;
