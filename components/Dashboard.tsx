
import React, { useMemo, useState } from 'react';
import { Holding, Transaction, ChartDataPoint, TransactionType } from '../types';
import { formatNumber } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, 
  Wallet, Target, Activity, ChevronLeft, PieChart as PieChartIcon, 
  Clock, DollarSign, Zap, Star, Plus, Coins, ArrowRight
} from 'lucide-react';
import { DashboardSkeleton } from './LoadingSkeletons';

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
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl transition-colors duration-200">
        {label && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</p>}
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm">
              <div className="flex items-center">
                 <div className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm" style={{ backgroundColor: entry.color }}></div>
                 <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">
                    {entry.name === 'value' ? 'Market Value' : entry.name === 'invested' ? 'Net Invested' : entry.name}
                 </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
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

  const totalNetWorth = portfolioValue + cashBalance;
  const totalUnrealizedPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);
  const totalPLPercent = investedAmount > 0 ? (totalUnrealizedPL / investedAmount) * 100 : 0;
  
  // --- DERIVED DATA ---

  // 1. Allocation Data
  const categoryData = useMemo(() => {
    const data = holdings
      .filter(h => h.marketValue > 0)
      .map(h => ({ name: h.assetClass, value: h.marketValue }))
      .reduce((acc: any[], curr) => {
        const existing = acc.find(item => item.name === curr.name);
        if (existing) existing.value += curr.value;
        else acc.push({ ...curr });
        return acc;
      }, []);

    if (cashBalance > 0) {
       const cashCategory = data.find(item => item.name === 'Cash');
       if (cashCategory) cashCategory.value += cashBalance;
       else data.push({ name: 'Cash', value: cashBalance });
    }
    return data.sort((a, b) => b.value - a.value);
  }, [holdings, cashBalance]);

  const assetData = useMemo(() => {
    if (!selectedCategory) return [];
    const assets = holdings
      .filter(h => h.assetClass === selectedCategory && h.marketValue > 0)
      .map(h => ({ name: h.symbol, value: h.marketValue, fullName: h.name }));
    
    if (selectedCategory === 'Cash' && cashBalance > 0) {
        assets.push({ name: 'Wallet', value: cashBalance, fullName: 'Available Balance' });
    }
    return assets.sort((a, b) => b.value - a.value);
  }, [holdings, selectedCategory, cashBalance]);

  const activeChartData = selectedCategory ? assetData : categoryData;
  const activeTotalValue = activeChartData.reduce((sum, item) => sum + item.value, 0);

  // 2. Top Movers (Best performing assets by %)
  const topMovers = useMemo(() => {
     return [...holdings]
        .filter(h => h.marketValue > 0) // Only active
        .sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent)
        .slice(0, 3);
  }, [holdings]);

  // 3. Recent Transactions
  const recentTransactions = useMemo(() => {
     return [...transactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);
  }, [transactions]);

  if (isLoading) return <DashboardSkeleton />;

  // --- EMPTY STATE (Welcome Guide) ---
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
      
      {/* --- ROW 1: PRIMARY METRICS --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Total Net Worth Card (Simple & Bold) */}
        <div className="md:col-span-7 relative overflow-hidden rounded-3xl p-8 bg-slate-900 text-white shadow-2xl shadow-slate-900/20 flex flex-col justify-center min-h-[220px]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-950"></div>
          {/* Abstract blobs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 animate-slide-up">
             <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                    <Wallet size={18} className="text-indigo-200" />
                </div>
                <p className="text-indigo-200 font-bold text-sm uppercase tracking-wider">Total Net Worth</p>
             </div>
             <h2 className="text-5xl sm:text-6xl font-display font-bold tracking-tight text-white mb-6">
               {formatMoney(totalNetWorth)}
             </h2>
             
             <div className="flex gap-6">
                 <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5">
                     <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-0.5">Cash</p>
                     <p className="text-lg font-bold font-mono">{formatMoney(cashBalance)}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5">
                     <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-0.5">Invested</p>
                     <p className="text-lg font-bold font-mono">{formatMoney(portfolioValue)}</p>
                 </div>
             </div>
          </div>
        </div>

        {/* Right Column: P/L & Goal */}
        <div className="md:col-span-5 flex flex-col gap-6">
            
            {/* P/L Card */}
            <div className={`flex-1 rounded-3xl p-6 border shadow-sm flex flex-col justify-center relative overflow-hidden animate-slide-up ${
                totalUnrealizedPL >= 0 
                ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30'
            }`}
            style={{ animationDelay: '0.1s' }}
            >
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        {totalUnrealizedPL >= 0 ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-rose-600" />}
                        <p className={`text-xs font-bold uppercase tracking-wider ${totalUnrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Total Profit / Loss</p>
                    </div>
                    <h3 className={`text-3xl font-bold font-display ${totalUnrealizedPL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {totalUnrealizedPL >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPL)}
                    </h3>
                    <div className={`mt-3 inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold w-fit bg-white/60 dark:bg-black/20 backdrop-blur-sm ${totalPLPercent >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {totalPLPercent >= 0 ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                        {Math.abs(totalPLPercent).toFixed(2)}% Return
                    </div>
                 </div>
            </div>

            {/* Goal Progress */}
            <div 
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition-colors shadow-sm animate-slide-up" 
                onClick={onOpenGoalModal}
                style={{ animationDelay: '0.15s' }}
            >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                   <Target size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Goal Progress</p>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{((totalNetWorth / financialGoal) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((totalNetWorth / financialGoal) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- ROW 2: CHARTS & MOVERS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wealth Chart (Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm animate-slide-up" style={{ animationDelay: '0.2s' }}>
           <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Growth History</h3>
                <p className="text-xs text-slate-500 mt-1">Value over time vs Invested capital</p>
             </div>
             <div className="hidden sm:flex items-center space-x-4 text-xs font-bold">
                  <div className="flex items-center text-blue-500"><div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div> Market Value</div>
                  <div className="flex items-center text-slate-400"><div className="w-2 h-2 bg-slate-300 rounded-full mr-2"></div> Cost Basis</div>
              </div>
           </div>

           <div className="h-[280px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={15} minTickGap={40} 
                />
                <YAxis 
                  axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} 
                  tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}
                />
                <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="monotone" dataKey="invested" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Activity className="mb-2 opacity-50" size={32} />
                <p>No data to display yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Movers (Span 1) */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col animate-slide-up" style={{ animationDelay: '0.25s' }}>
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                 <Star size={18} className="text-amber-400 mr-2 fill-amber-400" /> Top Performers
              </h3>
           </div>
           
           <div className="flex-1 space-y-3">
              {topMovers.length > 0 ? (
                 topMovers.map((h, i) => (
                    <div 
                        key={h.symbol} 
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors animate-slide-up"
                        style={{ animationDelay: `${0.3 + (i * 0.1)}s`, animationFillMode: 'both' }}
                    >
                       <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700`}>
                             {h.symbol.substring(0,2)}
                          </div>
                          <div>
                             <div className="font-bold text-sm text-slate-900 dark:text-white">{h.symbol}</div>
                             <div className="text-[10px] text-slate-500 uppercase font-bold">{h.assetClass}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end">
                             <ArrowUpRight size={12} className="mr-0.5" />
                             {h.unrealizedPLPercent.toFixed(2)}%
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                             {formatMoney(h.marketValue)}
                          </div>
                       </div>
                    </div>
                 ))
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic opacity-70">
                    <Star size={32} className="mb-2 opacity-50" />
                    <span>No active positions</span>
                 </div>
              )}
           </div>
        </div>
      </div>

      {/* --- ROW 3: ALLOCATION & RECENT ACTIVITY --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Allocation Donut */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col relative h-[340px] animate-slide-up" style={{ animationDelay: '0.3s' }}>
           <div className="flex items-center justify-between mb-2">
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <PieChartIcon size={18} className="mr-2 text-slate-400" /> Allocation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedCategory || 'By Asset Class'}</p>
               </div>
               {selectedCategory && (
                  <button onClick={() => setSelectedCategory(null)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:text-slate-900 transition-colors">
                     <ChevronLeft size={16} />
                  </button>
               )}
           </div>

           <div className="flex items-center h-full">
              {/* Chart Side */}
              <div className="flex-1 h-[200px] relative">
                  {activeChartData.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                          cornerRadius={5}
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
              
              {/* Legend Side */}
              <div className="w-40 pl-4 h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                 {activeChartData.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg" onClick={() => !selectedCategory && setSelectedCategory(entry.name)}>
                       <div className="flex items-center">
                          <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[70px]">{entry.name}</span>
                       </div>
                       <div className="font-bold text-slate-900 dark:text-white">
                          {((entry.value / activeTotalValue) * 100).toFixed(0)}%
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[340px] animate-slide-up" style={{ animationDelay: '0.35s' }}>
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
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 animate-slide-up"
                        style={{ animationDelay: `${0.4 + (i * 0.1)}s`, animationFillMode: 'both' }}
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
