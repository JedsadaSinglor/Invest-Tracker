import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { calculateFundingStats } from '../../utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Globe, HelpCircle, Activity } from 'lucide-react';
import { CustomTooltip, EmptyState } from './SharedComponents';

export const FundingView: React.FC<{ transactions: Transaction[], currentPortfolioValue: number, formatMoney: (val: number) => string }> = ({ transactions, currentPortfolioValue, formatMoney }) => {
    // Chart State
    const [chartTimeRange, setChartTimeRange] = useState<'1M' | '6M' | '1Y' | 'ALL'>('ALL');
    
    // FX Input
    const [currentFxRate, setCurrentFxRate] = useState<string>('');

    // Table State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAW'>('ALL');
    const [sortField, setSortField] = useState<'date' | 'amount'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // 1. Data Preparation
    const fundingTxs = useMemo(() => 
        transactions.filter(t => t.type === TransactionType.DEPOSIT || t.type === TransactionType.WITHDRAW), 
    [transactions]);

    // Global Stats
    const stats = useMemo(() => calculateFundingStats(fundingTxs), [fundingTxs]);
    const { netFundingUSD, avgFxCost } = stats;
    
    // Aggregates
    const totalDeposits = useMemo(() => fundingTxs.filter(t => t.type === TransactionType.DEPOSIT).reduce((sum, t) => sum + (t.price || 0), 0), [fundingTxs]);
    const totalWithdrawals = useMemo(() => fundingTxs.filter(t => t.type === TransactionType.WITHDRAW).reduce((sum, t) => sum + (t.price || 0), 0), [fundingTxs]);

    // 2. Chart Data: Cumulative Net Funding
    const cumulativeFundingData = useMemo(() => {
        let runningTotal = 0;
        const chronological = [...fundingTxs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const data = chronological.map(tx => {
            const amount = tx.price || 0;
            if (tx.type === TransactionType.DEPOSIT) runningTotal += amount;
            else runningTotal -= amount;
            return {
                date: tx.date,
                netInvested: runningTotal,
                type: tx.type,
                amount: amount
            };
        });

        if (chartTimeRange === 'ALL') return data;
        
        const now = new Date();
        const cutoff = new Date();
        if (chartTimeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
        else if (chartTimeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
        else if (chartTimeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
        
        return data.filter(d => new Date(d.date) >= cutoff);
    }, [fundingTxs, chartTimeRange]);

    // 3. Chart Data: Monthly Cash Flow Summary
    const monthlyCashFlow = useMemo(() => {
        const groups: Record<string, { month: string, deposit: number, withdraw: number }> = {};
        fundingTxs.forEach(tx => {
            const month = tx.date.substring(0, 7); // YYYY-MM
            if (!groups[month]) groups[month] = { month, deposit: 0, withdraw: 0 };
            if (tx.type === TransactionType.DEPOSIT) groups[month].deposit += (tx.price || 0);
            else groups[month].withdraw += (tx.price || 0);
        });
        return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month));
    }, [fundingTxs]);

    // 4. Advanced FX Analysis Calculation
    const currentRateNum = parseFloat(currentFxRate);
    const fxAnalysis = useMemo(() => {
       if (!currentFxRate || isNaN(currentRateNum) || netFundingUSD === 0) return null;
       const currentLocalValue = netFundingUSD * currentRateNum;
       const diff = currentLocalValue - stats.netFundingLocal;
       return { diff, currentLocalValue };
    }, [currentRateNum, netFundingUSD, stats.netFundingLocal, currentFxRate]);

    // 5. Table Data (With Sorting, Filtering, and Cumulative Calc)
    const tableData = useMemo(() => {
        // First compute cumulative on ALL chronological data
        const sortedChronological = [...fundingTxs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let running = 0;
        const withCumulative = sortedChronological.map(tx => {
            const amt = tx.price || 0;
            if (tx.type === TransactionType.DEPOSIT) running += amt;
            else running -= amt;
            return { ...tx, cumulative: running };
        });

        // Filter
        let result = withCumulative.filter(tx => {
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                (tx.notes?.toLowerCase().includes(searchLower)) || 
                (tx.date.includes(searchQuery));
            return matchesType && matchesSearch;
        });

        // Sort View
        result.sort((a, b) => {
            let valA = sortField === 'amount' ? (a.price || 0) : new Date(a.date).getTime();
            let valB = sortField === 'amount' ? (b.price || 0) : new Date(b.date).getTime();
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [fundingTxs, filterType, searchQuery, sortField, sortOrder]);

    const handleSort = (field: 'date' | 'amount') => {
        if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // 6. Insights Generator
    const insights = useMemo(() => {
        if (fundingTxs.length === 0) return null;
        const last3Months = fundingTxs.filter(t => {
            const d = new Date(t.date);
            const now = new Date();
            const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24 * 30);
            return diff <= 2; // approx 2 months
        });
        const depositCount = last3Months.filter(t => t.type === TransactionType.DEPOSIT).length;
        const totalRecent = last3Months.reduce((sum, t) => sum + (t.type === TransactionType.DEPOSIT ? (t.price || 0) : -(t.price || 0)), 0);
        
        return {
            count: depositCount,
            total: totalRecent,
            hasWithdrawal: fundingTxs.some(t => t.type === TransactionType.WITHDRAW)
        };
    }, [fundingTxs]);

    if (fundingTxs.length === 0) {
        return <EmptyState message="No deposits or withdrawals yet." subMessage="Start adding transactions to see your funding history." />;
    }

    return (
        <div className="space-y-8 animate-slide-up">
            
            {/* 1. FINANCIAL OVERVIEW ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1C2430] dark:bg-[#1C2430] bg-white rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400"><TrendingUp size={16} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invested</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">{formatMoney(totalDeposits)}</div>
                </div>
                
                <div className="bg-[#1C2430] dark:bg-[#1C2430] bg-white rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400"><TrendingDown size={16} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Withdrawn</span>
                    </div>
                    <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">{formatMoney(totalWithdrawals)}</div>
                </div>

                <div className="bg-[#1C2430] dark:bg-[#1C2430] bg-white rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400"><Wallet size={16} /></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</span>
                        </div>
                        <div className={`text-2xl font-display font-bold ${netFundingUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {netFundingUSD >= 0 ? '+' : ''}{formatMoney(netFundingUSD)}
                        </div>
                    </div>
                    {/* Background decoration */}
                    <div className={`absolute -right-4 -bottom-4 opacity-10 ${netFundingUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        <Wallet size={80} />
                    </div>
                </div>

                <div className="bg-[#1C2430] dark:bg-[#1C2430] bg-white rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400"><Globe size={16} /></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">FX Weighted Avg</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity" title="Weighted average exchange rate of all deposits">
                            <HelpCircle size={14} className="text-slate-500" />
                        </div>
                    </div>
                    <div className="text-2xl font-display font-bold text-slate-900 dark:text-white">{avgFxCost > 0 ? avgFxCost.toFixed(4) : '-'}</div>
                </div>
            </div>

            {/* 2. CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Invested Capital Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invested Capital</h3>
                           <p className="text-xs text-slate-500">Cumulative funding over time</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                            {['1M', '6M', '1Y', 'ALL'].map(range => (
                                <button
                                    key={range}
                                    onClick={() => setChartTimeRange(range as any)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                        chartTimeRange === range 
                                        ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cumulativeFundingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFunding" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={40} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => [formatMoney(value), 'Net Invested']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Area 
                                    type="stepAfter" 
                                    dataKey="netInvested" 
                                    stroke="#6366f1" 
                                    strokeWidth={2} 
                                    fill="url(#colorFunding)" 
                                    dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Insight Text */}
                    {insights && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-start gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 dark:text-blue-400">
                                <Activity size={14} />
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                                <p>
                                    You added funds <strong>{insights.count} times</strong> in the last 2 months, totaling <span className="font-bold text-slate-900 dark:text-white">{formatMoney(insights.total)}</span>.
                                </p>
                                {!insights.hasWithdrawal && (
                                    <p className="text-xs text-slate-400 mt-0.5">Your portfolio is currently 100% Net Inflow (No withdrawals).</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Cash Flow & FX */}
                <div className="flex flex-col gap-6">
                    
                    {/* Cash Flow Summary Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 min-h-[250px]">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Cash Flow Summary</h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyCashFlow}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                                    <XAxis dataKey="month" hide />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}} 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="deposit" name="Deposit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="withdraw" name="Withdraw" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 text-xs font-bold">
                            <div className="flex items-center text-emerald-500"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div> Deposits</div>
                            <div className="flex items-center text-rose-500"><div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div> Withdrawals</div>
                        </div>
                    </div>

                    {/* Advanced FX Analysis Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700/40 dark:to-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Globe size={16} className="text-indigo-500"/> FX Rate Analysis
                            </h4>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Current Market Rate</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.0001"
                                        placeholder="e.g. 35.5"
                                        value={currentFxRate}
                                        onChange={(e) => setCurrentFxRate(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            
                            {fxAnalysis && (
                                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 border border-white/50 dark:border-slate-600/50">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Avg Cost Basis</span>
                                        <span className="font-bold">{stats.netFundingLocal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="text-slate-500">Current Value</span>
                                        <span className="font-bold">{fxAnalysis.currentLocalValue.toLocaleString()}</span>
                                    </div>
                                    <div className={`text-sm font-bold flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-600 ${fxAnalysis.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        <span>FX Impact</span>
                                        <span>{fxAnalysis.diff >= 0 ? '+' : ''}{fxAnalysis.diff.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
