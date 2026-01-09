
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, ChartDataPoint, Holding } from '../types';
import { getYearlyDividends, getMonthlyDividends, calculateFundingStats, calculateMonthlyActivity, calculateMonthlyReturns, formatCurrency, formatNumber, calculateMaxDrawdown, calculateWinRate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line, ReferenceLine, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar, RefreshCcw, Clock, ChevronDown, ChevronUp, Wallet, BarChart3, Landmark, Activity, Trophy, Coins, ArrowUp, ArrowDown, Filter, Globe, ArrowRightLeft, Calculator, Search, HelpCircle, FileText, ArrowUpDown, Hourglass } from 'lucide-react';
import { ReportsSkeleton } from './LoadingSkeletons';

interface ReportsProps {
  transactions: Transaction[];
  holdings: Holding[];
  currentPortfolioValue: number;
  chartData: ChartDataPoint[];
  isLoading?: boolean;
  formatMoney: (amount: number) => string;
}

// --- UI COMPONENTS ---

const SummaryBar = ({ children }: { children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-slate-100 dark:divide-slate-700/50">
      {children}
    </div>
  </div>
);

const SummaryMetric = ({ label, value, subValue, icon, color = 'blue' }: { label: string, value: string | number, subValue?: string | React.ReactNode, icon?: React.ReactNode, color?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <div className="flex flex-col px-0 md:px-4 first:pl-0">
      <div className="flex items-center gap-2 mb-2">
        {icon && <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>{icon}</div>}
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl z-50 min-w-[180px]">
        {label && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">{label}</p>}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
             const nameMap: Record<string, string> = {
                'netInvested': 'Net Invested',
                'dividendIncome': 'Dividends',
                'value': 'Market Value',
                'invested': 'Cost Basis',
                'benchmark': 'Benchmark (8%)',
                'buyVolume': 'Buy Volume',
                'sellVolume': 'Sell Volume',
                'deposit': 'Deposits',
                'withdraw': 'Withdrawals'
             };
             const displayName = nameMap[entry.name] || entry.name;
             
             // Don't show if value is 0 unless it's the only thing
             if (payload.length > 1 && entry.value === 0 && entry.name !== 'benchmark') return null;

             return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">
                      {displayName}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {formatter ? formatter(entry.value, entry.name, entry) : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const EmptyState = ({ message, subMessage }: { message: string, subMessage?: string }) => (
    <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-4">
            <BarChart3 size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{message}</h3>
        {subMessage && <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{subMessage}</p>}
    </div>
);

// --- MAIN COMPONENT ---

const Reports: React.FC<ReportsProps> = ({ transactions, holdings, currentPortfolioValue, chartData, isLoading, formatMoney }) => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'dividends' | 'funding' | 'growth'>('monthly');

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  const tabs = [
    { id: 'monthly', label: 'Monthly', icon: <Calendar size={16} /> },
    { id: 'dividends', label: 'Dividends', icon: <BarChart3 size={16} /> },
    { id: 'funding', label: 'Funding', icon: <Landmark size={16} /> },
    { id: 'growth', label: 'Growth', icon: <TrendingUp size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-[64px] z-20 bg-slate-50/90 dark:bg-[#0b1120]/90 backdrop-blur-sm py-4">
        <div>
           <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Portfolio Reports</h2>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Views */}
      <div className="min-h-[400px]">
         {activeTab === 'monthly' && <MonthlyActivityView transactions={transactions} formatMoney={formatMoney} />}
         {activeTab === 'dividends' && <DividendsView transactions={transactions} formatMoney={formatMoney} />}
         {activeTab === 'funding' && <FundingView transactions={transactions} currentPortfolioValue={currentPortfolioValue} formatMoney={formatMoney} />}
         {activeTab === 'growth' && <GrowthView transactions={transactions} holdings={holdings} currentPortfolioValue={currentPortfolioValue} chartData={chartData} formatMoney={formatMoney} />}
      </div>
    </div>
  );
};

// --- SUB-VIEWS ---

const MonthlyActivityView: React.FC<{ transactions: Transaction[], formatMoney: (val: number) => string }> = ({ transactions, formatMoney }) => {
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

const DividendsView: React.FC<{ transactions: Transaction[], formatMoney: (val: number) => string }> = ({ transactions, formatMoney }) => {
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

const FundingView: React.FC<{ transactions: Transaction[], currentPortfolioValue: number, formatMoney: (val: number) => string }> = ({ transactions, currentPortfolioValue, formatMoney }) => {
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
                                        className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                                    />
                                    <Calculator size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>

                            {fxAnalysis ? (
                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-indigo-100 dark:border-slate-600/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">FX Gain/Loss</span>
                                        <span className={`text-sm font-bold ${fxAnalysis.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {fxAnalysis.diff >= 0 ? '+' : ''}{formatMoney(fxAnalysis.diff)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${fxAnalysis.diff >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                            style={{ width: '100%' }} // Simplified bar, visualized purely by color
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Enter current rate to see FX impact on your principal.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. TRANSACTION LOG TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                
                {/* Table Toolbar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search logs..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 w-full sm:w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-1">
                            {['ALL', 'DEPOSIT', 'WITHDRAW'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type as any)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                                        filterType === type 
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' 
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {tableData.length} Transactions
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-[#1C2430] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th 
                                    className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-1">
                                        Date 
                                        <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-slate-500 ${sortField === 'date' ? 'text-blue-500' : ''}`} />
                                    </div>
                                </th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Notes</th>
                                <th className="px-6 py-3 text-right">Rate</th>
                                <th 
                                    className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Amount 
                                        <ArrowUpDown size={12} className={`text-slate-300 group-hover:text-slate-500 ${sortField === 'amount' ? 'text-blue-500' : ''}`} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {tableData.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex w-fit items-center gap-1 ${
                                            tx.type === 'DEPOSIT' 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                        }`}>
                                            {tx.type === 'DEPOSIT' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                                        {tx.notes ? (
                                            <span className="flex items-center gap-1"><FileText size={12} /> {tx.notes}</span>
                                        ) : (
                                            <span className="opacity-30">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-slate-500 dark:text-slate-400 text-xs">
                                        {tx.exchangeRate ? tx.exchangeRate.toFixed(4) : '1.0000'}
                                    </td>
                                    <td className={`px-6 py-3 text-right font-bold font-mono ${tx.type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatMoney(tx.price || 0)}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {formatMoney(tx.cumulative || 0)}
                                    </td>
                                </tr>
                            ))}
                            {tableData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic text-xs">
                                        No transactions match your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const GrowthView: React.FC<{ transactions: Transaction[], holdings: Holding[], currentPortfolioValue: number, chartData: ChartDataPoint[], formatMoney: (val: number) => string }> = ({ transactions, holdings, currentPortfolioValue, chartData, formatMoney }) => {
   const [returnRange, setReturnRange] = useState<'6M' | '1Y' | 'ALL'>('ALL');
   
   const { netFundingUSD } = useMemo(() => calculateFundingStats(transactions), [transactions]);
   const monthlyReturns = useMemo(() => calculateMonthlyReturns(chartData), [chartData]);
   
   // --- KPI Calculations ---
   const totalROI = netFundingUSD > 0 ? ((currentPortfolioValue - netFundingUSD) / netFundingUSD) * 100 : 0;
   const maxDrawdown = useMemo(() => calculateMaxDrawdown(chartData), [chartData]);
   const winRate = useMemo(() => calculateWinRate(monthlyReturns), [monthlyReturns]);
   
   // Time in Market
   const firstTxDate = useMemo(() => {
       if(transactions.length === 0) return null;
       const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
       return new Date(sorted[0].date);
   }, [transactions]);

   const daysInMarket = useMemo(() => {
       if(!firstTxDate) return 0;
       const diffTime = Math.abs(new Date().getTime() - firstTxDate.getTime());
       return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
   }, [firstTxDate]);
   
   const yearsInMarket = daysInMarket / 365.25;
   
   // CAGR (Simple Approximation)
   const cagr = useMemo(() => {
       if (yearsInMarket < 1 || netFundingUSD <= 0) return totalROI; // Fallback to ROI if < 1 year
       return (Math.pow(currentPortfolioValue / netFundingUSD, 1 / yearsInMarket) - 1) * 100;
   }, [currentPortfolioValue, netFundingUSD, yearsInMarket, totalROI]);

   // Benchmark Simulation (8% Annual Growth on Invested Capital)
   const enhancedChartData = useMemo(() => {
       return chartData.map(point => {
           const pointDate = point.date === 'Now' ? new Date() : new Date(point.date);
           const daysSinceStart = firstTxDate ? (pointDate.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24) : 0;
           const years = daysSinceStart / 365.25;
           // Simple compounded benchmark: Invested * (1.08 ^ years)
           const benchmark = point.invested * Math.pow(1.08, years);
           return { ...point, benchmark };
       });
   }, [chartData, firstTxDate]);

   // Filtered Monthly Returns
   const displayedReturns = useMemo(() => {
       if (returnRange === 'ALL') return monthlyReturns;
       const months = returnRange === '6M' ? 6 : 12;
       return monthlyReturns.slice(-months);
   }, [monthlyReturns, returnRange]);

   const avgMonthlyReturn = displayedReturns.length > 0 
       ? displayedReturns.reduce((sum, m) => sum + m.value, 0) / displayedReturns.length 
       : 0;

   // Performance Breakdown
   const sortedHoldings = useMemo(() => {
       return [...holdings].sort((a, b) => b.unrealizedPL - a.unrealizedPL);
   }, [holdings]);

   if (chartData.length === 0) {
       return <EmptyState message="Not enough data to generate growth report." />;
   }

   return (
      <div className="space-y-8 animate-slide-up">
         
         {/* 1. Summary Bar */}
         <SummaryBar>
             <SummaryMetric 
                label="Total ROI" 
                value={`${totalROI > 0 ? '+' : ''}${totalROI.toFixed(2)}%`} 
                subValue={totalROI >= 0 ? "Positive Return" : "Negative Return"}
                icon={<TrendingUp size={16} />}
                color={totalROI >= 0 ? "emerald" : "rose"}
             />
             <SummaryMetric 
                label="CAGR" 
                value={`${cagr.toFixed(2)}%`} 
                subValue="Annualized Growth"
                icon={<Activity size={16} />}
                color="blue"
             />
             <SummaryMetric 
                label="Max Drawdown" 
                value={`-${maxDrawdown.toFixed(2)}%`} 
                subValue="Peak to Trough"
                icon={<TrendingDown size={16} />}
                color="rose"
             />
             <SummaryMetric 
                label="Win Rate" 
                value={`${winRate.toFixed(0)}%`} 
                subValue={`${monthlyReturns.filter(m => m.value > 0).length} Positive Months`}
                icon={<Trophy size={16} />}
                color="amber"
             />
         </SummaryBar>

         {/* 2. Wealth Growth Curve with Benchmark */}
         <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
               <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Long-Term Wealth Growth</h3>
                  <p className="text-xs text-slate-500 mt-1">Comparing your portfolio against invested capital and 8% benchmark</p>
               </div>
               <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                    <div className="flex items-center text-indigo-500"><div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div> Market Value</div>
                    <div className="flex items-center text-slate-400"><div className="w-2 h-2 bg-slate-400 rounded-full mr-2"></div> Net Invested</div>
                    <div className="flex items-center text-amber-500"><div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div> 8% Benchmark</div>
               </div>
            </div>

            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enhancedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={40} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                     <Tooltip content={<CustomTooltip formatter={formatMoney} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                     
                     {/* Areas and Lines */}
                     <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                     <Line type="stepAfter" dataKey="invested" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                     <Line type="monotone" dataKey="benchmark" stroke="#f59e0b" strokeWidth={2} dot={false} strokeOpacity={0.7} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 3. Time in Market & Monthly Returns */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             
             {/* Time in Market Card */}
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center shadow-lg">
                <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300">
                        <Hourglass size={32} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Time in Market</p>
                    <h3 className="text-5xl font-display font-bold mb-4">{daysInMarket} <span className="text-lg font-medium text-slate-400">days</span></h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                        Since your first transaction on <span className="text-white font-bold">{firstTxDate?.toLocaleDateString()}</span>
                    </p>
                </div>
                {/* Decorative blob */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[40px] -ml-10 -mb-10"></div>
             </div>

             {/* Monthly Returns Heatmap (Bar) */}
             <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Returns</h3>
                        <p className="text-xs text-slate-500 mt-1">Percentage gain/loss by month</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        {['6M', '1Y', 'ALL'].map(r => (
                           <button 
                             key={r}
                             onClick={() => setReturnRange(r as any)}
                             className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${returnRange === r ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                           >
                             {r}
                           </button>
                        ))}
                    </div>
                 </div>

                 <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={displayedReturns} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                          <XAxis dataKey="yearMonth" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} minTickGap={30} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <Tooltip 
                             cursor={{fill: 'transparent'}}
                             content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                   const val = Number(payload[0].value);
                                   return (
                                      <div className="bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl">
                                         <p className="font-bold mb-1">{payload[0].payload.yearMonth}</p>
                                         <p className={`${val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {val > 0 ? '+' : ''}{val.toFixed(2)}%
                                         </p>
                                      </div>
                                   )
                                }
                                return null;
                             }}
                          />
                          <ReferenceLine y={0} stroke="#94a3b8" />
                          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                             {displayedReturns.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs font-medium text-slate-500">
                    <span>Avg Monthly Return: <span className={avgMonthlyReturn >= 0 ? "text-emerald-500" : "text-rose-500"}>{avgMonthlyReturn > 0 ? '+' : ''}{avgMonthlyReturn.toFixed(2)}%</span></span>
                    <span>Best: <span className="text-emerald-500">+{Math.max(...displayedReturns.map(d => d.value), 0).toFixed(2)}%</span></span>
                 </div>
             </div>
         </div>

         {/* 4. Holdings Performance Table (Winners/Losers) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                   <TrendingUp size={18} className="text-emerald-500 mr-2" /> Top Winners
                </h3>
                <div className="space-y-3">
                   {sortedHoldings.filter(h => h.unrealizedPL > 0).slice(0, 5).map(h => (
                      <div key={h.symbol} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                         <div className="flex items-center gap-3">
                            <div className="font-bold text-slate-900 dark:text-white">{h.symbol}</div>
                            <div className="text-xs text-slate-500">{h.assetClass}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatMoney(h.unrealizedPL)}</div>
                            <div className="text-xs text-emerald-600/70">+{h.unrealizedPLPercent.toFixed(2)}%</div>
                         </div>
                      </div>
                   ))}
                   {sortedHoldings.filter(h => h.unrealizedPL > 0).length === 0 && (
                      <div className="text-center text-slate-400 text-sm py-4 italic">No profitable positions yet.</div>
                   )}
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                   <TrendingDown size={18} className="text-rose-500 mr-2" /> Top Losers
                </h3>
                <div className="space-y-3">
                   {[...sortedHoldings].reverse().filter(h => h.unrealizedPL < 0).slice(0, 5).map(h => (
                      <div key={h.symbol} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
                         <div className="flex items-center gap-3">
                            <div className="font-bold text-slate-900 dark:text-white">{h.symbol}</div>
                            <div className="text-xs text-slate-500">{h.assetClass}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatMoney(h.unrealizedPL)}</div>
                            <div className="text-xs text-rose-600/70">{h.unrealizedPLPercent.toFixed(2)}%</div>
                         </div>
                      </div>
                   ))}
                   {sortedHoldings.filter(h => h.unrealizedPL < 0).length === 0 && (
                      <div className="text-center text-slate-400 text-sm py-4 italic">No losing positions. Great job!</div>
                   )}
                </div>
             </div>
         </div>

      </div>
   );
};

export default Reports;
