import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { calculateMonthlyActivity } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, RefreshCcw, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { SummaryBar, SummaryMetric, CustomTooltip, EmptyState } from './SharedComponents';

export const MonthlyActivityView: React.FC<{ transactions: Transaction[], formatMoney: (val: number) => string }> = ({ transactions, formatMoney }) => {
    const [selectedYear, setSelectedYear] = useState<string>('ALL');
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear().toString()))).sort().reverse();
        return ['ALL', ...uniqueYears];
    }, [transactions]);

    const monthlyData = useMemo(() => {
        const data = calculateMonthlyActivity(transactions);
        const filtered = selectedYear === 'ALL' 
            ? data 
            : data.filter(d => d.yearMonth.startsWith(selectedYear));
        return [...filtered].reverse(); // Chronological order for chart
    }, [transactions, selectedYear]);

    const totalTrades = useMemo(() => transactions.filter(t => t.type === TransactionType.BUY || t.type === TransactionType.SELL).length, [transactions]);
    
    // Aggregates for Summary Bar
    const totalBuyVolume = useMemo(() => monthlyData.reduce((sum, m) => sum + m.buyVolume, 0), [monthlyData]);
    const totalSellVolume = useMemo(() => monthlyData.reduce((sum, m) => sum + m.sellVolume, 0), [monthlyData]);
    const netVolume = totalBuyVolume - totalSellVolume;

    const toggleMonth = (ym: string) => {
        setExpandedMonth(expandedMonth === ym ? null : ym);
    };

    const getTransactionsForMonth = (ym: string) => {
        return transactions
            .filter(t => t.date.startsWith(ym))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    if (monthlyData.length === 0 && selectedYear === 'ALL') {
        return <EmptyState message="No activity recorded yet." />;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* 1. Summary Bar */}
            <SummaryBar>
                <SummaryMetric 
                    label="Total Volume" 
                    value={formatMoney(totalBuyVolume + totalSellVolume)} 
                    subValue={`${totalTrades} Total Trades`}
                    icon={<Activity size={16} />}
                />
                <SummaryMetric 
                    label="Net Volume" 
                    value={formatMoney(netVolume)} 
                    subValue={netVolume > 0 ? "More Buying" : "More Selling"}
                    icon={<RefreshCcw size={16} />}
                    color={netVolume >= 0 ? 'emerald' : 'rose'}
                />
                <SummaryMetric 
                    label="Active Months" 
                    value={monthlyData.length} 
                    subValue="Trading History"
                    icon={<Calendar size={16} />}
                    color="slate"
                />
                <SummaryMetric 
                    label="Last Activity" 
                    value={monthlyData[monthlyData.length-1]?.yearMonth || '-'} 
                    subValue="Most recent trade"
                    icon={<Clock size={16} />}
                    color="indigo"
                />
            </SummaryBar>

            {/* 2. Chart Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                         <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trading Volume</h3>
                         <p className="text-xs text-slate-500">Buy vs Sell Volume over time</p>
                    </div>
                    
                    <div className="relative">
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            {years.map(y => <option key={y} value={y}>{y === 'ALL' ? 'All Time' : y}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
                            <XAxis dataKey="yearMonth" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={30} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                            <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{fill: 'transparent'}} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            <Bar dataKey="buyVolume" name="Buy Volume" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            <Bar dataKey="sellVolume" name="Sell Volume" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Detailed Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white">Activity Log</h3>
                    <div className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                        {monthlyData.length} Months
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Month</th>
                                <th className="px-6 py-4 text-right">Count</th>
                                <th className="px-6 py-4 text-right">Buy Volume</th>
                                <th className="px-6 py-4 text-right">Sell Volume</th>
                                <th className="px-6 py-4 text-right">Net Flow</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {[...monthlyData].reverse().map((row) => (
                                <React.Fragment key={row.yearMonth}>
                                    <tr 
                                        onClick={() => toggleMonth(row.yearMonth)}
                                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${expandedMonth === row.yearMonth ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                            <div className={`p-1 rounded-md ${expandedMonth === row.yearMonth ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400'}`}>
                                                {expandedMonth === row.yearMonth ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </div>
                                            {row.yearMonth}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-300">{row.transactionCount}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatMoney(row.buyVolume)}</td>
                                        <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{formatMoney(row.sellVolume)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${row.buyVolume - row.sellVolume >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500'}`}>
                                            {formatMoney(row.buyVolume - row.sellVolume)}
                                        </td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                    {expandedMonth === row.yearMonth && (
                                        <tr className="bg-slate-50/50 dark:bg-slate-900/30 animate-fade-in">
                                            <td colSpan={6} className="px-4 py-4 sm:px-8 sm:py-6 shadow-inner">
                                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase font-bold text-[10px]">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left">Date</th>
                                                                <th className="px-4 py-3 text-left">Type</th>
                                                                <th className="px-4 py-3 text-left">Symbol</th>
                                                                <th className="px-4 py-3 text-right">Amount</th>
                                                                <th className="px-4 py-3 text-right">Details</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                            {getTransactionsForMonth(row.yearMonth).map(tx => (
                                                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{new Date(tx.date).getDate()}th</td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                                                            tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                            tx.type === 'SELL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                            tx.type === 'DIVIDEND' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                                            'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                                        }`}>
                                                                            {tx.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{tx.symbol || '-'}</td>
                                                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                                                                        {formatMoney((tx.shares && (tx.type === 'BUY' || tx.type === 'SELL')) ? (tx.shares * (tx.price||0)) : (tx.price||0))}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-slate-500">
                                                                        {tx.shares ? `${tx.shares} @ ${formatMoney(tx.price||0)}` : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
