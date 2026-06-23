
import React, { useState } from 'react';
import { Holding, Transaction, ChartDataPoint, TransactionType } from '../types';
import { formatNumber } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar, ReferenceLine
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, 
  Wallet, Target, Activity, ChevronLeft, PieChart as PieChartIcon, 
  Clock, DollarSign, Zap, Star, Plus, Coins, ArrowRight, Calendar, Trophy, Percent, BarChart3
} from 'lucide-react';
import { DashboardSkeleton } from './LoadingSkeletons';
import { useDashboardData } from './hooks/useDashboardData';

interface DashboardProps {
  holdings: Holding[];
  transactions: Transaction[];
  financialGoal: number;
  setFinancialGoal?: (val: number) => void;
  onOpenGoalModal: () => void;
  investedAmount: number;
  cashBalance: number;
  portfolioValue: number;
  chartData: ChartDataPoint[];
  isLoading?: boolean;
  onQuickAction: (type: TransactionType) => void;
  formatMoney: (amount: number) => string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl transition-colors duration-200 min-w-[180px]">
        {label && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</p>}
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center">
                 <div className="w-2 h-2 rounded-full mr-2 shadow-sm" style={{ backgroundColor: entry.color }}></div>
                 <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">
                    {entry.name === 'value' ? 'Market Value' : entry.name === 'invested' ? 'Net Invested' : entry.name}
                 </span>
              </div>
              <span className={`font-bold font-mono tabular-nums ${entry.value < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  holdings, transactions, financialGoal, onOpenGoalModal, investedAmount, portfolioValue, cashBalance, chartData, isLoading, onQuickAction, formatMoney
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '6M' | '1Y' | 'ALL'>('ALL');

  const {
    totalNetWorth,
    totalUnrealizedPL,
    totalPLPercent,
    filteredChartData,
    activeChartData,
    activeTotalValue,
    winners,
    losers,
    bestAsset,
    kpiData,
    recentTransactions
  } = useDashboardData({
    holdings,
    transactions,
    investedAmount,
    cashBalance,
    portfolioValue,
    chartData,
    timeRange,
    selectedCategory
  });

  if (isLoading) return <DashboardSkeleton />;

  // --- EMPTY STATE ---
  if (transactions.length === 0) {
      return (
          <div className="space-y-8 animate-fade-in py-8">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-4xl font-display font-bold text-slate-900 dark:text-white">Welcome to your Portfolio!</h2>
                  <p className="text-lg text-slate-500 dark:text-slate-400">
                      Track your investments, analyze performance, and reach your financial goals. Let's get you set up.
                  </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
                  <div 
                    onClick={() => onQuickAction(TransactionType.DEPOSIT)}
                    className="group bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center animate-slide-up"
                    style={{ animationDelay: '0.1s' }}
                  >
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                          <Wallet size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Add Cash</h3>
                      <p className="text-sm text-slate-500 mb-6">Record your initial deposit to start tracking your available capital.</p>
                      <span className="text-blue-600 font-bold text-sm flex items-center">Start Now <ArrowRight size={16} className="ml-1"/></span>
                  </div>

                  <div 
                    onClick={() => onQuickAction(TransactionType.BUY)}
                    className="group bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center animate-slide-up"
                    style={{ animationDelay: '0.2s' }}
                  >
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                          <TrendingUp size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Buy Assets</h3>
                      <p className="text-sm text-slate-500 mb-6">Log your stocks, crypto, or ETFs purchases to see your portfolio grow.</p>
                      <span className="text-emerald-600 font-bold text-sm flex items-center">Start Now <ArrowRight size={16} className="ml-1"/></span>
                  </div>

                  <div 
                    onClick={onOpenGoalModal}
                    className="group bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center text-center animate-slide-up"
                    style={{ animationDelay: '0.3s' }}
                  >
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                          <Target size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Set a Goal</h3>
                      <p className="text-sm text-slate-500 mb-6">Define your financial target to keep yourself motivated.</p>
                      <span className="text-purple-600 font-bold text-sm flex items-center">Start Now <ArrowRight size={16} className="ml-1"/></span>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* --- ROW 1: PRIMARY METRICS & GOAL --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Total Net Worth Card */}
        <div className="md:col-span-7 lg:col-span-8 relative overflow-hidden rounded-3xl p-8 bg-slate-900 text-white shadow-2xl shadow-slate-900/20 flex flex-col justify-center min-h-[240px]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950"></div>
          {/* Abstract blobs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 animate-slide-up flex flex-col h-full justify-between">
             <div>
                <div className="flex items-center gap-2 mb-3 opacity-80">
                    <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                        <Wallet size={16} className="text-indigo-200" />
                    </div>
                    <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest">Net Worth</p>
                </div>
                <h2 className="text-5xl sm:text-6xl font-display font-bold tracking-tight text-white mb-2">
                  {formatMoney(totalNetWorth)}
                </h2>
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-200">
                    <span className={`px-2 py-0.5 rounded-md bg-white/10 ${totalUnrealizedPL >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {totalUnrealizedPL >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPL)}
                    </span>
                    <span>All Time P/L</span>
                </div>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
                 <div>
                     <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">Cash Available</p>
                     <p className="text-xl font-bold font-mono">{formatMoney(cashBalance)}</p>
                 </div>
                 <div>
                     <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">Invested Assets</p>
                     <p className="text-xl font-bold font-mono">{formatMoney(portfolioValue)}</p>
                 </div>
                 <div className="hidden sm:block">
                     <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-1">Total Return</p>
                     <p className={`text-xl font-bold font-mono ${totalPLPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {totalPLPercent > 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%
                     </p>
                 </div>
             </div>
          </div>
        </div>

        {/* Right Column: Goal & P/L Mini */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-4 h-full">
            
            {/* Goal Progress */}
            <div 
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
                onClick={onOpenGoalModal}
            >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Target size={80} />
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Target size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Goal</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Target: {formatMoney(financialGoal)}</p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                            {((totalNetWorth / financialGoal) * 100).toFixed(0)}<span className="text-lg text-slate-400">%</span>
                        </span>
                        <span className="text-xs font-medium text-slate-500 mb-1">of target reached</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((totalNetWorth / financialGoal) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Monthly Momentum (Mini Chart) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Trend (6M)</p>
                    {kpiData.last6Months.length > 0 && (
                        <span className={`text-xs font-bold ${kpiData.last6Months[kpiData.last6Months.length-1].value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            Last: {kpiData.last6Months[kpiData.last6Months.length-1].value > 0 ? '+' : ''}{kpiData.last6Months[kpiData.last6Months.length-1].value.toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="flex-1 min-h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpiData.last6Months}>
                            <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                                {kpiData.last6Months.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                                ))}
                            </Bar>
                            <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.5} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg font-bold">
                                                {payload[0].payload.yearMonth}: {Number(payload[0].value).toFixed(2)}%
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>

      {/* --- ROW 2: KPI STRIP --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Activity size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CAGR</p>
                  <p className={`text-lg font-bold ${kpiData.cagr >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                      {kpiData.cagr.toFixed(1)}%
                  </p>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Coins size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Div Yield</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {kpiData.yieldPct.toFixed(2)}%
                  </p>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Trophy size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Win Rate</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {kpiData.winRate.toFixed(0)}%
                  </p>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Star size={20} />
              </div>
              <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Asset</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
                      {bestAsset ? bestAsset.symbol : '-'}
                  </p>
              </div>
          </div>
      </div>

      {/* --- ROW 3: MAIN CHART & ALLOCATION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wealth Chart (Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Growth History</h3>
                <p className="text-xs text-slate-500 mt-1">Portfolio value over time vs Net Invested</p>
             </div>
             <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                {['1M', '6M', '1Y', 'ALL'].map((range) => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range as any)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                            timeRange === range
                            ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {range}
                    </button>
                ))}
             </div>
           </div>

           <div className="h-[300px] w-full">
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={15} minTickGap={40} 
                  tickFormatter={(val) => {
                      if (val === 'Now') return 'Now';
                      const d = new Date(val);
                      return d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
                  }}
                />
                <YAxis 
                  axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} 
                  tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}
                />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="stepAfter" dataKey="invested" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Activity className="mb-2 opacity-50" size={32} />
                <p>No data for this period.</p>
              </div>
            )}
          </div>
        </div>

        {/* Allocation Donut (Span 1) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
           <div className="flex items-center justify-between mb-2">
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <PieChartIcon size={18} className="mr-2 text-slate-400" /> Allocation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedCategory ? `${selectedCategory} Breakdown` : 'By Asset Class'}</p>
               </div>
               {selectedCategory && (
                  <button onClick={() => setSelectedCategory(null)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                     <ChevronLeft size={16} />
                  </button>
               )}
           </div>

           <div className="flex-1 flex flex-col justify-center min-h-[250px] relative">
              <div className="h-[200px] w-full relative z-10">
                  {activeChartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          cornerRadius={4}
                          onClick={(data) => {
                             const clickedName = data.name || data.payload?.name;
                             if (!selectedCategory && clickedName && clickedName !== 'Wallet') {
                                setSelectedCategory(clickedName);
                             }
                          }}
                          className={!selectedCategory ? 'cursor-pointer' : ''}
                        >
                          {activeChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                     <div className="text-slate-300 flex flex-col items-center justify-center h-full">
                        <PieChartIcon size={40} className="mb-2" />
                        <span className="text-sm">No assets</span>
                     </div>
                  )}
                  {/* Center Text */}
                  {activeChartData.length > 0 && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(activeTotalValue).split(/[\.\,]/)[0]}</span>
                     </div>
                  )}
              </div>
              
              {/* Legend List */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                 {activeChartData.slice(0, 4).map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => !selectedCategory && setSelectedCategory(entry.name)}>
                       <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                       <span className="text-slate-600 dark:text-slate-300 font-medium truncate flex-1">{entry.name}</span>
                       <span className="font-bold text-slate-900 dark:text-white">{((entry.value / activeTotalValue) * 100).toFixed(0)}%</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* --- ROW 4: WINNERS/LOSERS & ACTIVITY --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Winners & Losers Split Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col animate-slide-up" style={{ animationDelay: '0.35s' }}>
           <h3 className="font-bold text-slate-900 dark:text-white flex items-center mb-6">
              <BarChart3 size={18} className="mr-2 text-slate-400" /> Market Movers
           </h3>
           
           <div className="grid grid-cols-2 gap-4 h-full">
                {/* Winners */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                        <TrendingUp size={12} /> Top Gainers
                    </p>
                    {winners.length > 0 ? winners.map(h => (
                        <div key={h.symbol} className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{h.symbol}</span>
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{h.unrealizedPLPercent.toFixed(1)}%</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{formatMoney(h.marketValue)}</div>
                        </div>
                    )) : <div className="text-xs text-slate-400 italic">No gainers yet</div>}
                </div>

                {/* Losers */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                        <TrendingDown size={12} /> Top Losers
                    </p>
                    {losers.length > 0 ? losers.map(h => (
                        <div key={h.symbol} className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{h.symbol}</span>
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{h.unrealizedPLPercent.toFixed(1)}%</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">{formatMoney(h.marketValue)}</div>
                        </div>
                    )) : <div className="text-xs text-slate-400 italic">No losers yet</div>}
                </div>
           </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full animate-slide-up" style={{ animationDelay: '0.4s' }}>
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                 <Clock size={18} className="mr-2 text-slate-400" /> Recent Activity
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {recentTransactions.length > 0 ? (
                 recentTransactions.map((tx, i) => (
                   <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50"
                   >
                      <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                             tx.type === 'BUY' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                             tx.type === 'SELL' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                             tx.type === 'DIVIDEND' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                             'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                              {tx.type === 'BUY' ? <TrendingUp size={16} /> : 
                               tx.type === 'SELL' ? <TrendingDown size={16} /> :
                               tx.type === 'DIVIDEND' ? <Coins size={16} /> : 
                               tx.type === 'DEPOSIT' ? <Plus size={16} /> : <ArrowRight size={16} />}
                          </div>
                          <div>
                             <div className="font-bold text-sm text-slate-900 dark:text-white">{tx.symbol || tx.type}</div>
                             <div className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()}</div>
                          </div>
                      </div>
                      <div className="text-right">
                         <div className={`text-sm font-bold font-mono ${
                            (tx.type === 'SELL' || tx.type === 'DIVIDEND' || tx.type === 'DEPOSIT') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                         }`}>
                             {(tx.type === 'SELL' || tx.type === 'DIVIDEND' || tx.type === 'DEPOSIT') ? '+' : ''}
                             {formatMoney((tx.price || 0) * (tx.shares || 1))}
                         </div>
                         {tx.type === 'BUY' && tx.shares && <div className="text-[10px] text-slate-400">{formatNumber(tx.shares)} units</div>}
                      </div>
                   </div>
                 ))
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic opacity-70">
                    <Clock size={32} className="mb-2 opacity-50" />
                    <span>No transactions yet</span>
                 </div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
