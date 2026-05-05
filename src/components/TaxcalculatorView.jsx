import React, { useState } from 'react';

export default function TaxCalculatorView({ symbol }) {
    // 1. Inputs: Editable State
    const [income, setIncome] = React.useState(30000);
    const [assets, setAssets] = React.useState([
        { id: 1, name: "Asset A", units: 900, ogPrice: 78, currentPrice: 100 },
        { id: 2, name: "Asset B", units: 100, ogPrice: 65, currentPrice: 89 },
        { id: 3, name: "Asset C", units: 35, ogPrice: 90, currentPrice: 112 }
    ]);

    // 2. UK Tax Constants (Fixed)
    const CONSTANTS = {
        LR_TAX: 0.18,          // 18%
        HR_TAX: 0.24,          // 24%
        TX_FREE_ALLOW: 3000,   // £3,000 Allowance
        BASIC_RATE_LMT: 50270,
        PERS_ALLOW: 12570 
    };

    // 3. Update Logic
    const updateAsset = (id, field, value) => {
        setAssets(prev => prev.map(a => 
            a.id === id ? { ...a, [field]: parseFloat(value) || 0 } : a
        ));
    };

    /// 4. Calculation Engine (Matching Spreadsheet Logic)
const calculateResults = () => {
    // A. Calculate individual gains: (Current Price - OG Price) * Units
    const breakdown = assets.map(a => {
        const priceChange = a.currentPrice - a.ogPrice;
        const totalGain = priceChange * a.units;
        return { ...a, totalGain, priceChange };
    });

    // B. Calculate Total and "Net Tax Free" (Taxable Gain)
    const totalGain = breakdown.reduce((sum, a) => sum + a.totalGain, 0);
    const taxableGain = Math.max(0, totalGain - CONSTANTS.TX_FREE_ALLOW);

    // C. Calculate "Income Diff" (Unused Basic Rate Band)
    // Logic: Basic Rate Limit - (Rough Income - Personal Allowance)
    const taxableIncome = Math.max(0, income - CONSTANTS.PERS_ALLOW);
    const unusedBasicBand = Math.max(0, CONSTANTS.BASIC_RATE_LMT - taxableIncome);

    // D. Split Gains across Tax Bands
    // The amount of gain that falls into the 18% band is limited by the "Income Diff"
    const gainsAtLR = Math.min(taxableGain, unusedBasicBand);
    const gainsAtHR = Math.max(0, taxableGain - gainsAtLR);

    // E. Final Tax Calculation
    const taxOwed = (gainsAtLR * CONSTANTS.LR_TAX) + (gainsAtHR * CONSTANTS.HR_TAX);
    // Avg Tax Calc
    const avgtax = taxableGain > 0 ? (taxOwed / taxableGain) * 100 : 0;

    return { 
        breakdown, 
        totalGain, 
        taxableAmount: taxableGain, 
        taxOwed,
        incomeDiff: unusedBasicBand,
        gainsAtLR,
        gainsAtHR,
        avgtax
    };
};
    const res = calculateResults();

    return (
        <div className="p-8 max-w-5xl mx-auto">
            {/* Header & Income Input */}
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">CGT Calculator</h2>
                    <p className="text-gray-500">Calculate liability based on UK tax bands</p>
                </div>
                <div className="w-64">
                    <label className="block text-xs font-bold text-brand uppercase mb-1">Annual Income ({symbol})</label>
                    <input 
                        type="number" 
                        value={income} 
                        onChange={(e) => setIncome(e.target.value)}
                        className="w-full p-2 border rounded font-mono text-lg focus:ring-2 focus:ring-brand outline-none"
                    />
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <span className="text-gray-500 text-sm">Total Gain</span>
                    <div className="text-2xl font-bold text-gray-900">£{res.totalGain.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <span className="text-gray-500 text-sm">Taxable Amount</span>
                    <div className="text-2xl font-bold text-gray-900">£{res.taxableAmount.toLocaleString()}</div>
                </div>
                <div className="bg-brand p-4 rounded-xl shadow-md text-white">
                    <span className="opacity-80 text-sm">Est. Tax Owed ({res.avgtax.toFixed(2)}%)</span>
                    <div className="text-2xl font-bold">£{res.taxOwed.toLocaleString()}</div>
                </div>
            </div>

            {/* Asset Inputs Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-600">
                        <tr>
                            <th className="p-4">Asset Name</th>
                            <th className="p-4">Units</th>
                            <th className="p-4">Buy Price {symbol}</th>
                            <th className="p-4">Sell Price {symbol}</th>
                            <th className="p-4 text-right">Gain</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {res.breakdown.map((asset) => (
                            <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium">{asset.name}</td>
                                <td className="p-4">
                                    <input type="number" value={asset.units} onChange={(e) => updateAsset(asset.id, 'units', e.target.value)} className="w-24 p-1 border rounded" />
                                </td>
                                <td className="p-4">
                                    <input type="number" value={asset.ogPrice} onChange={(e) => updateAsset(asset.id, 'ogPrice', e.target.value)} className="w-24 p-1 border rounded" />
                                </td>
                                <td className="p-4">
                                    <input type="number" value={asset.currentPrice} onChange={(e) => updateAsset(asset.id, 'currentPrice', e.target.value)} className="w-24 p-1 border rounded" />
                                </td>
                                <td className={`p-4 text-right font-bold ${asset.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    £{asset.totalGain.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

