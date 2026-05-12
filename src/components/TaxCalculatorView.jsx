import React, { useState } from 'react';

export default function TaxCalculatorView({ symbol = "£" }) {
    // 1. Inputs: Editable State
    const [income, setIncome] = useState(30000);
    const [allowanceUsed, setAllowanceUsed] = useState(0);
    const [isJoint, setIsJoint] = useState(false);
    const [assets, setAssets] = useState([
        { id: 1, name: "Asset A", units: 900, ogPrice: 78, currentPrice: 100 },
        { id: 2, name: "Asset B", units: 100, ogPrice: 65, currentPrice: 89 },
        { id: 3, name: "Asset C", units: 35, ogPrice: 90, currentPrice: 113 }
    ]);

    // 2. UK Tax Constants (Updated for 2024/25 context)
    const CONSTANTS = {
        LR_TAX: 0.18,          // 18% (e.g., for basic rate residential/other)
        HR_TAX: 0.24,          // 24% (e.g., higher rate residential)
        BASE_ALLOWANCE: 3000,  // Individual CGT allowance
        BASIC_RATE_LMT: 50270,
        PERS_ALLOW: 12570,
        MARKET_BUFFER: 0.005   // 0.5% Buffer
    };

    // 3. Update Logic
    const updateAsset = (id, field, value) => {
        setAssets(prev => prev.map(a => 
            a.id === id ? { ...a, [field]: parseFloat(value) || 0 } : a
        ));
    };

    /// 4. Calculation Engine
    const calculateResults = () => {
        // A. Apply 0.5% buffer to sell price (overestimating gain/market movement)
        const breakdown = assets.map(a => {
            const bufferedSellPrice = a.currentPrice * (1 + CONSTANTS.MARKET_BUFFER);
            const priceChange = bufferedSellPrice - a.ogPrice;
            const totalGain = priceChange * a.units;
            return { ...a, totalGain, priceChange, bufferedSellPrice };
        });

        // B. Dynamic Allowance: Double if joint, then subtract what's already used
        const availableAllowance = isJoint ? (CONSTANTS.BASE_ALLOWANCE * 2) : CONSTANTS.BASE_ALLOWANCE;
        const remainingAllowance = Math.max(0, availableAllowance - allowanceUsed);

        const totalGain = breakdown.reduce((sum, a) => sum + a.totalGain, 0);
        const taxableGain = Math.max(0, totalGain - remainingAllowance);

        // C. Calculate Unused Basic Rate Band
        const taxableIncome = Math.max(0, income - CONSTANTS.PERS_ALLOW);
        const unusedBasicBand = Math.max(0, CONSTANTS.BASIC_RATE_LMT - taxableIncome);

        // D. Split Gains across Tax Bands
        const gainsAtLR = Math.min(taxableGain, unusedBasicBand);
        const gainsAtHR = Math.max(0, taxableGain - gainsAtLR);

        // E. Final Tax Calculation
        const taxOwed = (gainsAtLR * CONSTANTS.LR_TAX) + (gainsAtHR * CONSTANTS.HR_TAX);
        const avgtax = taxableGain > 0 ? (taxOwed / taxableGain) * 100 : 0;

        return { 
            breakdown, 
            totalGain, 
            taxableAmount: taxableGain, 
            taxOwed,
            remainingAllowance,
            gainsAtLR,
            gainsAtHR,
            avgtax
        };
    };

    const res = calculateResults();

    return (
        <div className="p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-8 border-b pb-6">
                <h2 className="text-2xl font-bold text-gray-900">CGT Calculator (Buffered)</h2>
                <p className="text-gray-500 text-sm">Includes 0.5% market volatility buffer and marital allowance toggles.</p>
            </div>

            {/* Controls Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Annual Income</label>
                    <input 
                        type="number" 
                        value={income} 
                        onChange={(e) => setIncome(e.target.value)}
                        className="w-full p-2 border rounded font-mono text-lg"
                    />
                </div>

                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Allowance Already Used</label>
                    <input 
                        type="number" 
                        value={allowanceUsed} 
                        onChange={(e) => setAllowanceUsed(e.target.value)}
                        className="w-full p-2 border rounded font-mono text-lg"
                    />
                </div>

                <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-center">
                    <label className="flex items-center cursor-pointer space-x-3">
                        <input 
                            type="checkbox" 
                            checked={isJoint} 
                            onChange={(e) => setIsJoint(e.target.checked)}
                            className="w-5 h-5 accent-blue-600"
                        />
                        <span className="text-sm font-bold text-gray-700">Joint Filing / Married (Double Allowance)</span>
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">Current Allowance: {symbol}{res.remainingAllowance}</p>
                </div>
            </div>

            {/* Results Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <span className="text-gray-500 text-sm">Total Gain (+0.5% Buffer)</span>
                    <div className="text-2xl font-bold text-gray-900">{symbol}{res.totalGain.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <span className="text-gray-500 text-sm">Taxable Amount</span>
                    <div className="text-2xl font-bold text-gray-900">{symbol}{res.taxableAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
                <div className="bg-blue-600 p-4 rounded-xl shadow-md text-white">
                    <span className="opacity-80 text-sm">Est. Tax Owed ({res.avgtax.toFixed(2)}%)</span>
                    <div className="text-2xl font-bold">{symbol}{res.taxOwed.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
            </div>

            {/* Asset Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-600 border-b">
                        <tr>
                            <th className="p-4">Asset Name</th>
                            <th className="p-4">Units</th>
                            <th className="p-4">Buy Price</th>
                            <th className="p-4">Sell Price (Raw)</th>
                            <th className="p-4 text-right">Gain (Buffered)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {res.breakdown.map((asset) => (
                            <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium">{asset.name}</td>
                                <td className="p-4">
                                    <input type="number" value={asset.units} onChange={(e) => updateAsset(asset.id, 'units', e.target.value)} className="w-20 p-1 border rounded" />
                                </td>
                                <td className="p-4">
                                    <input type="number" value={asset.ogPrice} onChange={(e) => updateAsset(asset.id, 'ogPrice', e.target.value)} className="w-20 p-1 border rounded" />
                                </td>
                                <td className="p-4">
                                    <input type="number" value={asset.currentPrice} onChange={(e) => updateAsset(asset.id, 'currentPrice', e.target.value)} className="w-20 p-1 border rounded" />
                                </td>
                                <td className={`p-4 text-right font-bold ${asset.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {symbol}{asset.totalGain.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}