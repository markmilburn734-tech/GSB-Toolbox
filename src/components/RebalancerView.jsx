import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Plus, DollarSign, TrendingUp, AlertCircle, Trash2, ChevronRight, ArrowLeft, Check, X } from './Icons';
import { EXCHANGE_RATES, BAKED_PRICES } from '../constants';


export default function RebalancerView({ presets, symbol, currency, setActiveCurrency, pricesData}) {
            const [cashFlow, setCashFlow] = useState(0);
            const [isFetching, setIsFetching] = useState(false);
            const [presetModalOpen, setPresetModalOpen] = useState(false);
            const [selectionPath, setSelectionPath] = useState({ category: null, currency: null });
            
            // Replace your existing Assets State with this:
            const [assets, setAssets] = useState([
                { id: 1, name: "iShares Treasury Bond 1-3yr UCITS ETF", isin: "IE00B14X4S71", price: 0, units: 0, target: 20.00 },
                { id: 2, name: "BlackRock ICS US Dollar Liquidity Fund", isin: "IE0004809582", price: 0, units: 0, target: 19.50 },
                { id: 3, name: "iShares VII plc Core S&P 500 UCITS ETF Acc USD", isin: "IE00B5BMR087", price: 0, units: 0, target: 34.50 },
            ]);

            useEffect(() => {
    setAssets(prev => prev.map(asset => {
        // 1. Static Assets: Cash is always 1.00 in the local context
        if (asset.isin === "N/A") return { ...asset, price: 1.00 };

        // 2. Priority 1: Use Native Baked Data if it exists for this currency
        const nativeData = pricesData[currency];
        const nativeEntry = nativeData ? Object.values(nativeData).find(p => p.isin === asset.isin) : null;

        if (nativeEntry) {
            return { ...asset, price: nativeEntry.price };
        }

        // 3. Priority 2: Cross-Currency Conversion
        // Find the asset in the most complete list (USD) to use as the base
        const usdBakedData = pricesData['USD'];
        const baseAsset = Object.values(usdBakedData).find(p => p.isin === asset.isin);
        
        if (baseAsset) {
            // Get the rate from USD to the target currency
            // This works for AED (3.6725), GBP (0.74), etc.
            const conversionRate = EXCHANGE_RATES["USD"]?.[currency] || 1;
            const convertedPrice = baseAsset.price * conversionRate;

            return { ...asset, price: parseFloat(convertedPrice.toFixed(2))};
        }

        // 4. Fallback: If asset isn't found anywhere, keep previous price
        return asset;
    }));
}, [currency, pricesData]);

            // Calculations
            // FIXED: Explicitly use Number() to prevent string concatenation/NaN errors during calc
            const totalCurrentValue = useMemo(() => assets.reduce((sum, asset) => sum + (Number(asset.price || 0) * Number(asset.units || 0)), 0), [assets]);
            const totalWeight = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.target || 0), 0), [assets]);
            const totalNewValue = totalCurrentValue + (parseFloat(cashFlow) || 0);

            const formatCurrency = (val) => {
                return new Intl.NumberFormat('en-GB', { 
                    style: 'currency', 
                    currency: currency, // Now dynamically uses GBP, USD, etc.
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2
                }).format(val || 0);
            };

            // Handlers
            const handleUpdateAsset = (id, field, value) => {
                setAssets(prev => prev.map(asset => {
                    if (asset.id === id) {
                        // We allow strings while typing (so you can type "10.") 
                        // but the calculations will treat them as numbers.
                        return { ...asset, [field]: value };
                    }
                    return asset;
                }));
            };

            const addRow = () => setAssets(prev => [...prev, { id: Date.now(), name: "New Asset", isin: "", price: 0, units: 0, target: 0 }]);
            const removeRow = (id) => setAssets(prev => prev.filter(a => a.id !== id));
            const resetData = () => { if (window.confirm("Clear all rows?")) setAssets([]); };

            // Preset Modal Logic
            const navigatePreset = (level, value) => setSelectionPath(prev => ({ ...prev, [level]: value }));
            const resetPresetNav = () => setSelectionPath({ category: null, currency: null });

            const handlePresetSelect = (assetsToLoad) => {
    // Safety check if user has already entered data
    if (assets.length > 0 && !window.confirm("Replace current portfolio?")) return;

    // Use the currency from the selection path (e.g., 'GBP', 'USD', 'AED')
    const selectedCurr = selectionPath.currency;

    // 1. GLOBAL SYNC: This line updates the main app currency to match the model
    if (selectedCurr && setActiveCurrency) {
        setActiveCurrency(selectedCurr);
    }

    const newAssets = assetsToLoad.map((a, i) => {
        let foundPrice = 0;
        // Look up price in the BAKED_PRICES for the specific currency of the model
        if (selectedCurr && BAKED_PRICES[selectedCurr]) {
            const priceEntry = Object.values(BAKED_PRICES[selectedCurr]).find(p => p.isin === a.isin);
            foundPrice = priceEntry ? priceEntry.price : (a.isin === "N/A" ? 1.00 : 0);
        }

        return {
            id: Date.now() + i,
            name: a.name,
            isin: a.isin,
            price: parseFloat(Number(foundPrice).toFixed(2)),
            units: 0,
            target: a.target
        };
    });

    setAssets(newAssets);
    setPresetModalOpen(false);
    resetPresetNav(); // Clear the modal path for next time
};


            // Preset Modal Renderer
            const renderModalContent = () => {
                const { category, currency } = selectionPath;
                if (!category) {
                    return (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Strategy</h4>
                            {Object.keys(presets).map(cat => (
                                <button key={cat} onClick={() => navigatePreset('category', cat)} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand5 hover:bg-brand6 transition-all group text-left">
                                    <span className="font-medium text-gray-800 group-hover:text-brand3">{cat}</span>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand3" />
                                </button>
                            ))}
                        </div>
                    );
                }
                if (!currency) {
                    return (
                        <div className="space-y-2">
                            <button onClick={() => navigatePreset('category', null)} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Currency</h4>
                            {Object.keys(presets[category] || {}).map(curr => (
                                <button key={curr} onClick={() => navigatePreset('currency', curr)} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand5 hover:bg-brand6 transition-all group text-left">
                                    <span className="font-medium text-gray-800 group-hover:text-brand3">{curr}</span>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand3" />
                                </button>
                            ))}
                        </div>
                    );
                }
                return (
                    <div className="space-y-2">
                        <button onClick={() => navigatePreset('currency', null)} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Risk Profile</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {Object.entries(presets[category][currency] || {}).map(([profileName, items]) => (
                                <button key={profileName} onClick={() => handlePresetSelect(items)} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:border-brand3 hover:ring-1 hover:ring-brand3 rounded-xl text-left transition-all group">
                                    <div><span className="block font-medium text-gray-800 group-hover:text-brand3">{profileName}</span><span className="text-xs text-gray-400">{items.length} assets</span></div>
                                    <Check className="w-4 h-4 text-brand opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </div>
                );
            };

            return (
                <div className="max-w-7xl mx-auto px-4 py-8 relative animate-in fade-in">
                    {/* Preset Modal */}
                    {presetModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="bg-brand px-6 py-4 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-2 text-white"><BookOpen className="w-5 h-5" /><h3 className="font-bold text-lg">Load Portfolio Preset</h3></div>
                                    <button onClick={() => { setPresetModalOpen(false); resetPresetNav(); }} className="text-white/80 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 overflow-y-auto">{renderModalContent()}</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Main Interface */}
                    <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1"><div className="bg-brand p-2 rounded-lg"><GSB className="w-6 h-6 text-white" /></div><h1 className="text-3xl font-bold text-gray-800 tracking-tight">Portfolio Rebalancer</h1></div>
                            <p className="text-gray-500 ml-1">Weight your portfolio based on cash flow and live market prices.</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-w-[200px] hover:shadow-md">
                            <label className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Projected Value</label>
                            <span className="text-3xl font-mono font-bold text-brand tracking-tight">{formatCurrency(totalNewValue)}</span>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Investment / Withdrawal</label>
                            <div className="relative group"><div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign className="w-5 h-5" /></div><input type="number" value={cashFlow} onChange={(e) => setCashFlow(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand3 outline-none transition-all font-mono text-lg input-no-spinner" placeholder="0" /></div>
                        </div>
                        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex gap-8 md:gap-12 w-full md:w-auto">
                                <div><span className="block text-xs font-bold uppercase text-gray-400 mb-1">Current Holdings</span><span className="text-xl font-semibold text-gray-900">{formatCurrency(totalCurrentValue)}</span></div>
                                <div><span className="block text-xs font-bold uppercase text-gray-400 mb-1">Target Total</span><div className="flex items-center gap-2"><span className={`text-xl font-semibold ${totalWeight >= 99.9 && totalWeight <= 100.1 ? 'text-emerald-600' : 'text-amber-500'}`}>{totalWeight.toFixed(2)}%</span>{(totalWeight < 99 || totalWeight > 101) && (<AlertCircle className="w-4 h-4 text-amber-500" />)}</div></div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
                                <button onClick={() => setPresetModalOpen(true)} className="flex-1 md:flex-none justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow"><BookOpen className="w-4 h-4" /> Load Preset</button>
                                <button onClick={addRow} className="flex-1 md:flex-none justify-center bg-brand hover:bg-brand3 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow"><Plus className="w-4 h-4" /> Add Asset</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">Asset / ISIN</th><th className="px-4 py-4 w-32">Live Price ({symbol})</th><th className="px-4 py-4 w-32">Units</th><th className="px-4 py-4 w-32">Value</th><th className="px-4 py-4 w-24">Curr %</th><th className="px-4 py-4 w-24 bg-brand6/50 text-brand3">Target %</th><th className="px-6 py-4 text-right">Rebalance Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.length === 0 ? (<tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No assets loaded. Click "Load Preset" or "Add Asset".</td></tr>) : (
                                        assets.map((asset) => {
                                            const currentVal = Number(asset.price || 0) * Number(asset.units || 0);
                                            const currentPct = totalCurrentValue > 0 ? (currentVal / totalCurrentValue) * 100 : 0;
                                            const targetVal = totalNewValue * (Number(asset.target || 0) / 100);
                                            const diffVal = targetVal - currentVal;
                                            const diffUnits = Number(asset.price || 0) > 0 ? diffVal / asset.price : 0;
                                            const isBuy = diffVal > 0.01;
                                            const isSell = diffVal < -0.01;
                                            const isNeutral = !isBuy && !isSell;
                                            return (
                                                <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4"><div className="flex flex-col gap-1.5"><input type="text" value={asset.name} onChange={(e) => handleUpdateAsset(asset.id, 'name', e.target.value)} className="bg-transparent font-bold text-gray-800 placeholder-gray-300 outline-none w-full" placeholder="Asset Name" /><div className="flex items-center gap-3"><button onClick={() => removeRow(asset.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button><div className="h-4 w-px bg-gray-200"></div><input type="text" placeholder="ISIN / Ticker" value={asset.isin} onChange={(e) => handleUpdateAsset(asset.id, 'isin', e.target.value)} className="bg-transparent text-[10px] text-gray-500 uppercase tracking-widest outline-none font-medium placeholder-gray-300 w-full" /></div></div></td>
                                                    <td className="px-4 py-4"><input type="number" step="0.01" value={asset.price} onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 py-1.5 text-sm font-mono outline-none input-no-spinner" /></td>
                                                    <td className="px-4 py-4"><input type="number" step="0.0001" value={asset.units} onChange={(e) => handleUpdateAsset(asset.id, 'units', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 py-1.5 text-sm font-mono outline-none input-no-spinner" /></td>
                                                    <td className="px-4 py-4"><div className="text-sm font-mono text-gray-700 bg-gray-50/50 py-1.5 px-2 rounded-lg">{formatCurrency(currentVal)}</div></td>
                                                    <td className="px-4 py-4"><div className="text-xs font-mono text-gray-500 py-1.5 px-2">{currentPct.toFixed(2)}%</div></td>
                                                    <td className="px-4 py-4 bg-brand6/30"><div className="relative flex items-center"><input type="number" step="0.01" value={asset.target} onChange={(e) => handleUpdateAsset(asset.id, 'target', e.target.value)} className="w-full bg-white border border-indigo-200 focus:border-brand3 rounded-lg pl-2 pr-6 py-1.5 text-sm font-bold text-brand3 text-center outline-none input-no-spinner" /><span className="absolute right-3 text-brand5 text-[10px] pointer-events-none">%</span></div></td>
                                                    <td className="px-6 py-4">{isNeutral ? <span className="text-gray-300 font-mono text-right block">—</span> : <div className={`flex flex-col items-end ${isBuy ? 'animate-pulse-subtle' : ''}`}><span className={`block font-bold text-sm ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>{isBuy ? 'BUY' : 'SELL'} {formatCurrency(Math.abs(diffVal))}</span><span className="text-[10px] text-gray-400 font-medium mt-0.5">{isBuy ? '+' : ''}{diffUnits.toFixed(2)} units</span></div>}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }
