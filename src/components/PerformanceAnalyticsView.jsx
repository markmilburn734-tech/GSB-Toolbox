import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Plus, X } from 'lucide-react';

const COLORS = ['#f43f5e', '#3b82f6', '#f59e0b', '#10b981']; // Rose, Blue, Amber, Emerald

export default function PerformanceAnalyticsView({ presets, historicalData, pricesData = {}, symbol = "$" }) {
  
  // Calculate dynamic YTD weeks
  const getYTDWeeks = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return Math.max(1, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)));
  };

  const TIMEFRAMES = {
    '3m':  { label: '3M',  source: 'Weekly_3Y',  points: 13 },
    '6m':  { label: '6M',  source: 'Weekly_3Y',  points: 26 },
    'ytd': { label: 'YTD', source: 'Weekly_3Y',  points: getYTDWeeks() },
    '1y':  { label: '1Y',  source: 'Weekly_3Y',  points: 52 },
    '3y':  { label: '3Y',  source: 'Weekly_3Y',  points: 156 },
    '5y':  { label: '5Y',  source: 'Monthly_5Y', points: 60 }
  };

  const [timeframe, setTimeframe] = useState('1y');
  const [selections, setSelections] = useState([
    { id: Date.now(), type: 'preset', strategy: '', currency: '', profile: '', assetIsin: '' }
  ]);

  // --- Handlers ---
  const addSelection = () => {
    if (selections.length >= 4) return;
    setSelections([...selections, { id: Date.now(), type: 'preset', strategy: '', currency: '', profile: '', assetIsin: '' }]);
  };

  const removeSelection = (id) => {
    setSelections(selections.filter(s => s.id !== id));
  };

  const updateSelection = (id, field, value) => {
    setSelections(selections.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        // Reset dependent fields
        if (field === 'type') {
            updated.strategy = ''; updated.profile = ''; updated.assetIsin = '';
        }
        if (field === 'strategy' || field === 'currency') updated.profile = '';
        if (field === 'currency' && updated.type === 'asset') updated.assetIsin = '';
        return updated;
    }));
  };

  // --- Data Engine ---
  const calculateSeries = (sel, timeframeConfig) => {
    let portfolio = [];
    
    // Build the portfolio composition based on selection type
    if (sel.type === 'preset') {
        if (!sel.strategy || !sel.currency || !sel.profile || !presets[sel.strategy]?.[sel.currency]?.[sel.profile]) return null;
        portfolio = presets[sel.strategy][sel.currency][sel.profile];
    } else {
        if (!sel.currency || !sel.assetIsin) return null;
        portfolio = [{ isin: sel.assetIsin, target: 100 }];
    }

    const { source, points } = timeframeConfig;
    
    // We map each asset's history string to an array of numbers
    const parsedHistories = portfolio.map(asset => {
        const hString = historicalData[asset.isin]?.[source];
        if (!hString || hString === "N/A") return [];
        return hString.split(';').map(v => parseFloat(v) || 0);
    });

    // Ensure we have some data to work with
    if (parsedHistories.every(h => h.length === 0)) return null;

    // Build the aligned series backwards (from today) so different length histories match up
    const alignedGrowth = new Array(points).fill(null);
    
    // Calculate initial base for percentage math
    let initialTotal = 0;
    portfolio.forEach((asset, i) => {
        const history = parsedHistories[i];
        if (!history || history.length === 0) return;
        const startIndex = Math.max(0, history.length - points);
        initialTotal += (history[startIndex] * (asset.target / 100));
    });

    if (initialTotal === 0) return null;

    // Fill the data points
    for (let p = 0; p < points; p++) {
        let currentTotal = 0;
        let hasData = false;

        portfolio.forEach((asset, i) => {
            const history = parsedHistories[i];
            if (!history || history.length === 0) return;
            
            // Align to the end of the arrays
            const historyIndex = history.length - points + p;
            
            if (historyIndex >= 0 && historyIndex < history.length) {
                currentTotal += (history[historyIndex] * (asset.target / 100));
                hasData = true;
            }
        });

        if (hasData) {
            const pctGrowth = ((currentTotal - initialTotal) / initialTotal) * 100;
            alignedGrowth[p] = parseFloat(pctGrowth.toFixed(2));
        }
    }

    return alignedGrowth;
  };

  const chartData = useMemo(() => {
    const config = TIMEFRAMES[timeframe];
    const seriesResults = selections.map(sel => calculateSeries(sel, config));
    
    // Generate uniform labels
    const labels = [];
    const now = new Date();
    const isWeekly = config.source.includes('Weekly');
    
    for (let i = 0; i < config.points; i++) {
        const d = new Date(now);
        if (isWeekly) {
            d.setDate(d.getDate() - (config.points - 1 - i) * 7);
        } else {
            d.setMonth(d.getMonth() - (config.points - 1 - i));
        }
        labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }

    // Merge into Recharts format
    const data = [];
    for (let i = 0; i < config.points; i++) {
        const point = { name: labels[i] };
        selections.forEach((sel, idx) => {
            const val = seriesResults[idx] ? seriesResults[idx][i] : null;
            point[`series_${idx}`] = val;
        });
        data.push(point);
    }
    return data;
  }, [selections, timeframe, presets, historicalData]);

  // Generate End-of-Period Stats
  const finalStats = useMemo(() => {
    if (chartData.length === 0) return [];
    const lastData = chartData[chartData.length - 1];
    return selections.map((sel, idx) => ({
       id: sel.id,
       name: sel.type === 'preset' ? (sel.profile || 'Preset') : (Object.values(pricesData[sel.currency] || {}).find(a => a.isin === sel.assetIsin)?.name || 'Asset'),
       return: lastData[`series_${idx}`]
    }));
  }, [chartData, selections, pricesData]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in">
      {/* Header & Controls Panel */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Performance Analytics</h3>
            <p className="text-slate-500 font-medium">Compare growth across portfolios and individual assets.</p>
          </div>
          <button 
            onClick={addSelection}
            disabled={selections.length >= 4}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-brand text-white hover:bg-brand3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand/20"
          >
            <Plus size={18}/> Add Comparison ({selections.length}/4)
          </button>
        </div>

        {/* Dynamic Selection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {selections.map((sel, idx) => (
            <div key={sel.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 shadow-sm relative group">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx] }}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Series {idx + 1}</span>
                 </div>
                 {selections.length > 1 && (
                    <button onClick={() => removeSelection(sel.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                        <X size={16} />
                    </button>
                 )}
              </div>

              <div className="space-y-3">
                  {/* Type & Currency Row */}
                  <div className="flex gap-2">
                      <select
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-brand/30 transition-colors"
                          value={sel.type}
                          onChange={(e) => updateSelection(sel.id, 'type', e.target.value)}
                      >
                          <option value="preset">Preset Strategy</option>
                          <option value="asset">Individual Asset</option>
                      </select>
                      
                      <select
                          className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-brand/30 transition-colors"
                          value={sel.currency}
                          onChange={(e) => updateSelection(sel.id, 'currency', e.target.value)}
                      >
                          <option value="">Curr</option>
                          <option value="USD">USD</option>
                          <option value="GBP">GBP</option>
                          <option value="EUR">EUR</option>
                          <option value="AUD">AUD</option>
                      </select>
                  </div>

                  {/* Dynamic Target Selection */}
                  {sel.type === 'preset' ? (
                      <div className="flex gap-2">
                          <select
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-brand/30"
                              value={sel.strategy}
                              onChange={(e) => updateSelection(sel.id, 'strategy', e.target.value)}
                          >
                              <option value="">Select Strategy</option>
                              {Object.keys(presets).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select
                              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-brand/30 disabled:opacity-50"
                              disabled={!sel.strategy || !sel.currency}
                              value={sel.profile}
                              onChange={(e) => updateSelection(sel.id, 'profile', e.target.value)}
                          >
                              <option value="">Risk Profile</option>
                              {sel.strategy && sel.currency && presets[sel.strategy]?.[sel.currency] && 
                                  Object.keys(presets[sel.strategy][sel.currency]).map(p => <option key={p} value={p}>{p}</option>)
                              }
                          </select>
                      </div>
                  ) : (
                      <select
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-brand/30 disabled:opacity-50"
                          disabled={!sel.currency}
                          value={sel.assetIsin}
                          onChange={(e) => updateSelection(sel.id, 'assetIsin', e.target.value)}
                      >
                          <option value="">Select an Asset...</option>
                          {sel.currency && pricesData[sel.currency] && 
                              Object.values(pricesData[sel.currency]).map(a => (
                                  <option key={a.isin} value={a.isin}>{a.name}</option>
                              ))
                          }
                      </select>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
          {Object.entries(TIMEFRAMES).map(([key, opt]) => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${
                timeframe === key
                  ? 'bg-brand text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative">
        {chartData.length > 0 ? (
          <div className="space-y-8">
            {/* Stat Row */}
            <div className="flex flex-wrap gap-8 border-b border-slate-100 pb-6">
               {finalStats.map((stat, idx) => stat.return !== undefined && stat.return !== null && (
                 <div key={stat.id} className={`flex-1 min-w-[120px] ${idx > 0 ? 'md:border-l border-slate-100 md:pl-8' : ''}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                        {stat.name}
                    </p>
                    <p className={`text-3xl font-black tracking-tight ${stat.return >= 0 ? 'text-emerald-500' : 'text-brand3'}`}>
                      {stat.return >= 0 ? '+' : ''}{stat.return.toFixed(2)}%
                    </p>
                 </div>
               ))}
            </div>

            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {selections.map((sel, idx) => (
                        <linearGradient key={`grad_${idx}`} id={`color_${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[idx]} stopOpacity={idx === 0 ? 0.2 : 0.05}/>
                            <stop offset="95%" stopColor={COLORS[idx]} stopOpacity={0}/>
                        </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  {/* Dynamic XAxis Label Truncation based on timeframe */}
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    dy={15}
                    interval={timeframe === '5y' ? 11 : timeframe === '3y' ? 25 : timeframe === '1y' ? 8 : timeframe === '6m' ? 4 : timeframe === '3m' ? 2 : Math.max(1, Math.floor(TIMEFRAMES.ytd.points / 5))}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                    tickFormatter={(val) => `${val}%`}
                    width={50}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 min-w-[200px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
                                {payload[0].payload.name}
                            </p>
                            <div className="space-y-3">
                                {payload.map((entry, idx) => (
                                    <div key={idx} className="flex justify-between items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                                            <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
                                                {finalStats[idx]?.name || `Series ${idx + 1}`}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-bold ${entry.value >= 0 ? 'text-emerald-400' : 'text-brand3'}`}>
                                            {entry.value}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Render Areas */}
                  {selections.map((sel, idx) => (
                     <Area 
                        key={sel.id}
                        type="monotone" 
                        dataKey={`series_${idx}`} 
                        stroke={COLORS[idx]} 
                        fill={`url(#color_${idx})`} 
                        strokeWidth={idx === 0 ? 3 : 2.5}
                        strokeDasharray={idx > 0 ? "4 4" : "0"}
                        animationDuration={800}
                     />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
             <div className="p-6 bg-slate-50 rounded-full mb-4">
                <TrendingUp size={40} className="text-slate-300" />
             </div>
             <p className="text-sm font-bold uppercase tracking-widest">Awaiting Selection</p>
             <p className="text-xs mt-2 text-slate-500">Configure your series above to visualize performance.</p>
          </div>
        )}
      </div>
    </div>
  );
}