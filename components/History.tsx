import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, AssetClass } from '../types';
import { Search, Filter, Trash2, Edit2, Plus, Download, Upload, TrendingUp, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown, Calendar, CheckCircle2, DollarSign, Split } from 'lucide-react';
import { formatNumber, transactionsToCSV, csvToTransactions } from '../utils';
import { HistorySkeleton } from './LoadingSkeletons';

interface HistoryProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onAdd: () => void;
  onImport: (txs: Transaction[]) => void;
  isLoading?: boolean;
  formatMoney: (amount: number) => string;
}

const History: React.FC<HistoryProps> = ({ transactions, onDelete, onEdit, onAdd, onImport, isLoading, formatMoney }) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC ---

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Search (Symbol, Notes)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (tx.symbol?.toLowerCase().includes(searchLower) ?? false) ||
        (tx.notes?.toLowerCase().includes(searchLower) ?? false) ||
        (tx.type.toLowerCase().includes(searchLower));

      // 2. Type Filter
      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;

      // 3. Asset Class Filter
      const matchesAsset = assetClassFilter === 'ALL' || tx.assetClass === assetClassFilter;

      // 4. Date Range
      const txDate = new Date(tx.date).getTime();
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      const matchesDate = txDate >= start && txDate <= end;

      return matchesSearch && matchesType && matchesAsset && matchesDate;
    }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, searchTerm, typeFilter, assetClassFilter, startDate, endDate, sortOrder]);

  // Group transactions by date for display
  const groupedTransactions = useMemo(() => {
    const groups: { title: string, txs: Transaction[] }[] = [];
    let currentKey = "";
    
    filteredTransactions.forEach(tx => {
       const dateObj = new Date(tx.date);
       const key = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
       if (key !== currentKey) {
           groups.push({ title: key, txs: [] });
           currentKey = key;
       }
       groups[groups.length - 1].txs.push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  // --- HANDLERS ---

  const handleExport = () => {
    const csv = transactionsToCSV(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const parsed = csvToTransactions(content);
      if (parsed.length > 0) {
        onImport(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const getTypeIcon = (type: TransactionType) => {
      switch(type) {
          case TransactionType.BUY: return <TrendingUp size={16} />;
          case TransactionType.SELL: return <TrendingDown size={16} />;
          case TransactionType.DEPOSIT: return <ArrowDown size={16} />;
          case TransactionType.WITHDRAW: return <ArrowUp size={16} />;
          case TransactionType.DIVIDEND: return <DollarSign size={16} />;
          case TransactionType.SPLIT: return <Split size={16} />;
          default: return <CheckCircle2 size={16} />;
      }
  };

  const getTypeColor = (type: TransactionType) => {
      switch(type) {
          case TransactionType.BUY: return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
          case TransactionType.SELL: return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
          case TransactionType.DEPOSIT: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
          case TransactionType.WITHDRAW: return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
          case TransactionType.DIVIDEND: return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
          case TransactionType.SPLIT: return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
          default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      }
  };

  if (isLoading) return <HistorySkeleton />;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 sticky top-20 z-10 bg-slate-50/90 dark:bg-[#0b1120]/90 backdrop-blur-sm py-2">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Transaction History</h2>
                <p className="text-sm text-slate-500">{transactions.length} records found</p>
             </div>
             
             <div className="flex items-center gap-2">
                 <button onClick={handleImportClick} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm" title="Import CSV">
                    <Upload size={18} />
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                 
                 <button onClick={handleExport} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm" title="Export CSV">
                    <Download size={18} />
                 </button>
                 
                 <button onClick={onAdd} className="flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all hover:opacity-90 active:scale-95">
                    <Plus size={18} />
                    <span className="hidden sm:inline">Add New</span>
                 </button>
             </div>
         </div>

         {/* 2. Search & Filter Bar */}
         <div className="flex flex-col md:flex-row gap-3">
             <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search by symbol, type, or notes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                 />
             </div>
             <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
             >
                <Filter size={18} />
                <span>Filters</span>
             </button>
         </div>

         {/* 3. Expanded Filters */}
         {showFilters && (
             <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Type</label>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none">
                       <option value="ALL">All Types</option>
                       {Object.values(TransactionType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Asset Class</label>
                    <select value={assetClassFilter} onChange={(e) => setAssetClassFilter(e.target.value as any)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none">
                       <option value="ALL">All Classes</option>
                       {Object.values(AssetClass).map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Date Range</label>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium outline-none" />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium outline-none" />
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Sort Order</label>
                    <button 
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium outline-none flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                        <ArrowUpDown size={14} />
                    </button>
                 </div>
             </div>
         )}
      </div>

      {/* 4. Transactions List */}
      <div className="space-y-8">
        {groupedTransactions.map((group) => (
            <div key={group.title} className="animate-slide-up">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pl-2 sticky top-[150px] bg-slate-50/95 dark:bg-[#0b1120]/95 py-2 backdrop-blur-sm z-10 w-fit rounded-r-lg pr-4">
                  {group.title}
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {group.txs.map((tx) => (
                      <div key={tx.id} className="group p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getTypeColor(tx.type)}`}>
                                {getTypeIcon(tx.type)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-slate-900 dark:text-white text-base">{tx.symbol || tx.type}</span>
                                    {tx.assetClass && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">{tx.assetClass}</span>}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {new Date(tx.date).toLocaleDateString()}</span>
                                    {tx.shares && <span className="font-medium">{formatNumber(tx.shares)} shares @ {formatMoney(tx.price || 0)}</span>}
                                    {tx.exchangeRate && tx.exchangeRate !== 1 && <span className="text-xs text-slate-400">(Rate: {tx.exchangeRate})</span>}
                                </div>
                                {tx.notes && <p className="text-xs text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded w-fit max-w-md">{tx.notes}</p>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                            <div className="text-right">
                                <div className={`text-lg font-bold font-mono ${
                                    tx.type === 'DEPOSIT' || tx.type === 'SELL' || tx.type === 'DIVIDEND' 
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : tx.type === 'WITHDRAW' || tx.type === 'BUY'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-slate-600 dark:text-slate-300'
                                }`}>
                                    {tx.type === 'DEPOSIT' || tx.type === 'SELL' || tx.type === 'DIVIDEND' ? '+' : ''}
                                    {tx.type === 'WITHDRAW' || tx.type === 'BUY' ? '-' : ''}
                                    {formatMoney((tx.shares && (tx.type === 'BUY' || tx.type === 'SELL')) ? (tx.shares * (tx.price||0)) : (tx.price||0))}
                                </div>
                                <div className="text-xs text-slate-400 font-medium uppercase">{tx.type}</div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onEdit(tx)}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button 
                                    onClick={() => onDelete(tx.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                      </div>
                  ))}
              </div>
            </div>
        ))}
        
        {groupedTransactions.length === 0 && (
            <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Search size={40} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No transactions found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filters.</p>
                <button onClick={() => { setSearchTerm(''); setTypeFilter('ALL'); setAssetClassFilter('ALL'); setStartDate(''); setEndDate(''); }} className="mt-4 text-blue-500 font-bold text-sm hover:underline">
                    Clear all filters
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default History;