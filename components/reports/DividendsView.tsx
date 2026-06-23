import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { getMonthlyDividends } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DollarSign, Calendar, BarChart3, Coins, ChevronDown } from 'lucide-react';
import { SummaryBar, SummaryMetric, CustomTooltip, EmptyState } from './SharedComponents';

export const DividendsView: React.FC<{ transactions: Transaction[], formatMoney: (val: number) => string }> = ({ transactions, formatMoney }) => {
    const [selectedYear, setSelectedYear] = useState<string>('ALL');

    const years = useMemo(() => {
        const divTxs = transactions.filter(t => t.type === TransactionType.DIVIDEND);
        const uniqueYears = Array.from(new Set(divTxs.map(t => new Date(t.date).getFullYear().toString()))).sort().reverse();
        return ['ALL', ...uniqueYears];
    }, [transactions]);

    const monthlyDividends = useMemo(() => {
        const allMonthly = getMonthlyDividends(transactions);
        if (selectedYear === 'ALL') return allMonthly;
        return allMonthly.filter(d => d.date.startsWith(selectedYear));
    }, [transactions, selectedYear]);
    
    // Aggregates
    const totalDividends = useMemo(() => transactions.filter(t => t.type === TransactionType.DIVIDEND).reduce((sum, t) => sum + (t.price || 0), 0), [transactions]);
    const thisYear = new Date().getFullYear().toString();
    const currentYearTotal = useMemo(() => transactions.filter(t => t.type === TransactionType.DIVIDEND && t.date.startsWith(thisYear)).reduce((sum, t) => sum + (t.price || 0), 0), [transactions, thisYear]);
    const avgMonthlyDividend = monthlyDividends.length > 0 ? totalDividends / monthlyDividends.length : 0;

    const recentDividends = useMemo(() => {
        return transactions
            .filter(t => t.type === TransactionType.DIVIDEND)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [transactions]);

    if (totalDividends === 0) {
        return <EmptyState message="No dividends received yet." subMessage="Track your passive income here." />;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* 1. Summary Bar */}
            <SummaryBar>
                 <SummaryMetric 
                    label="Total Income" 
                    value={formatMoney(totalDividends)} 
                    subValue="All time dividends"
                    icon={<DollarSign size={16} />}
                    color="teal"
                />
                 <SummaryMetric 
                    label="2024 Income" 
                    value={formatMoney(currentYearTotal)} 
                    subValue="Year to date"
                    icon={<Calendar size={16} />}
                    color="emerald"
                />
                 <SummaryMetric 
                    label="Monthly Avg" 
                    value={formatMoney(avgMonthlyDividend)} 
                    subValue="Average payout"
                    icon={<BarChart3 size={16} />}
                    color="indigo"
                />
                 <SummaryMetric 
                    label="Payouts" 
                    value={transactions.filter(t => t.type === TransactionType.DIVIDEND).length} 
                    subValue="Total transactions"
                    icon={<Coins size={16} />}
                    color="amber"
                />
            </SummaryBar>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                           <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Income</h3>
                           <p className="text-xs text-slate-500">Dividend payouts over time</p>
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
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyDividends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={30} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                                <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{fill: 'transparent'}} />
                                {selectedYear === 'ALL' && <ReferenceLine y={avgMonthlyDividend} stroke="#0ea5e9" strokeDasharray="3 3" label={{ position: 'right', value: 'Avg', fill: '#0ea5e9', fontSize: 10 }} />}
                                <Bar dataKey="value" name="Dividend Income" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Payouts List */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Payouts</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {recentDividends.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xs shadow-sm">
                                        {tx.symbol ? tx.symbol.substring(0,2) : <DollarSign size={16} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{tx.symbol || 'Dividend'}</div>
                                        <div className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="text-right font-bold text-teal-600 dark:text-teal-400 font-mono">
                                    +{formatMoney(tx.price || 0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
