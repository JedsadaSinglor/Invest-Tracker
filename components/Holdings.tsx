
import React, { useState, useMemo } from 'react';
import { Holding, Transaction, AssetClass, TransactionType } from '../types';
import { formatNumber } from '../utils';
import { 
  RefreshCw, Briefcase, Layers, Eye, EyeOff, Target, LayoutGrid, LayoutList, 
  TrendingUp, TrendingDown, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, 
  Wallet, DollarSign, Plus, Minus, Edit2, Lightbulb, AlertTriangle, 
  PieChart as PieChartIcon, ArrowRight, Scale, CheckCircle2, Info, 
  BarChart2, Activity, Coins, Percent
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip, 
  PieChart, Pie, Cell 
} from 'recharts';
import { HoldingsSkeleton } from './LoadingSkeletons';

interface HoldingsProps {
  holdings: Holding[];
  transactions: Transaction[];
  cashBalance: number;
  onUpdatePrice: (symbol: string, newPrice: number) => void;
  onUpdateTarget: (symbol: string, target: number) => void;
  onTrade: (symbol: string, type: TransactionType) => void;
  isLoading?: boolean;
  formatMoney: (amount: number) => string;
}

type SortField = 'marketValue' | 'unrealizedPL' | 'unrealizedPLPercent' | 'symbol' | 'totalCost' | 'shares' | 'weight' | 'assetClass' | 'sector';
type SortDirection = 'asc' | 'desc';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const Holdings: React.FC<HoldingsProps> = ({ holdings, transactions, cashBalance, onUpdatePrice, onUpdateTarget, onTrade, isLoading, formatMoney }) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [activeFilter, setActiveFilter] = useState<AssetClass | 'ALL'>('ALL');
  const [hideClosed, setHideClosed] = useState(true);
  
  // Chart State
  const [allocationMetric, setAllocationMetric] = useState<'assetClass' | 'symbol'>('assetClass');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('marketValue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Editing State
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [tempTarget, setTempTarget] = useState<string>('');

  // --- HANDLERS ---
  const handleSort = (field: SortField) => {
     if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
     else { setSortField(field); setSortDirection('desc'); }
  };

  const handleEditPriceClick = (symbol: string, currentPrice: number, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingPrice(symbol); setTempPrice(currentPrice.toString());
  };
  const handleSavePrice = (symbol: string) => {
    const price = parseFloat(tempPrice);
    if (!isNaN(price) && price >= 0) onUpdatePrice(symbol, price);
    setEditingPrice(null);
  };

  const handleEditTargetClick = (symbol: string, currentTarget: number, e: React.MouseEvent) => {
    e.stopPropagation(); setEditingTarget(symbol); setTempTarget(currentTarget.toString());
  };
  const handleSaveTarget = (symbol: string) => {
    const target = parseFloat(tempTarget);
    if (!isNaN(target) && target >= 0 && target <= 100) onUpdateTarget(symbol, target);
    setEditingTarget(null);
  };

  // --- DATA PROCESSING ---

  const { totalMarketValue, totalUnrealizedPL, totalCost, totalInvested } = useMemo(() => {
    const mv = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const cost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const pl = mv - cost;
    return { 
        totalMarketValue: mv, 
        totalCost: cost, 
        totalUnrealizedPL: pl,
        totalInvested: cost // Simplified for this context
    };
  }, [holdings]);

  const netWorth = totalMarketValue + cashBalance;
  const totalReturnPercent = totalCost > 0 ? (totalUnrealizedPL / totalCost) * 100 : 0;

  // Enhanced Allocation Analysis
  const allocationAnalysis = useMemo(() => {
    const totalDefinedTarget = holdings.reduce((sum, h) => sum + (h.targetAllocation || 0), 0);
    const impliedCashTarget = Math.max(0, 100 - totalDefinedTarget);

    let data: any[] = [];

    if (allocationMetric === 'assetClass') {
        const groups: Record<string, { value: number, target: number }> = {};
        Object.values(AssetClass).forEach(ac => { if (ac !== AssetClass.CASH) groups[ac] = { value: 0, target: 0 }; });

        holdings.forEach(h => {
            if (!groups[h.assetClass]) groups[h.assetClass] = { value: 0, target: 0 };
            groups[h.assetClass].value += h.marketValue;
            groups[h.assetClass].target += (h.targetAllocation || 0);
        });
        groups['Cash'] = { value: cashBalance, target: impliedCashTarget };

        data = Object.entries(groups)
            .filter(([_, stats]) => stats.value > 0 || stats.target > 0)
            .map(([name, stats]) => ({
                name,
                value: stats.value,
                targetPct: stats.target,
                actualPct: netWorth > 0 ? (stats.value / netWorth) * 100 : 0
            }));
    } else {
        data = holdings.map(h => ({
            name: h.symbol,
            value: h.marketValue,
            targetPct: h.targetAllocation || 0,
            actualPct: netWorth > 0 ? (h.marketValue / netWorth) * 100 : 0
        }));
        if (cashBalance > 0 || impliedCashTarget > 0) {
            data.push({ name: 'Cash', value: cashBalance, targetPct: impliedCashTarget, actualPct: netWorth > 0 ? (cashBalance / netWorth) * 100 : 0 });
        }
    }

    return data.map(item => ({
        ...item,
        driftPct: item.actualPct - item.targetPct,
        actionValue: (item.targetPct - item.actualPct) / 100 * netWorth
    })).sort((a, b) => b.value - a.value);
  }, [holdings, allocationMetric, cashBalance, netWorth]);

  // Filtering & Sorting
  const displayHoldings = useMemo(() => {
    let filtered = holdings;
    if (hideClosed) filtered = filtered.filter(h => h.shares > 0.000001);
    if (activeFilter !== 'ALL') filtered = filtered.filter(h => h.assetClass === activeFilter);
    
    const enriched = filtered.map(h => ({
        ...h,
        weight: totalMarketValue > 0 ? (h.marketValue / totalMarketValue) * 100 : 0,
        diff: (totalMarketValue > 0 ? (h.marketValue / netWorth) * 100 : 0) - (h.targetAllocation || 0)
    }));

    return enriched.sort((a, b) => {
        let valA: any = a[sortField as keyof typeof a];
        let valB: any = b[sortField as keyof typeof b];
        if (sortField === 'weight') { valA = a.weight; valB = b.weight; }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [holdings, hideClosed, activeFilter, sortField, sortDirection, totalMarketValue, netWorth]);

  const bestPerformer = useMemo(() => {
     if (holdings.length === 0) return null;
     return [...holdings].filter(h => h.shares > 0).sort((a,b) => b.unrealizedPLPercent - a.unrealizedPLPercent)[0];
  }, [holdings]);

  // --- SMART INSIGHTS ---
  const insights = useMemo(() => {
      const msgs = [];
      const topHolding = displayHoldings.sort((a,b) => b.weight - a.weight)[0];
      const cashPercent = (cashBalance / netWorth) * 100;

      // 1. Concentration
      if (topHolding && topHolding.weight > 40) {
          msgs.push({ type: 'warning', text: `Concentration Risk: ${topHolding.symbol} makes up ${topHolding.weight.toFixed(1)}% of your equity.` });
      }
      // 2. Cash Drag
      if (cashPercent > 20) {
          msgs.push({ type: 'info', text: `High Cash Balance: You have ${cashPercent.toFixed(1)}% in cash. Consider deploying capital.` });
      }
      // 3. Drift
      const maxDrift = Math.max(...allocationAnalysis.map(a => Math.abs(a.driftPct)));
      if (maxDrift > 10) {
          msgs.push({ type: 'alert', text: `Portfolio Drift: Your allocation has drifted by over 10% from your targets.` });
      }
      // 4. Performance
      if (totalReturnPercent > 10) {
          msgs.push({ type: 'success', text: `Strong Performance: Your portfolio is up ${totalReturnPercent.toFixed(1)}% overall. Great job!` });
      }

      return msgs.slice(0, 3); // Limit to top 3
  }, [displayHoldings, cashBalance, netWorth, allocationAnalysis, totalReturnPercent]);


  if (isLoading) return <HoldingsSkeleton />;

  // --- COMPONENTS ---

  const renderSparkline = (h: Holding, height = 40) => {
    const sparklineData = transactions
      .filter(t => t.symbol === h.symbol && (t.type === 'BUY' || t.type === 'SELL'))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t) => ({ date: t.date, price: t.price! }));
    if (h.currentPrice > 0) sparklineData.push({ date: 'Now', price: h.currentPrice });

    const color = h.unrealizedPL >= 0 ? '#10b981' : '#f43f5e';
    if (sparklineData.length < 2) return <div className="text-[10px] text-slate-300 italic h-full flex items-center justify-center opacity-50">No Data</div>;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${h.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#gradient-${h.symbol})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderCard = (h: any, index: number) => {
    const isEditingPrice = editingPrice === h.symbol;
    const isEditingTarget = editingTarget === h.symbol;
    const target = h.targetAllocation || 0;
    
    return (
      <div 
        key={h.symbol} 
        className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-4 relative flex flex-col justify-between animate-slide-up"
        style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
      >
         {/* Top Row: Symbol & Price */}
         <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${h.unrealizedPL >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>
                  {h.symbol.substring(0, 2)}
               </div>
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{h.symbol}</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400">{h.assetClass}</p>
               </div>
            </div>
            <div className="text-right" onClick={(e) => !isEditingPrice && handleEditPriceClick(h.symbol, h.currentPrice, e)}>
               {isEditingPrice ? (
                  <input 
                    autoFocus type="number" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)}
                    onBlur={() => handleSavePrice(h.symbol)} onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(h.symbol)}
                    className="w-20 px-2 py-1 text-right text-sm font-bold border-2 border-blue-500 rounded bg-white dark:bg-slate-900 outline-none"
                  />
               ) : (
                  <div className="group/price cursor-pointer">
                     <div className="text-base font-bold text-slate-900 dark:text-white group-hover/price:text-blue-500 transition-colors">{formatMoney(h.currentPrice)}</div>
                     <div className="text-[10px] text-slate-400 opacity-0 group-hover/price:opacity-100 transition-opacity">Edit Price</div>
                  </div>
               )}
            </div>
         </div>

         {/* Sparkline */}
         <div className="h-10 -mx-2 mb-3 opacity-80">{renderSparkline(h)}</div>

         {/* Metrics Grid */}
         <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-4">
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase">Value</p>
               <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMoney(h.marketValue)}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase">Return</p>
               <p className={`text-sm font-bold ${h.unrealizedPLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.unrealizedPLPercent >= 0 ? '+' : ''}{h.unrealizedPLPercent.toFixed(2)}%
               </p>
            </div>
            <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase">P/L</p>
               <p className={`text-sm font-bold ${h.unrealizedPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {h.unrealizedPL >= 0 ? '+' : ''}{formatMoney(h.unrealizedPL)}
               </p>
            </div>
            <div className="text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer" onClick={(e) => handleEditTargetClick(h.symbol, target, e)}>
                    {isEditingTarget ? (
                        <input 
                            autoFocus type="number" value={tempTarget} onChange={(e) => setTempTarget(e.target.value)}
                            onBlur={() => handleSaveTarget(h.symbol)} onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget(h.symbol)}
                            className="w-10 text-right text-xs font-bold border-b-2 border-blue-500 bg-transparent outline-none"
                        />
                    ) : (
                        <>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Target</p>
                            <span className="text-xs font-bold ml-1 text-slate-700 dark:text-slate-300">{target}%</span>
                        </>
                    )}
                </div>
                <div className={`text-[10px] font-bold ${h.diff > 0 ? 'text-emerald-500' : h.diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    Diff: {h.diff > 0 ? '+' : ''}{h.diff.toFixed(1)}%
                </div>
            </div>
         </div>

         {/* Footer Actions */}
         <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={() => onTrade(h.symbol, TransactionType.BUY)} className="flex-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">Buy</button>
             <button onClick={() => onTrade(h.symbol, TransactionType.SELL)} className="flex-1 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">Sell</button>
         </div>
      </div>
    );
  };

  const renderSummaryRow = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* 1. Net Worth Context */}
          <div className="group relative bg-[#1C2430] text-white p-5 rounded-2xl shadow-lg border border-slate-700 overflow-hidden animate-slide-up">
              <div className="relative z-10">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      Total Net Worth <Info size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <h3 className="text-3xl font-display font-bold mb-2">{formatMoney(netWorth)}</h3>
                  <div className="flex gap-4 text-[10px] font-bold uppercase text-slate-400">
                      <span className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5"></div> Assets: {formatMoney(totalMarketValue)}</span>
                      <span className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></div> Cash: {formatMoney(cashBalance)}</span>
                  </div>
              </div>
              {/* Decorative Blur */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] -mr-10 -mt-10"></div>
          </div>

          {/* 2. P/L with Sparkline */}
          <div 
            className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between animate-slide-up ${totalUnrealizedPL >= 0 ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30'}`}
            style={{ animationDelay: '0.1s' }}
          >
              <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${totalUnrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Total P/L</p>
                  <div className="flex items-baseline gap-2">
                      <h3 className={`text-2xl font-display font-bold ${totalUnrealizedPL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {totalUnrealizedPL >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPL)}
                      </h3>
                      <span className={`text-sm font-bold ${totalUnrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ({totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
                      </span>
                  </div>
              </div>
              {/* Mini visual bar for return */}
              <div className="w-full h-1.5 bg-white/50 dark:bg-black/20 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full ${totalUnrealizedPL >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(Math.abs(totalReturnPercent), 100)}%` }}></div>
              </div>
          </div>

           {/* 3. Interactive Asset Filter */}
           <div 
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col animate-slide-up"
            style={{ animationDelay: '0.2s' }}
           >
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Positions</p>
              <div className="flex items-center gap-2 mb-2">
                 <h3 className="text-3xl font-display font-bold text-slate-900 dark:text-white">{holdings.filter(h => h.shares > 0).length}</h3>
                 <span className="text-xs text-slate-400 font-medium">Assets</span>
              </div>
              <div className="flex gap-2 mt-auto">
                 {['ALL', 'Stock', 'Crypto'].map((type) => (
                     <button 
                        key={type}
                        onClick={() => setActiveFilter(type as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            activeFilter === type 
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                     >
                        {type}
                     </button>
                 ))}
              </div>
          </div>

           {/* 4. Top Performer */}
           <div 
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between animate-slide-up"
            style={{ animationDelay: '0.3s' }}
           >
               {bestPerformer ? (
                   <>
                       <div className="flex justify-between items-start">
                           <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Performer</p>
                           <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">{bestPerformer.assetClass}</span>
                       </div>
                       <div className="mt-2">
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{bestPerformer.symbol}</h3>
                           <p className="text-emerald-500 font-bold text-lg flex items-center">
                               <TrendingUp size={16} className="mr-1" />
                               +{bestPerformer.unrealizedPLPercent.toFixed(1)}%
                           </p>
                       </div>
                   </>
               ) : (
                   <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">No data available</div>
               )}
           </div>
      </div>
  );

  const renderTableHead = (label: string, field: SortField, align = 'left', tooltip?: string) => (
      <th 
         className={`sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
         onClick={() => handleSort(field)}
         title={tooltip}
      >
         <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {label}
            {sortField === field && <ArrowUpDown size={12} className={sortDirection === 'asc' ? 'rotate-180' : ''} />}
         </div>
      </th>
  );

  // Check allocationMetric
  const isSymbolView = allocationMetric === 'symbol';

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* 1. Summary Dashboard */}
      {renderSummaryRow()}

      {/* 2. Rebalancing & Allocation Section - REDESIGNED */}
      {allocationAnalysis.length > 0 && (
         <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-0 overflow-hidden shadow-sm animate-slide-up flex flex-col lg:flex-row h-auto lg:h-[450px]">
             
             {/* Left: Chart Section */}
             <div className="lg:w-[350px] flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-6">
                 {/* Header */}
                 <div className="flex items-center justify-between mb-2">
                     <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieChartIcon size={18} className="text-indigo-500"/> Allocation
                     </h3>
                     {/* Toggle */}
                     <div className="bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg flex text-[10px] font-bold">
                         <button onClick={() => setAllocationMetric('assetClass')} className={`px-2 py-1 rounded-md transition-all ${allocationMetric === 'assetClass' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Class</button>
                         <button onClick={() => setAllocationMetric('symbol')} className={`px-2 py-1 rounded-md transition-all ${allocationMetric === 'symbol' ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Symbol</button>
                     </div>
                 </div>

                 {/* Chart */}
                 <div className="flex-1 relative min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={allocationAnalysis} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" cornerRadius={4} stroke="none">
                                  {allocationAnalysis.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', padding: '8px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} formatter={(value: number) => formatMoney(value)} />
                          </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Total Value</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{formatMoney(netWorth).split('.')[0]}</p>
                      </div>
                 </div>
                 
                 {/* Mini Legend (Top 3) */}
                 <div className="mt-4 space-y-1.5">
                    {allocationAnalysis.slice(0, 3).map((item, idx) => (
                        <div key={item.name} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.actualPct.toFixed(1)}%</span>
                        </div>
                    ))}
                 </div>
             </div>

             {/* Right: Detailed Table */}
             <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800">
                 {/* Header Row */}
                 <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <Scale size={16} className="text-slate-400" /> Rebalancing Targets
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                        {isSymbolView ? '* Click percentages to edit target' : '* Switch to Symbol view to edit targets'}
                    </div>
                 </div>
                 
                 {/* Table Content */}
                 <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 z-10 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            <tr>
                                <th className="px-6 py-2">Asset</th>
                                <th className="px-4 py-2 w-1/3">Allocation (Act vs Tgt)</th>
                                <th className="px-4 py-2 text-right">Drift</th>
                                <th className="px-6 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                             {allocationAnalysis.map((item, idx) => {
                                 const barColor = COLORS[idx % COLORS.length];
                                 const actionType = item.actionValue > 0 ? 'Buy' : 'Sell';
                                 const showAction = Math.abs(item.actionValue) > 10; // Threshold $10
                                 
                                 const isEditing = editingTarget === item.name;
                                 const canEditTarget = isSymbolView;
                                 const canTakeAction = isSymbolView;

                                 return (
                                     <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                                         {/* Asset Column */}
                                         <td className="px-6 py-3 align-middle">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-1.5 h-8 rounded-full shrink-0 opacity-80" style={{ backgroundColor: barColor }}></div>
                                                 <div className="min-w-0">
                                                     <div className="font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                                                     <div className="text-[10px] text-slate-400 font-mono">{formatMoney(item.value)}</div>
                                                 </div>
                                             </div>
                                         </td>

                                         {/* Visual Bar Column */}
                                         <td className="px-4 py-3 align-middle">
                                             <div className="flex flex-col gap-1">
                                                 <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                     <span>{item.actualPct.toFixed(1)}%</span>
                                                     <div 
                                                        onClick={(e) => canEditTarget && !isEditing && handleEditTargetClick(item.name, item.targetPct, e)}
                                                        className={`flex items-center gap-1 transition-colors ${canEditTarget ? 'cursor-pointer hover:text-blue-500' : 'cursor-default opacity-70'}`}
                                                        title={canEditTarget ? "Click to edit target" : "Switch to Symbol view to edit targets"}
                                                     >
                                                         {isEditing ? (
                                                             <input 
                                                                autoFocus 
                                                                type="number" 
                                                                value={tempTarget} 
                                                                onChange={(e) => setTempTarget(e.target.value)}
                                                                onBlur={() => handleSaveTarget(item.name)} 
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget(item.name)}
                                                                className="w-10 text-right bg-white dark:bg-slate-900 border-b-2 border-blue-500 outline-none p-0 text-[10px]"
                                                             />
                                                         ) : (
                                                             <span>Target: {item.targetPct}%</span>
                                                         )}
                                                         {!isEditing && canEditTarget && <Edit2 size={8} className="opacity-0 group-hover:opacity-100" />}
                                                     </div>
                                                 </div>
                                                 {/* Bar Container */}
                                                 <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                     {/* Actual Bar */}
                                                     <div 
                                                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-500" 
                                                        style={{ width: `${Math.min(item.actualPct, 100)}%`, backgroundColor: barColor }} 
                                                     />
                                                 </div>
                                                 {/* Target Marker Overlay */}
                                                 <div className="relative h-0 w-full">
                                                     <div 
                                                        className="absolute -top-2 w-0.5 h-2 bg-black dark:bg-white z-10" 
                                                        style={{ left: `${Math.min(item.targetPct, 100)}%` }} 
                                                        title={`Target: ${item.targetPct}%`}
                                                     />
                                                 </div>
                                             </div>
                                         </td>

                                         {/* Drift Column */}
                                         <td className="px-4 py-3 align-middle text-right">
                                             <span className={`text-xs font-bold ${item.driftPct > 0 ? 'text-emerald-500' : item.driftPct < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                 {item.driftPct > 0 ? '+' : ''}{item.driftPct.toFixed(1)}%
                                             </span>
                                         </td>

                                         {/* Action Column */}
                                         <td className="px-6 py-3 align-middle text-right">
                                             {showAction ? (
                                                 canTakeAction ? (
                                                    <button 
                                                        onClick={() => onTrade(item.name, actionType === 'Buy' ? TransactionType.BUY : TransactionType.SELL)}
                                                        className={`flex flex-col items-end w-full hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded-lg transition-colors group/btn`}
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${actionType === 'Buy' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {actionType}
                                                            <ArrowRight size={10} className="opacity-0 group-hover/btn:opacity-100 transition-opacity -rotate-45" />
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                                                            {formatMoney(Math.abs(item.actionValue))}
                                                        </span>
                                                    </button>
                                                 ) : (
                                                    <div className="flex flex-col items-end opacity-70" title="Switch to Symbol view to take action">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${actionType === 'Buy' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                            {actionType}
                                                        </span>
                                                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                                                            {formatMoney(Math.abs(item.actionValue))}
                                                        </span>
                                                    </div>
                                                 )
                                             ) : (
                                                 <div className="flex justify-end text-emerald-500" title="Allocation within 1% of target">
                                                     <CheckCircle2 size={18} />
                                                 </div>
                                             )}
                                         </td>
                                     </tr>
                                 )
                             })}
                        </tbody>
                     </table>
                 </div>
             </div>
         </div>
      )}

      {/* 3. Performance Summary Strip */}
      <div className="bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-700 rounded-full shadow-sm text-slate-400">
                  <Activity size={24} />
              </div>
              <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Performance Summary</h4>
                  <p className="text-xs text-slate-500">Lifetime portfolio performance metric</p>
              </div>
          </div>
          <div className="flex items-center gap-8 text-sm">
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Invested</p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatMoney(totalInvested)}</p>
              </div>
              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Current Value</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{formatMoney(totalMarketValue)}</p>
              </div>
              <div className="hidden sm:block w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
              <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Return</p>
                  <p className={`font-mono font-bold ${totalUnrealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {totalUnrealizedPL >= 0 ? '+' : ''}{formatMoney(totalUnrealizedPL)}
                  </p>
              </div>
          </div>
      </div>

      {/* 4. Controls Toolbar & Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-1 rounded-xl sticky top-20 z-20">
         <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mr-4">Holdings</h2>
            <button 
               onClick={() => setHideClosed(!hideClosed)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${hideClosed ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
               {hideClosed ? <Eye size={14} /> : <EyeOff size={14} />} Active
            </button>
         </div>

         {/* View Toggle */}
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-end md:self-auto">
             <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-white' : 'text-slate-400'}`}>
                <LayoutGrid size={16} />
             </button>
             <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-white' : 'text-slate-400'}`}>
                <LayoutList size={16} />
             </button>
         </div>
      </div>

      {/* 5. HOLDINGS CONTENT */}
      <div className="min-h-[400px]">
          {viewMode === 'card' ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayHoldings.map((h, index) => renderCard(h, index))}
             </div>
          ) : (
            // --- TABLE VIEW ---
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[70vh] animate-slide-up">
                <div className="overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr>
                                {renderTableHead('Symbol', 'symbol', 'left', 'Asset Ticker')}
                                <th className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" title="Asset Category">Class</th>
                                <th className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell" title="Industry Sector">Sector</th>
                                <th className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right" title="Current Market Price">Price</th>
                                {renderTableHead('Shares', 'shares', 'right', 'Quantity Owned')}
                                {renderTableHead('Avg Cost', 'totalCost', 'right', 'Average Buy Price per Share')}
                                {renderTableHead('Value', 'marketValue', 'right', 'Total Market Value (Price * Shares)')}
                                <th className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right" title="Percentage Return on Investment">Return %</th>
                                {renderTableHead('Unrealized P/L', 'unrealizedPL', 'right', 'Profit/Loss (Value - Cost)')}
                                <th className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {displayHoldings.map((h) => {
                                const isEditingPrice = editingPrice === h.symbol;
                                return (
                                <tr key={h.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                                                {h.symbol.substring(0,2)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{h.symbol}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[100px]">{h.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">{h.assetClass}</span></td>
                                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{h.sector}</td>
                                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                                         {isEditingPrice ? (
                                            <input autoFocus type="number" value={tempPrice} onChange={(e) => setTempPrice(e.target.value)} className="w-20 px-1 py-0.5 text-right text-sm border border-blue-500 rounded bg-white dark:bg-slate-900 focus:outline-none" onBlur={() => handleSavePrice(h.symbol)} onKeyDown={(e) => e.key === 'Enter' && handleSavePrice(h.symbol)} />
                                         ) : (
                                            <div className="cursor-pointer hover:text-blue-500" onClick={(e) => handleEditPriceClick(h.symbol, h.currentPrice, e)}>{formatMoney(h.currentPrice)}</div>
                                         )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">{formatNumber(h.shares)}</td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-slate-400">{formatMoney(h.avgCost)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{formatMoney(h.marketValue)}</td>
                                    <td className={`px-4 py-3 text-right font-bold text-sm ${h.unrealizedPLPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{h.unrealizedPLPercent.toFixed(2)}%</td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold text-sm ${h.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{h.unrealizedPL >= 0 ? '+' : ''}{formatMoney(h.unrealizedPL)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onTrade(h.symbol, TransactionType.BUY)} className="p-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600" title="Buy"><Plus size={14} /></button>
                                            <button onClick={() => onTrade(h.symbol, TransactionType.SELL)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600" title="Sell"><Minus size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* Empty State */}
          {displayHoldings.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 animate-slide-up">
                  <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-6"><Briefcase size={40} className="text-slate-300" /></div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Assets Found</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2 mb-6">Your portfolio matches no criteria.</p>
              </div>
          )}
      </div>

      {/* 6. Smart Insights Section */}
      {displayHoldings.length > 0 && (
         <div className="bg-indigo-50 dark:bg-slate-800/60 border border-indigo-100 dark:border-slate-700 rounded-2xl p-6 mt-8 animate-slide-up">
             <div className="flex items-start gap-4">
                 <div className="p-3 bg-white dark:bg-slate-700 rounded-xl text-indigo-500 shadow-sm shrink-0">
                     <Lightbulb size={24} />
                 </div>
                 <div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white">Portfolio Insights</h3>
                     <div className="mt-3 space-y-3">
                         {insights.length > 0 ? insights.map((msg, i) => (
                             <div key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                                 {msg.type === 'warning' ? <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" /> : 
                                  msg.type === 'success' ? <TrendingUp size={16} className="text-emerald-500 mt-0.5 shrink-0" /> :
                                  msg.type === 'alert' ? <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" /> :
                                  <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />}
                                 <span>{msg.text}</span>
                             </div>
                         )) : (
                             <p className="text-sm text-slate-500 italic">Your portfolio looks balanced. No critical alerts.</p>
                         )}
                     </div>
                 </div>
             </div>
         </div>
      )}

    </div>
  );
};

export default Holdings;
