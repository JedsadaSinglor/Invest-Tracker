
import React, { useState, useMemo } from 'react';
import { Holding, Transaction, AssetClass, TransactionType } from '../types';
import { formatNumber, calculateIRR } from '../utils';
import { 
  TrendingUp, TrendingDown, Wallet, DollarSign, Plus, Minus, Edit2, 
  PieChart as PieChartIcon, ArrowRight, LayoutGrid, LayoutList, 
  Layers, AlertTriangle, Lightbulb, CheckCircle2, ArrowUpDown, Filter, ChevronDown, ChevronRight, MoreHorizontal, Target, Coins, History, X, Save, Search
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend 
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

type ColumnGroup = 'GENERAL' | 'DIVIDENDS' | 'RETURNS';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

const useEnhancedHoldings = (
  holdings: Holding[],
  transactions: Transaction[],
  cashBalance: number,
  searchTerm: string,
  sortField: string,
  sortDirection: 'asc' | 'desc'
) => {
  const enhancedHoldings = useMemo(() => {
    let data = holdings.filter(h => h.shares > 0.000001 || h.realizedPL !== 0 || h.totalDividends > 0);
    
    // Filter
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        data = data.filter(h => h.symbol.toLowerCase().includes(lower) || h.name.toLowerCase().includes(lower));
    }

    const netWorth = data.reduce((sum, h) => sum + h.marketValue, 0) + cashBalance;

    return data.map(h => {
        // 1. Weight & Rebalance
        const weight = netWorth > 0 ? (h.marketValue / netWorth) * 100 : 0;
        
        // 2. Yield Calculations
        // Get dividends for this symbol in last 12 months
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const assetTxs = transactions.filter(t => t.symbol === h.symbol);
        const dividends = assetTxs.filter(t => t.type === TransactionType.DIVIDEND);
        const ttmDividends = dividends
             .filter(t => new Date(t.date) >= oneYearAgo)
             .reduce((sum, t) => sum + (t.price || 0), 0);
        
        const dividendYield = h.marketValue > 0 ? (ttmDividends / h.marketValue) * 100 : 0;
        const yieldOnCost = h.totalCost > 0 ? (ttmDividends / h.totalCost) * 100 : 0;

        // 3. IRR Calculation
        // Cashflows: Buys (-), Sells (+), Divs (+)
        // Terminal Value: Treat current market value as a + cashflow today
        const cashFlows = assetTxs
            .filter(t => t.type === TransactionType.BUY || t.type === TransactionType.SELL || t.type === TransactionType.DIVIDEND)
            .map(t => {
                const amt = (t.shares && (t.type === 'BUY' || t.type === 'SELL')) ? (t.shares * (t.price || 0)) : (t.price || 0);
                // Buy is Outflow (-), Sell/Div is Inflow (+)
                // Note: In transaction list, we usually store positive numbers.
                // We need to negate BUY.
                let flow = amt;
                if (t.type === TransactionType.BUY) flow = -amt - (t.fee || 0);
                if (t.type === TransactionType.SELL) flow = amt - (t.fee || 0);
                if (t.type === TransactionType.DIVIDEND) flow = amt;
                return { amount: flow, date: new Date(t.date) };
            });
        
        // Add Terminal Value if currently held
        if (h.marketValue > 0) {
            cashFlows.push({ amount: h.marketValue, date: new Date() });
        }

        const irr = calculateIRR(cashFlows);

        // 4. Total Profit
        const totalProfit = h.unrealizedPL + h.realizedPL + h.totalDividends;

        return { 
            ...h, 
            weight, 
            dividendYield, 
            yieldOnCost, 
            irr, 
            totalProfit,
            transactions: assetTxs // Attach for drill-down
        };
    });
  }, [holdings, transactions, cashBalance, searchTerm]);

  const sortedHoldings = useMemo(() => {
      return [...enhancedHoldings].sort((a, b) => {
        const valA = (a as any)[sortField];
        const valB = (b as any)[sortField];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
             return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [enhancedHoldings, sortField, sortDirection]);

  return { enhancedHoldings, sortedHoldings };
};

const Holdings: React.FC<HoldingsProps> = ({ holdings, transactions, cashBalance, onUpdatePrice, onUpdateTarget, onTrade, isLoading, formatMoney }) => {
  // View State
  const [activeGroup, setActiveGroup] = useState<ColumnGroup>('GENERAL');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<string | null>(null);
  const [isPriceUpdateModalOpen, setIsPriceUpdateModalOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<string>('marketValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Editing State (Inline)
  const [editingId, setEditingId] = useState<string | null>(null); 
  const [tempValue, setTempValue] = useState<string>('');

  const { enhancedHoldings, sortedHoldings } = useEnhancedHoldings(
    holdings, transactions, cashBalance, searchTerm, sortField, sortDirection
  );

  const handleSort = (field: string) => {
      if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      else { setSortField(field); setSortDirection('desc'); }
  };

  const startEdit = (id: string, value: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(id);
      setTempValue(value.toString());
  };

  const commitEdit = (symbol: string, field: 'price' | 'target') => {
      const val = parseFloat(tempValue);
      if (!isNaN(val) && val >= 0) {
          if (field === 'price') onUpdatePrice(symbol, val);
          if (field === 'target') onUpdateTarget(symbol, val);
      }
      setEditingId(null);
  };

  // --- RENDERERS ---

  const renderSortIcon = (field: string) => {
      if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity" />;
      return sortDirection === 'asc' ? <ArrowUpDown size={12} className="text-blue-500 rotate-180" /> : <ArrowUpDown size={12} className="text-blue-500" />;
  };

  const renderEditableCell = (h: typeof enhancedHoldings[0], field: 'price' | 'target') => {
      const id = `${h.symbol}-${field}`;
      const isEditing = editingId === id;
      const value = field === 'price' ? h.currentPrice : h.targetAllocation;

      if (isEditing) {
          return (
              <input 
                  autoFocus
                  type="number"
                  value={tempValue}
                  onChange={e => setTempValue(e.target.value)}
                  onBlur={() => commitEdit(h.symbol, field)}
                  onKeyDown={e => e.key === 'Enter' && commitEdit(h.symbol, field)}
                  onClick={e => e.stopPropagation()}
                  className="w-20 px-2 py-1 text-right text-xs font-bold border-2 border-blue-500 rounded bg-white dark:bg-slate-900 outline-none shadow-sm z-10"
              />
          );
      }

      return (
          <div 
            onClick={(e) => startEdit(id, value || 0, e)}
            className={`group/edit flex items-center justify-end gap-1 cursor-pointer py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${field === 'target' && !value ? 'text-slate-300' : ''}`}
          >
              <span className="font-mono text-sm">
                  {field === 'price' ? formatMoney(value) : (value ? `${value}%` : '-')}
              </span>
              <Edit2 size={10} className="opacity-0 group-hover/edit:opacity-100 text-slate-400 transition-opacity" />
          </div>
      );
  };

  if (isLoading) return <HoldingsSkeleton />;

  // --- SUB-COMPONENTS (INLINED FOR CONTEXT) ---

  const DividendRecordModal = () => {
     if (!selectedAssetForDetails) return null;
     const asset = enhancedHoldings.find(h => h.symbol === selectedAssetForDetails);
     if (!asset) return null;

     const dividendTxs = asset.transactions.filter(t => t.type === TransactionType.DIVIDEND).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

     return (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedAssetForDetails(null)}></div>
             <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-zoom-in border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                 <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            {asset.symbol.substring(0,2)}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">{asset.name}</h3>
                            <p className="text-xs text-slate-500 font-medium">Dividend Record</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedAssetForDetails(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                 </div>
                 
                 <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800">
                     <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Received</p>
                         <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(asset.totalDividends)}</p>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Yield (TTM)</p>
                         <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{asset.dividendYield.toFixed(2)}%</p>
                     </div>
                     <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payout Count</p>
                         <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">{dividendTxs.length}</p>
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                     <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                             <tr>
                                 <th className="px-6 py-3">Date</th>
                                 <th className="px-6 py-3 text-right">Amount</th>
                                 <th className="px-6 py-3 text-right">Notes</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             {dividendTxs.map(tx => (
                                 <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                     <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{new Date(tx.date).toLocaleDateString()}</td>
                                     <td className="px-6 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">+{formatMoney(tx.price || 0)}</td>
                                     <td className="px-6 py-3 text-right text-slate-400 text-xs italic">{tx.notes || '-'}</td>
                                 </tr>
                             ))}
                             {dividendTxs.length === 0 && (
                                 <tr>
                                     <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">No dividend records found.</td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
             </div>
         </div>
     )
  }

  const PriceUpdateModal = () => {
      const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
      
      const handleChange = (symbol: string, val: string) => {
          setLocalPrices(prev => ({...prev, [symbol]: val}));
      };

      const handleSave = () => {
          Object.entries(localPrices).forEach(([sym, val]) => {
              const num = parseFloat(val);
              if (!isNaN(num)) onUpdatePrice(sym, num);
          });
          setIsPriceUpdateModalOpen(false);
      };

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsPriceUpdateModalOpen(false)}></div>
              <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-zoom-in border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Update Market Prices</h3>
                      <button onClick={() => setIsPriceUpdateModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {holdings.map(h => (
                          <div key={h.symbol} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                                      {h.symbol.substring(0,2)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-900 dark:text-white text-sm">{h.symbol}</div>
                                      <div className="text-xs text-slate-500">Current: {formatMoney(h.currentPrice)}</div>
                                  </div>
                              </div>
                              <input 
                                type="number" 
                                placeholder={h.currentPrice.toString()}
                                value={localPrices[h.symbol] !== undefined ? localPrices[h.symbol] : ''}
                                onChange={(e) => handleChange(h.symbol, e.target.value)}
                                className="w-24 px-3 py-2 text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                          </div>
                      ))}
                  </div>
                  <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                      <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                          <Save size={18} /> Save Updates
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  // --- MAIN RENDER ---

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-1">Portfolio Holdings</h2>
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Layers size={14}/> {holdings.length} Assets</span>
                  <span className="flex items-center gap-1"><Wallet size={14}/> {formatMoney(enhancedHoldings.reduce((s, h) => s + h.marketValue, 0))}</span>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
               {/* Search */}
               <div className="relative flex-1 xl:flex-none xl:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Filter assets..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
               </div>

               <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

               {/* View Toggle */}
               <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-xl flex">
                   <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}><LayoutList size={18}/></button>
                   <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={18}/></button>
               </div>

               {/* Price Update */}
               <button 
                  onClick={() => setIsPriceUpdateModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
               >
                   <Edit2 size={14} /> <span>Update Prices</span>
               </button>
          </div>
      </div>

      {/* 2. Column Group Tabs (Only visible in Table Mode) */}
      {viewMode === 'table' && (
          <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700 pb-1 overflow-x-auto no-scrollbar">
              {(['GENERAL', 'DIVIDENDS', 'RETURNS'] as ColumnGroup[]).map(group => (
                  <button
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      className={`px-4 py-2 text-sm font-bold rounded-t-xl transition-all relative top-[1px] ${
                          activeGroup === group 
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-800' 
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                  >
                      {group.charAt(0) + group.slice(1).toLowerCase()}
                  </button>
              ))}
          </div>
      )}

      {/* 3. Main Data Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-b-3xl rounded-tr-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
          {viewMode === 'table' ? (
             <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 dark:bg-[#151e2e] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                         <tr>
                             {/* Fixed Left Column */}
                             <th className="px-6 py-4 cursor-pointer group sticky left-0 bg-slate-50 dark:bg-[#151e2e] z-10 shadow-sm" onClick={() => handleSort('symbol')}>
                                <div className="flex items-center gap-1">Asset {renderSortIcon('symbol')}</div>
                             </th>
                             
                             {activeGroup === 'GENERAL' && (
                                 <>
                                     <th className="px-4 py-4 cursor-pointer group" onClick={() => handleSort('sector')}><div className="flex items-center gap-1">Category {renderSortIcon('sector')}</div></th>
                                     <th className="px-4 py-4 text-right">Shares</th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('avgCost')}><div className="flex items-center justify-end gap-1">Avg Cost {renderSortIcon('avgCost')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('currentPrice')}><div className="flex items-center justify-end gap-1">Price (Edit) {renderSortIcon('currentPrice')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('marketValue')}><div className="flex items-center justify-end gap-1">Market Value {renderSortIcon('marketValue')}</div></th>
                                     <th className="px-4 py-4 text-center cursor-pointer group" onClick={() => handleSort('weight')}><div className="flex items-center justify-center gap-1">Alloc % {renderSortIcon('weight')}</div></th>
                                 </>
                             )}

                             {activeGroup === 'DIVIDENDS' && (
                                 <>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('dividendYield')}><div className="flex items-center justify-end gap-1">Yield (TTM) {renderSortIcon('dividendYield')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('yieldOnCost')}><div className="flex items-center justify-end gap-1">Yield on Cost {renderSortIcon('yieldOnCost')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('totalDividends')}><div className="flex items-center justify-end gap-1">Total Received {renderSortIcon('totalDividends')}</div></th>
                                     <th className="px-4 py-4 text-center">Record</th>
                                 </>
                             )}

                             {activeGroup === 'RETURNS' && (
                                 <>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('unrealizedPL')}><div className="flex items-center justify-end gap-1">Unrealized P/L {renderSortIcon('unrealizedPL')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('unrealizedPLPercent')}><div className="flex items-center justify-end gap-1">Return % {renderSortIcon('unrealizedPLPercent')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('realizedPL')}><div className="flex items-center justify-end gap-1">Realized P/L {renderSortIcon('realizedPL')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('totalProfit')}><div className="flex items-center justify-end gap-1">Total Profit {renderSortIcon('totalProfit')}</div></th>
                                     <th className="px-4 py-4 text-right cursor-pointer group" onClick={() => handleSort('irr')}><div className="flex items-center justify-end gap-1">IRR {renderSortIcon('irr')}</div></th>
                                 </>
                             )}
                             
                             <th className="px-4 py-4 text-center">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {sortedHoldings.map(h => (
                             <tr 
                                key={h.symbol} 
                                onClick={() => setSelectedAssetForDetails(h.symbol)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                             >
                                 <td className="px-6 py-4 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-none">
                                     <div className="flex items-center gap-3">
                                         <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600">
                                             {h.symbol.substring(0,2)}
                                         </div>
                                         <div>
                                             <div className="font-bold text-slate-900 dark:text-white text-sm">{h.symbol}</div>
                                             <div className="text-xs text-slate-500 truncate max-w-[120px]">{h.name}</div>
                                         </div>
                                     </div>
                                 </td>

                                 {activeGroup === 'GENERAL' && (
                                     <>
                                        <td className="px-4 py-4 text-xs font-bold text-slate-500 uppercase">{h.sector}</td>
                                        <td className="px-4 py-4 text-right font-medium text-slate-700 dark:text-slate-300">{formatNumber(h.shares)}</td>
                                        <td className="px-4 py-4 text-right text-xs text-slate-500">{formatMoney(h.avgCost)}</td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
                                            {renderEditableCell(h, 'price')}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold font-mono text-slate-900 dark:text-white">{formatMoney(h.marketValue)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="inline-flex flex-col items-center w-full">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{h.weight.toFixed(1)}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(h.weight, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                     </>
                                 )}

                                 {activeGroup === 'DIVIDENDS' && (
                                     <>
                                        <td className="px-4 py-4 text-right font-mono text-slate-700 dark:text-slate-300">{h.dividendYield.toFixed(2)}%</td>
                                        <td className="px-4 py-4 text-right font-mono text-slate-700 dark:text-slate-300">{h.yieldOnCost.toFixed(2)}%</td>
                                        <td className="px-4 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatMoney(h.totalDividends)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedAssetForDetails(h.symbol); }}
                                                className="text-xs font-bold text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                View
                                            </button>
                                        </td>
                                     </>
                                 )}

                                 {activeGroup === 'RETURNS' && (
                                     <>
                                        <td className={`px-4 py-4 text-right font-bold font-mono ${h.unrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {h.unrealizedPL >= 0 ? '+' : ''}{formatMoney(h.unrealizedPL)}
                                        </td>
                                        <td className={`px-4 py-4 text-right text-xs font-bold ${h.unrealizedPLPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {h.unrealizedPLPercent.toFixed(2)}%
                                        </td>
                                        <td className={`px-4 py-4 text-right font-mono ${h.realizedPL >= 0 ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                                            {formatMoney(h.realizedPL)}
                                        </td>
                                        <td className={`px-4 py-4 text-right font-bold font-mono ${h.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {formatMoney(h.totalProfit)}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-slate-900 dark:text-white">
                                            {h.irr !== null ? <span className={h.irr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{h.irr.toFixed(1)}%</span> : '-'}
                                        </td>
                                     </>
                                 )}

                                 <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                     <div className="flex justify-center gap-2">
                                          <button onClick={() => onTrade(h.symbol, TransactionType.BUY)} className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Buy More"><Plus size={14} /></button>
                                          <button onClick={() => onTrade(h.symbol, TransactionType.SELL)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 transition-colors" title="Sell"><Minus size={14} /></button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          ) : (
             <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in flex-1 content-start">
                  {sortedHoldings.map(h => (
                      <div key={h.symbol} onClick={() => setSelectedAssetForDetails(h.symbol)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-600">
                                      {h.symbol.substring(0,2)}
                                  </div>
                                  <div>
                                      <h3 className="font-bold text-slate-900 dark:text-white">{h.symbol}</h3>
                                      <p className="text-xs text-slate-500">{h.assetClass}</p>
                                  </div>
                              </div>
                              <div className={`text-xs font-bold px-2 py-1 rounded-lg ${h.unrealizedPLPercent >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                                  {h.unrealizedPLPercent >= 0 ? '+' : ''}{h.unrealizedPLPercent.toFixed(1)}%
                              </div>
                          </div>
                          
                          <div className="space-y-3 mb-5">
                              <div className="flex justify-between items-end">
                                  <span className="text-xs text-slate-400 font-medium">Value</span>
                                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{formatMoney(h.marketValue)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-400 font-medium">Profit</span>
                                  <span className={`text-sm font-bold ${h.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatMoney(h.totalProfit)}</span>
                              </div>
                          </div>

                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => onTrade(h.symbol, TransactionType.BUY)} className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors">Buy</button>
                              <button onClick={() => onTrade(h.symbol, TransactionType.SELL)} className="flex-1 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400 transition-colors">Sell</button>
                          </div>
                      </div>
                  ))}
             </div>
          )}
      </div>

      {/* MODALS */}
      {selectedAssetForDetails && <DividendRecordModal />}
      {isPriceUpdateModalOpen && <PriceUpdateModal />}

    </div>
  );
};

export default Holdings;
