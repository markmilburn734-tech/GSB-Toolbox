import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Plus, DollarSign, TrendingUp, Trash2, ChevronRight, ArrowLeft, Check, X } from './Icons';
import { EXCHANGE_RATES } from '../constants';
import { GSB } from './Icons';

export default function RebalancerView({ presets, symbol, currency, setActiveCurrency, pricesData }) {
    const [cashFlow, setCashFlow] = useState(0);
    const [presetModalOpen, setPresetModalOpen] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [selectionPath, setSelectionPath] = useState({ category: null, currency: null });
    
    // Initial State
    const [assets, setAssets] = useState([
        { id: 1, name: "iShares Treasury Bond 1-3yr UCITS ETF", isin: "IE00B14X4S71", price: 0, units: 0, target: 20.00 },
        { id: 2, name: "BlackRock ICS US Dollar Liquidity Fund", isin: "IE0004809582", price: 0, units: 0, target: 19.50 },
        { id: 3, name: "iShares VII plc Core S&P 500 UCITS ETF Acc USD", isin: "IE00B5BMR087", price: 0, units: 0, target: 34.50 },
    ]);

    // Single source of truth for Price + Currency Conversion
    const getLivePrice = (isin, targetCurrency) => {
        if (!isin || isin === "N/A") return 0;

        let foundAsset = null;
        let sourceCurrency = null;

        // Search through all currency buckets in pricesData
        for (const [currCode, assetMap] of Object.entries(pricesData)) {
            const match = Object.values(assetMap).find(p => p.isin === isin);
            if (match) {
                foundAsset = match;
                sourceCurrency = currCode;
                break;
            }
        }

        if (foundAsset) {
            if (sourceCurrency === targetCurrency) return foundAsset.price;
            const conversionRate = EXCHANGE_RATES[sourceCurrency]?.[targetCurrency] || 1;
            return parseFloat((foundAsset.price * conversionRate).toFixed(2));
        }
        return 0;
    };

    // Row Handlers
    const addBlankRow = () => {
        setAssets(prev => [...prev, { id: Date.now(), name: "New Asset", isin: "", price: 0, units: 0, target: 0 }]);
        setAddMenuOpen(false);
    };

    const addExistingAsset = (asset) => {
        const livePrice = getLivePrice(asset.isin, currency);
        setAssets(prev => [...prev, { 
            id: Date.now(), 
            name: asset.name, 
            isin: asset.isin, 
            price: livePrice, 
            units: 0, 
            target: 0 
        }]);
        setAddMenuOpen(false);
    };

    const removeRow = (id) => setAssets(prev => prev.filter(a => a.id !== id));

    const handleUpdateAsset = (id, field, value) => {
        setAssets(prev => prev.map(asset => {
            if (asset.id === id) {
                const updated = { ...asset, [field]: value };
                if (field === 'isin' && value) {
                    const livePrice = getLivePrice(value, currency);
                    if (livePrice > 0) updated.price = livePrice;
                }
                return updated;
            }
            return asset;
        }));
    };

    // Calculations
    const totalCurrentValue = useMemo(() => assets.reduce((sum, asset) => sum + (Number(asset.price || 0) * Number(asset.units || 0)), 0), [assets]);
    const totalWeight = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.target || 0), 0), [assets]);
    const totalNewValue = totalCurrentValue + (parseFloat(cashFlow) || 0);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: currency, 
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(val || 0);
    };

    // Effect: Update prices when currency or data changes
    useEffect(() => {
        setAssets(prev => prev.map(asset => ({
            ...asset,
            price: getLivePrice(asset.isin, currency) || asset.price
        })));
    }, [currency, pricesData]);

    const renderModalContent = () => {
        const { category, currency: selectedCurrency } = selectionPath;
        if (!category) {
            return (
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Strategy</h4>
                    {Object.keys(presets).map(cat => (
                        <button key={cat} onClick={() => setSelectionPath(p => ({...p, category: cat}))} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand5 hover:bg-brand6 transition-all group text-left">
                            <span className="font-medium text-gray-800 group-hover:text-brand3">{cat}</span>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand3" />
                        </button>
                    ))}
                </div>
            );
        }
        if (!selectedCurrency) {
            return (
                <div className="space-y-2">
                    <button onClick={() => setSelectionPath(p => ({...p, category: null}))} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Currency</h4>
                    {Object.keys(presets[category] || {}).map(curr => (
                        <button key={curr} onClick={() => setSelectionPath(p => ({...p, currency: curr}))} className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-brand5 hover:bg-brand6 transition-all group text-left">
                            <span className="font-medium text-gray-800 group-hover:text-brand3">{curr}</span>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand3" />
                        </button>
                    ))}
                </div>
            );
        }
        return (
            <div className="space-y-2">
                <button onClick={() => setSelectionPath(p => ({...p, currency: null}))} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Risk Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {Object.entries(presets[category][selectedCurrency] || {}).map(([profileName, items]) => (
                        <button key={profileName} onClick={() => {
                            const newAssets = items.map((a, i) => ({
                                id: Date.now() + i,
                                name: a.name,
                                isin: a.isin,
                                price: getLivePrice(a.isin, selectedCurrency),
                                units: 0,
                                target: a.target
                            }));
                            setAssets(newAssets);
                            setPresetModalOpen(false);
                            if (setActiveCurrency) setActiveCurrency(selectedCurrency);
                        }} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 hover:border-brand3 hover:ring-1 hover:ring-brand3 rounded-xl text-left transition-all group">
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
            {/* Modal */}
            {presetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-brand px-6 py-4 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-2 text-white"><BookOpen className="w-5 h-5" /><h3 className="font-bold text-lg">Load Portfolio Preset</h3></div>
                            <button onClick={() => setPresetModalOpen(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">{renderModalContent()}</div>
                    </div>
                </div>
            )}
            
            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-brand p-2 rounded-lg"><GSB className="w-6 h-6 text-white" /></div>
                        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Portfolio Rebalancer</h1>
                    </div>
                    <p className="text-gray-500 ml-1">Weight your portfolio based on live market prices.</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col min-w-[200px]">
                    <label className="text-xs font-bold uppercase text-gray-400 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Projected Value</label>
                    <span className="text-3xl font-mono font-bold text-brand tracking-tight">{formatCurrency(totalNewValue)}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Investment / Withdrawal</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><DollarSign className="w-5 h-5" /></div>
                        <input type="number" value={cashFlow} onChange={(e) => setCashFlow(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg" placeholder="0" />
                    </div>
                </div>
                
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex gap-8 w-full md:w-auto">
                        <div><span className="block text-xs font-bold uppercase text-gray-400 mb-1">Current Holdings</span><span className="text-xl font-semibold text-gray-900">{formatCurrency(totalCurrentValue)}</span></div>
                        <div><span className="block text-xs font-bold uppercase text-gray-400 mb-1">Target Total</span><span className={`text-xl font-semibold ${Math.abs(totalWeight - 100) < 0.1 ? 'text-emerald-600' : 'text-amber-500'}`}>{totalWeight.toFixed(2)}%</span></div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto relative">
                        <button onClick={() => setPresetModalOpen(true)} className="flex-1 justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> Load Preset
                        </button>

                        <div className="relative flex-1 min-w-[160px]">
                            <button 
                                onClick={() => setAddMenuOpen(!addMenuOpen)} 
                                className="w-full justify-center bg-brand hover:bg-brand3 text-white px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Asset
                            </button>

                            {addMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in zoom-in-95 duration-100 origin-top-right">
                                        <button onClick={addBlankRow} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100">
                                            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500"><Plus className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Blank Asset</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-tight">Manual Entry</p>
                                            </div>
                                        </button>
                                        <div className="max-h-64 overflow-y-auto">
                                            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 sticky top-0 backdrop-blur-sm">Quick Add ({currency})</div>
                                            {Object.values(pricesData[currency] || {}).map((asset) => (
                                                <button 
                                                    key={asset.isin} 
                                                    onClick={() => addExistingAsset(asset)}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-brand6 transition-colors group flex flex-col"
                                                >
                                                    <span className="text-xs font-bold text-gray-700 group-hover:text-brand3 truncate">{asset.name}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono">{asset.isin}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Asset / ISIN</th>
                                <th className="px-4 py-4 w-32">Live Price ({symbol})</th>
                                <th className="px-4 py-4 w-32">Units</th>
                                <th className="px-4 py-4 w-32">Value</th>
                                <th className="px-4 py-4 w-24">Curr %</th>
                                <th className="px-4 py-4 w-24 bg-brand6/50 text-brand3">Target %</th>
                                <th className="px-6 py-4 text-right">Rebalance Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">No assets loaded.</td></tr>
                            ) : (
                                assets.map((asset) => {
                                    const currentVal = Number(asset.price || 0) * Number(asset.units || 0);
                                    const currentPct = totalCurrentValue > 0 ? (currentVal / totalCurrentValue) * 100 : 0;
                                    const targetVal = totalNewValue * (Number(asset.target || 0) / 100);
                                    const diffVal = targetVal - currentVal;
                                    const diffUnits = Number(asset.price || 0) > 0 ? diffVal / asset.price : 0;
                                    
                                    return (
                                        <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <input type="text" value={asset.name} onChange={(e) => handleUpdateAsset(asset.id, 'name', e.target.value)} className="bg-transparent font-bold text-gray-800 outline-none w-full" />
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => removeRow(asset.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        <input type="text" placeholder="ISIN" value={asset.isin} onChange={(e) => handleUpdateAsset(asset.id, 'isin', e.target.value)} className="bg-transparent text-[10px] text-gray-500 uppercase tracking-widest outline-none w-full" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <input type="number" step="0.01" value={asset.price} onChange={(e) => handleUpdateAsset(asset.id, 'price', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input type="number" step="0.0001" value={asset.units} onChange={(e) => handleUpdateAsset(asset.id, 'units', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-mono" />
                                            </td>
                                            <td className="px-4 py-4 text-sm font-mono text-gray-700">{formatCurrency(currentVal)}</td>
                                            <td className="px-4 py-4 text-xs font-mono text-gray-500">{currentPct.toFixed(2)}%</td>
                                            <td className="px-4 py-4 bg-brand6/30">
                                                <input type="number" value={asset.target} onChange={(e) => handleUpdateAsset(asset.id, 'target', e.target.value)} className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-sm font-bold text-brand3 text-center outline-none" />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {Math.abs(diffVal) < 0.01 ? (
                                                    <span className="text-gray-300">—</span>
                                                ) : (
                                                    <div>
                                                        <span className={`block font-bold text-sm ${diffVal > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diffVal > 0 ? 'BUY' : 'SELL'} {formatCurrency(Math.abs(diffVal))}</span>
                                                        <span className="text-[10px] text-gray-400">{diffUnits.toFixed(2)} units</span>
                                                    </div>
                                                )}
                                            </td>
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