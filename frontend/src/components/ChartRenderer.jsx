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
  Settings
} from 'lucide-react';

const ChartRenderer = () => {
  const { activeChartConfig, analyticsPanelOpen, setAnalyticsPanelOpen } = useContext(ApiContext);
  const [chartType, setChartType] = useState('bar');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'data'
  const [searchQuery, setSearchQuery] = useState('');
  const [colorPalette, setColorPalette] = useState('indigo'); // 'indigo', 'emerald', 'sunset'
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

  // If no chart config exists and closed, return clean hidden container
  if (!activeChartConfig && !analyticsPanelOpen) {
    return (
      <div className="w-0 overflow-hidden border-l-0 h-screen drawer-transition bg-slate-50/20 dark:bg-darkBg glass hidden lg:block" />
    );
  }

  const { data = [], xAxis = '', yAxis = '', title = 'Analytics Visualizer' } = activeChartConfig || {};

  // 1. Color Palette configurations
  const palettes = {
    indigo: {
      primary: '#6366F1',
      secondary: '#818CF8',
      gradientStart: '#6366F1',
      gradientEnd: '#4338CA',
      pieColors: ['#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#818CF8', '#A5B4FC'],
      fill: 'url(#colorIndigo)'
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

  const currentTheme = palettes[colorPalette];

  // 2. Multi-Series Detection (Find all numerical keys to enable overlay comparisons)
  const allKeys = data && data.length > 0 ? Object.keys(data[0] || {}) : [];
  const numericKeys = allKeys.filter(key => {
    if (key === xAxis || key === 'index' || key.toLowerCase().includes('id')) return false;
    // Check if at least one row has a valid numeric value for this key
    return data.some(row => {
      const val = Number(row[key]);
      return !isNaN(val) && val !== 0;
    });
  });

  // Fallback to configured yAxis if auto-detection is empty
  const activeYKeys = numericKeys.length > 0 ? numericKeys.slice(0, 3) : [yAxis];

  // 3. Statistical Calculations based on primary Y axis column
  const primaryY = activeYKeys[0];
  const numericValues = data.map(item => Number(item[primaryY])).filter(v => !isNaN(v));
  const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
  const avg = numericValues.length ? (sum / numericValues.length) : 0;
  const max = numericValues.length ? Math.max(...numericValues) : 0;
  const min = numericValues.length ? Math.min(...numericValues) : 0;

  // 4. Export JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${title.replace(/\s+/g, '_')}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 5. Export PNG (High-DPI Clientside SVG Render)
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
      // Set high DPI dimensions (2x scaling)
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;
      const context = canvas.getContext('2d');
      context.scale(2, 2);

      // Apply background color matching current mode
      const isDark = document.documentElement.classList.contains('dark');
      context.fillStyle = isDark ? '#0b0f19' : '#ffffff';
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
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          analyticsPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setAnalyticsPanelOpen(false)}
        aria-hidden="true"
      />

      {/* Main Drawer Container: Mobile Bottom-Sheet vs Desktop Right Panel */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Analytics Chart Visualizer"
        className={`fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50 dark:bg-darkBg p-6 overflow-y-auto shadow-2xl bottom-sheet-transition lg:relative lg:inset-auto lg:h-screen lg:rounded-none lg:border-t-0 lg:border-l lg:bg-slate-50/20 lg:shadow-none lg:glass drawer-transition flex flex-col space-y-6 ${
          analyticsPanelOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto lg:w-[420px] lg:translate-y-0' 
            : 'translate-y-full opacity-0 pointer-events-none lg:w-0 lg:translate-y-0 lg:opacity-0 lg:overflow-hidden lg:border-l-0'
        }`}
      >
        {/* Mobile Grab Handle Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-2 mb-1 shrink-0 lg:hidden" />

        {!activeChartConfig ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-5 relative">
            <button
              type="button"
              onClick={() => setAnalyticsPanelOpen(false)}
              className="absolute top-0 left-0 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 btn-tactile focus-ring"
              title="Collapse Panel"
              aria-label="Collapse Analytics Panel"
            >
              <ChevronRight size={14} />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
              <BarChart3 size={28} className="animate-pulse" />
            </div>
            <div className="max-w-xs space-y-1.5">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Analytics Insights</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Upload CSV or database files and ask quantitative questions to see automated charts render here.
              </p>
            </div>
          </div>
        ) : (
          <>
      {/* Title & Actions */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <button
            onClick={() => setAnalyticsPanelOpen(false)}
            className="p-1 rounded-md border border-slate-200/50 dark:border-slate-800/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 mt-0.5 btn-tactile focus-ring"
            title="Collapse Panel"
          >
            <ChevronRight size={12} />
          </button>
          <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[170px] truncate" title={title}>
            {title}
          </h3>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase flex items-center space-x-1 mt-0.5">
            <Info size={10} className="text-electricIndigo" />
            <span>Interactive Visualizer</span>
          </span>
        </div>
      </div>
        <div className="flex space-x-1 shrink-0">
          <button
            onClick={handleExportPNG}
            title="Download PNG Image"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 btn-tactile focus-ring border border-slate-200/20"
          >
            <Image size={12} />
          </button>
          <button
            onClick={handleExportData}
            title="Export Sliced JSON"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 btn-tactile focus-ring border border-slate-200/20"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      {/* Visualizer Mode Tabs */}
      <div className="flex border border-slate-200/50 dark:border-slate-800/50 p-0.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 shrink-0">
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[9px] font-bold tracking-wide uppercase transition-all ${
            activeTab === 'chart'
              ? 'bg-white dark:bg-slate-800 shadow-sm text-electricIndigo'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={11} />
          <span>Chart View</span>
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-md text-[9px] font-bold tracking-wide uppercase transition-all ${
            activeTab === 'data'
              ? 'bg-white dark:bg-slate-800 shadow-sm text-electricIndigo'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <Table size={11} />
          <span>Raw Spreadsheet</span>
        </button>
      </div>

      {activeTab === 'chart' ? (
        <>
          {/* Chart selector controls */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200/10">
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
                  className={`py-1.5 px-1.5 rounded-lg flex flex-col items-center justify-center space-y-1 btn-tactile focus-ring ${
                    active
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-electricIndigo font-bold'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} className={active ? 'scale-105' : ''} />
                  <span className="text-[8px] font-semibold">{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Options Row */}
          <div className="flex items-center justify-between px-1">
            {/* Palette */}
            <div className="flex items-center space-x-1.5">
              <Palette size={12} className="text-slate-400" />
              <div className="flex space-x-1">
                {[
                  { id: 'indigo', color: 'bg-indigo-500' },
                  { id: 'emerald', color: 'bg-emerald-500' },
                  { id: 'sunset', color: 'bg-gradient-to-tr from-rose-500 to-orange-400' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setColorPalette(p.id)}
                    aria-label={`Select ${p.id} Theme`}
                    className={`w-3.5 h-3.5 rounded-full ${p.color} transition-all border focus-ring btn-tactile ${
                      colorPalette === p.id 
                        ? 'scale-125 border-slate-900 dark:border-white ring-1 ring-offset-1 ring-electricIndigo dark:ring-offset-darkBg' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    title={`${p.id} Theme`}
                  />
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                aria-label="Toggle Gridlines"
                title="Toggle Gridlines"
                className={`p-1.5 rounded-lg border btn-tactile focus-ring ${
                  showGrid 
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-electricIndigo' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-electricIndigo' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Tag size={12} />
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="h-72 w-full bg-white dark:bg-[#0E1526]/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-3 shadow-sm flex items-center justify-center relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <RechartsBarChart data={data}>
                  <defs>
                    <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#4338CA" stopOpacity={0.2}/>
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
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#33415510" vertical={false} />}
                  <XAxis dataKey={xAxis} tick={{ fontSize: 7 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 7 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                  {activeYKeys.map((key, idx) => (
                    <Bar 
                      key={key}
                      name={key}
                      dataKey={key} 
                      fill={idx === 0 ? currentTheme.fill : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                      radius={[4, 4, 0, 0]}
                      label={showLabels ? { position: 'top', fontSize: 7, fill: '#94a3b8' } : false}
                    />
                  ))}
                  {data.length > 8 && (
                    <Brush 
                      dataKey={xAxis} 
                      height={12} 
                      stroke="#94a3b8" 
                      tickFormatter={() => ''}
                      wrapperStyle={{ bottom: -5 }}
                    />
                  )}
                </RechartsBarChart>
              ) : chartType === 'line' ? (
                <RechartsLineChart data={data}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#33415510" vertical={false} />}
                  <XAxis dataKey={xAxis} tick={{ fontSize: 7 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 7 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '8px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                  {activeYKeys.map((key, idx) => (
                    <Line 
                      key={key}
                      name={key}
                      type="monotone" 
                      dataKey={key} 
                      stroke={idx === 0 ? currentTheme.primary : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      label={showLabels ? { position: 'top', fontSize: 7, fill: '#94a3b8' } : false}
                    />
                  ))}
                  {data.length > 8 && (
                    <Brush 
                      dataKey={xAxis} 
                      height={12} 
                      stroke="#94a3b8" 
                      tickFormatter={() => ''}
                      wrapperStyle={{ bottom: -5 }}
                    />
                  )}
                </RechartsLineChart>
              ) : chartType === 'area' ? (
                <RechartsAreaChart data={data}>
                  <defs>
                    <linearGradient id="colorIndigoArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorEmeraldArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorSunsetArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#33415510" vertical={false} />}
                  <XAxis dataKey={xAxis} tick={{ fontSize: 7 }} stroke="#94a3b8" tickLine={false} />
                  <YAxis tick={{ fontSize: 7 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '8px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '8px', color: '#94a3b8' }} verticalAlign="top" height={24} />
                  {activeYKeys.map((key, idx) => (
                    <Area 
                      key={key}
                      name={key}
                      type="monotone" 
                      dataKey={key} 
                      stroke={idx === 0 ? currentTheme.primary : currentTheme.pieColors[(idx + 1) % currentTheme.pieColors.length]}
                      fill={idx === 0 
                        ? (colorPalette === 'indigo' ? 'url(#colorIndigoArea)' : colorPalette === 'emerald' ? 'url(#colorEmeraldArea)' : 'url(#colorSunsetArea)')
                        : 'transparent'
                      }
                      label={showLabels ? { position: 'top', fontSize: 7, fill: '#94a3b8' } : false}
                    />
                  ))}
                  {data.length > 8 && (
                    <Brush 
                      dataKey={xAxis} 
                      height={12} 
                      stroke="#94a3b8" 
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
                    outerRadius={55}
                    label={showLabels ? { fontSize: 7, fill: '#94a3b8' } : false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={currentTheme.pieColors[index % currentTheme.pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '8px'
                    }} 
                  />
                </RechartsPieChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          {/* Spreadsheet search filter */}
          <div className="relative w-full shrink-0">
            <Search size={12} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spreadsheet records..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-[#0E1526]/50 text-slate-800 dark:text-slate-100 text-[10px] focus:outline-none focus:border-electricIndigo shadow-inner placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Spreadsheet Raw Table container */}
          <div className="h-72 w-full bg-white dark:bg-[#0E1526]/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl overflow-auto shadow-sm">
            {(() => {
              const filteredRows = data.filter(row => {
                if (!searchQuery.trim()) return true;
                return Object.values(row).some(val => 
                  String(val).toLowerCase().includes(searchQuery.toLowerCase())
                );
              });

              if (filteredRows.length === 0) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                    <Table size={20} className="mb-1 opacity-50" />
                    <span>No matching rows found</span>
                  </div>
                );
              }

              const headers = Object.keys(data[0] || {});

              return (
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-10">
                    <tr>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    {filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {headers.map((h, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{String(row[h] ?? '')}</td>
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
      <div className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-[#0E1526]/50 rounded-xl p-3.5 shadow-sm space-y-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
          <Calculator size={11} className="text-electricIndigo" />
          <span>Statistical Summary ({primaryY})</span>
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/20">
            <span className="text-[9px] text-slate-400 block">Average</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">
              {avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/20">
            <span className="text-[9px] text-slate-400 block">Maximum</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">
              {max.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/20">
            <span className="text-[9px] text-slate-400 block">Minimum</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">
              {min.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200/20">
            <span className="text-[9px] text-slate-400 block">Sum</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">
              {sum.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Dataset Summary card */}
      <div className="border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-[#0E1526]/50 rounded-xl p-3.5 shadow-sm space-y-1.5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data Source Context</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-[9px]">
            <span className="text-slate-400">Total Rows:</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{data.length}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-slate-400">Labels Column:</span>
            <span className="font-semibold text-routeTeal">{xAxis}</span>
          </div>
          <div className="flex justify-between text-[9px]">
            <span className="text-slate-400">Plotted Series:</span>
            <span className="font-semibold text-routeCoral truncate max-w-[120px]" title={activeYKeys.join(', ')}>
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
