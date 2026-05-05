import React, { useState } from 'react';

export default function PerformanceAnalyticsView({ presets, historicalData, symbol }) {
    const [selection, setSelection] = React.useState({ strategy: '', currency: '', profile: '' });

    // 1. Calculate the backtest based on the SELECTED portfolio instead of the table
    const chartData = useMemo(() => {
        const { strategy, currency, profile } = selection;
        if (!strategy || !currency || !profile) return [];

        const portfolio = presets[strategy][currency][profile];
        if (!portfolio) return [];

        // Backtest logic: Assumes a starting value of 10,000 in the selected currency
        const sampleHistory = historicalData[portfolio[0].isin]?.Monthly_5Y.split(';') || [];
        
        return sampleHistory.map((_, index) => {
            let weightedValue = 0;
            portfolio.forEach(asset => {
                const history = historicalData[asset.isin]?.Monthly_5Y.split(';') || [];
                const price = parseFloat(history[index]) || 0;
                // Pulls data by applying the preset % target to a base 10k amount
                weightedValue += (price * (asset.target / 100));
            });

            return {
                month: `M${index + 1}`,
                value: parseFloat(weightedValue.toFixed(2))
            };
        });
    }, [selection, presets, historicalData]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Strategy Backtester</h3>
                        <p className="text-gray-500">Select a model portfolio to view 5-year historical performance.</p>
                    </div>
                    
                    {/* 2. Selection Dropdowns */}
                    <div className="flex gap-2">
                        <select 
                            className="p-2 border rounded-xl text-sm"
                            onChange={(e) => setSelection({...selection, strategy: e.target.value})}
                        >
                            <option value="">Select Strategy</option>
                            {Object.keys(presets).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        
                        {selection.strategy && (
                            <select 
                                className="p-2 border rounded-xl text-sm"
                                onChange={(e) => setSelection({...selection, currency: e.target.value})}
                            >
                                <option value="">Currency</option>
                                {Object.keys(presets[selection.strategy]).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}

                        {selection.currency && (
                            <select 
                                className="p-2 border rounded-xl text-sm"
                                onChange={(e) => setSelection({...selection, profile: e.target.value})}
                            >
                                <option value="">Risk Profile</option>
                                {Object.keys(presets[selection.strategy][selection.currency]).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {/* 3. The Chart (Standard Recharts implementation) */}
                <div className="h-[400px] w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="month" hide />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip formatter={(val) => [`${symbol}${val.toLocaleString()}`, 'Growth of 10k']} />
                                <Area type="monotone" dataKey="value" stroke="#ff3154" fill="#ff315420" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center border-2 border-dashed rounded-3xl text-gray-400">
                            Please complete the selection above to generate backtest.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

