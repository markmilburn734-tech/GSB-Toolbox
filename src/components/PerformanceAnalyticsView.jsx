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

const TIMEFRAME_OPTIONS = [
  { label: '3M', value: '3m', months: 3 },
  { label: '6M', value: '6m', months: 6 },
  { label: 'YTD', value: 'ytd', months: 5 },
  { label: '1Y', value: '1y', months: 12 },
  { label: '3Y', value: '3y', months: 36 },
  { label: '5Y', value: '5y', months: 60 },
];

export default function PerformanceAnalyticsView({ presets, historicalData, symbol = "$" }) {
  const [primary, setPrimary] = useState({ strategy: '', currency: '', profile: '' });
  const [comparison, setComparison] = useState({ strategy: '', profile: '' });
  const [isComparing, setIsComparing] = useState(false);
  const [timeframe, setTimeframe] = useState('5y');

  // Helper to calculate series data
  const calculateSeries = (sel, timeframeVal) => {
    if (!sel.strategy || !primary.currency || !sel.profile || !presets[sel.strategy]?.[primary.currency]?.[sel.profile]) {
      return null;
    }

    const portfolio = presets[sel.strategy][primary.currency][sel.profile];
    const firstAssetIsin = portfolio[0]?.isin;
    const historyString = historicalData[firstAssetIsin]?.Monthly_5Y || "";
    let fullHistory = historyString ? historyString.split(';') : [];

    const selectedTimeframe = TIMEFRAME_OPTIONS.find(t => t.value === timeframeVal);
    const monthsToShow = selectedTimeframe ? selectedTimeframe.months : 60;
    const startIndex = Math.max(0, fullHistory.length - monthsToShow);

    // Initial values for normalization
    let initialTotal = 0;
    portfolio.forEach(asset => {
      const history = historicalData[asset.isin]?.Monthly_5Y?.split(';') || [];
      const startPrice = parseFloat(history[startIndex]) || 0;
      initialTotal += (startPrice * (asset.target / 100));
    });

    return fullHistory.slice(startIndex).map((_, index) => {
      let currentTotal = 0;
      const dataIndex = startIndex + index;

      portfolio.forEach(asset => {
        const history = historicalData[asset.isin]?.Monthly_5Y?.split(';') || [];
        const price = parseFloat(history[dataIndex]) || 0;
        currentTotal += (price * (asset.target / 100));
      });

      // Calculate percentage growth relative to start of timeframe
      const percentageGrowth = ((currentTotal - initialTotal) / initialTotal) * 100;

      return {
        value: currentTotal * 100, // Normalized to 10k base roughly
        growth: parseFloat(percentageGrowth.toFixed(2))
      };
    });
  };

  const chartData = useMemo(() => {
    const primarySeries = calculateSeries(primary, timeframe);
    const compareSeries = isComparing ? calculateSeries(comparison, timeframe) : null;

    if (!primarySeries) return [];

    return primarySeries.map((d, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (primarySeries.length - 1 - i));
      const monthLabel = date.toLocaleString('default', { month: 'short', year: '2-digit' });

      return {
        name: monthLabel,
        primary: d.growth,
        primaryValue: d.value,
        comparison: compareSeries ? compareSeries[i]?.growth : null,
        comparisonValue: compareSeries ? compareSeries[i]?.value : null,
      };
    });
  }, [primary, comparison, isComparing, timeframe, presets, historicalData]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const last = chartData[chartData.length - 1];
    return {
      primaryReturn: last.primary,
      compareReturn: last.comparison,
    };
  }, [chartData]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Selection Control Panel */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900">Performance Comparison</h3>
            <p className="text-slate-500 text-sm">Analyze and compare portfolio growth in % over time.</p>
          </div>
          
          <button 
            onClick={() => setIsComparing(!isComparing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              isComparing 
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isComparing ? <X size={16}/> : <Plus size={16}/>}
            {isComparing ? "Remove Comparison" : "Add Comparison"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Selection */}
          <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-rose-500"></div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Primary Portfolio</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                value={primary.strategy}
                onChange={(e) => setPrimary({ ...primary, strategy: e.target.value, profile: '' })}
              >
                <option value="">Strategy</option>
                {Object.keys(presets).map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                value={primary.currency}
                onChange={(e) => setPrimary({ ...primary, currency: e.target.value, strategy: '', profile: '' })}
              >
                <option value="">Currency</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>

              <select
                className="col-span-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                disabled={!primary.strategy || !primary.currency}
                value={primary.profile}
                onChange={(e) => setPrimary({ ...primary, profile: e.target.value })}
              >
                <option value="">Profile</option>
                {primary.strategy && primary.currency && Object.keys(presets[primary.strategy][primary.currency] || {}).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Selection */}
          <div className={`space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-opacity ${!isComparing ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-400"></div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comparison Portfolio</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                value={comparison.strategy}
                onChange={(e) => setComparison({ ...comparison, strategy: e.target.value, profile: '' })}
              >
                <option value="">Strategy</option>
                {Object.keys(presets).map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                disabled={!comparison.strategy || !primary.currency}
                value={comparison.profile}
                onChange={(e) => setComparison({ ...comparison, profile: e.target.value })}
              >
                <option value="">Profile</option>
                {comparison.strategy && primary.currency && Object.keys(presets[comparison.strategy][primary.currency] || {}).map(p => (
                   <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          {TIMEFRAME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeframe(opt.value)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === opt.value
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative">
        {chartData.length > 0 ? (
          <div className="space-y-8">
            <div className="flex gap-8 border-b border-slate-100 pb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Return</p>
                <p className={`text-2xl font-black ${stats.primaryReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stats.primaryReturn >= 0 ? '+' : ''}{stats.primaryReturn}%
                </p>
              </div>
              {isComparing && stats.compareReturn !== undefined && (
                <div className="border-l border-slate-100 pl-8">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Comparison Return</p>
                  <p className={`text-2xl font-black ${stats.compareReturn >= 0 ? 'text-slate-600' : 'text-rose-500'}`}>
                    {stats.compareReturn >= 0 ? '+' : ''}{stats.compareReturn}%
                  </p>
                </div>
              )}
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    dy={10}
                    interval={timeframe === '5y' ? 11 : 0}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{payload[0].payload.name}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between gap-8 items-center">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                  <span className="text-xs text-slate-300">Primary</span>
                                </div>
                                <span className="text-sm font-bold text-rose-400">{payload[0].value}%</span>
                              </div>
                              {payload[1] && (
                                <div className="flex justify-between gap-8 items-center border-t border-slate-800 pt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                    <span className="text-xs text-slate-300">Comparison</span>
                                  </div>
                                  <span className="text-sm font-bold text-slate-300">{payload[1].value}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="primary" 
                    stroke="#f43f5e" 
                    fill="url(#primaryGrad)" 
                    strokeWidth={3}
                    animationDuration={1000}
                  />
                  {isComparing && (
                    <Area 
                      type="monotone" 
                      dataKey="comparison" 
                      stroke="#94a3b8" 
                      fill="transparent"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      animationDuration={1000}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
             <div className="p-6 bg-slate-50 rounded-full mb-4">
                <TrendingUp size={40} className="text-slate-200" />
             </div>
             <p className="text-sm font-bold uppercase tracking-widest">Awaiting Selection</p>
             <p className="text-xs mt-2">Select a primary strategy to generate the chart.</p>
          </div>
        )}
      </div>
    </div>
  );
}