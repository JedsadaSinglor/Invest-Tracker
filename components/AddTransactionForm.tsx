
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, AssetClass, Holding } from '../types';
import { generateId, formatCurrency, formatNumber } from '../utils';
import { X, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, AlertCircle, ArrowRight, Trash2, Split, ChevronDown, ArrowRightCircle, CheckCircle2, FileText, Banknote, Percent, Info, Coins, Plus, Search } from 'lucide-react';
import { Spinner } from './LoadingSkeletons';

const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'V', 'JNJ', 'WMT', 'JPM',
  'VOO', 'VTI', 'QQQ', 'IVV', 'SCHD', 'JEPI', 'VUG', 'VTV',
  'BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'ADA'
];

interface AddTransactionFormProps {
  onClose: () => void;
  onSave: (t: Transaction) => Promise<void>;
  onDelete?: (id: string) => void;
  cashBalance: number;
  holdings: Holding[];
  prices: Record<string, number>;
  transactions: Transaction[];
  initialData: Transaction | null;
  defaultDate: string;
}

const useTransactionForm = (
  initialData: Transaction | null,
  defaultDate: string,
  holdings: Holding[],
  prices: Record<string, number>,
  cashBalance: number
) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(defaultDate);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(''); 
  const [totalAmount, setTotalAmount] = useState(''); 
  const [fee, setFee] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.STOCK);
  const [exchangeRate, setExchangeRate] = useState(''); 
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.type) setType(initialData.type);
      if (initialData.date) setDate(initialData.date);
      if (initialData.symbol) setSymbol(initialData.symbol);
      if (initialData.shares) setShares(initialData.shares.toString());
      if (initialData.price) setPrice(initialData.price.toString());
      if (initialData.fee) setFee(initialData.fee.toString());
      if (initialData.assetClass) setAssetClass(initialData.assetClass);
      if (initialData.exchangeRate) setExchangeRate(initialData.exchangeRate.toString());
      if (initialData.notes) setNotes(initialData.notes);
      
      if (initialData.shares && initialData.price && (initialData.type === TransactionType.BUY || initialData.type === TransactionType.SELL)) {
         setTotalAmount((initialData.shares * initialData.price).toFixed(2));
      } else if (initialData.price) {
          setTotalAmount(initialData.price.toString());
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && symbol && !price && !totalAmount) {
       const h = holdings.find(h => h.symbol === symbol.toUpperCase());
       if (h) { setAssetClass(h.assetClass); if (h.currentPrice > 0) setPrice(h.currentPrice.toString()); }
       else { const kp = prices[symbol.toUpperCase()]; if (kp) setPrice(kp.toString()); }
    }
  }, [symbol, holdings, prices, initialData, price, totalAmount]);

  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setShares(val);
    const s = parseFloat(val); const p = parseFloat(price);
    if (!isNaN(s) && !isNaN(p)) { setTotalAmount((s * p).toFixed(2)); }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setPrice(val);
    const p = parseFloat(val); const s = parseFloat(shares);
    if (!isNaN(p) && !isNaN(s)) { setTotalAmount((s * p).toFixed(2)); } 
    else if (!isNaN(p) && totalAmount && !shares) {
        const t = parseFloat(totalAmount); if (!isNaN(t) && p !== 0) setShares((t/p).toFixed(4));
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setTotalAmount(val);
    const t = parseFloat(val); const p = parseFloat(price);
    if (!isNaN(t) && !isNaN(p) && p !== 0) { setShares((t / p).toFixed(4)); }
  };

  const handleMax = () => {
    const p = parseFloat(price);
    if (type === TransactionType.BUY) {
        if (p > 0) {
            const maxAmt = Math.max(0, cashBalance);
            setTotalAmount(maxAmt.toFixed(2)); setShares((maxAmt / p).toFixed(4));
        } else { setTotalAmount(cashBalance.toFixed(2)); }
    } else if (type === TransactionType.SELL) {
        const holding = holdings.find(h => h.symbol === symbol.toUpperCase());
        if (holding) {
            setShares(holding.shares.toString());
            if (p > 0) setTotalAmount((holding.shares * p).toFixed(2));
        }
    }
  };

  return {
    step, setStep,
    type, setType,
    date, setDate,
    symbol, setSymbol,
    shares, setShares,
    price, setPrice,
    totalAmount, setTotalAmount,
    fee, setFee,
    assetClass, setAssetClass,
    exchangeRate, setExchangeRate,
    notes, setNotes,
    error, setError,
    isSaving, setIsSaving,
    handleSharesChange, handlePriceChange, handleTotalChange, handleMax
  };
};

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose, onSave, onDelete, cashBalance, holdings, prices, transactions, initialData, defaultDate }) => {
  const {
    step, setStep, type, setType, date, setDate, symbol, setSymbol, shares, setShares, price, setPrice, totalAmount, setTotalAmount, fee, setFee, assetClass, setAssetClass, exchangeRate, setExchangeRate, notes, setNotes, error, setError, isSaving, setIsSaving, handleSharesChange, handlePriceChange, handleTotalChange, handleMax
  } = useTransactionForm(initialData, defaultDate, holdings, prices, cashBalance);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const needsSymbol = [TransactionType.BUY, TransactionType.SELL, TransactionType.DIVIDEND, TransactionType.SPLIT].includes(type);
  const needsShares = [TransactionType.BUY, TransactionType.SELL, TransactionType.SPLIT].includes(type);
  const needsPrice = type !== TransactionType.SPLIT;
  const hasExchangeRate = type === TransactionType.DEPOSIT || type === TransactionType.WITHDRAW || type === TransactionType.DIVIDEND;
  const isFunding = type === TransactionType.DEPOSIT || type === TransactionType.WITHDRAW;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSymbols = useMemo(() => {
    const fromHoldings = holdings.map(h => h.symbol);
    const fromHistory = transactions.map(t => t.symbol).filter(s => s) as string[];
    return Array.from(new Set([...fromHoldings, ...fromHistory, ...POPULAR_SYMBOLS])).sort();
  }, [holdings, transactions]);

  const suggestions = useMemo(() => {
    if (!symbol) return [];
    const inputUpper = symbol.toUpperCase();
    return allSymbols.filter(s => s.includes(inputUpper)).slice(0, 6);
  }, [symbol, allSymbols]);

  const currentCashImpact = useMemo(() => {
     const qty = parseFloat(shares) || 0; const unitPrice = parseFloat(price) || 0; const feeVal = parseFloat(fee) || 0; const amt = parseFloat(totalAmount) || 0;
     if (type === TransactionType.BUY) return -((qty * unitPrice) + feeVal);
     if (type === TransactionType.SELL) return ((qty * unitPrice) - feeVal);
     if (type === TransactionType.DEPOSIT) return amt;
     if (type === TransactionType.WITHDRAW) return -amt;
     if (type === TransactionType.DIVIDEND) return amt;
     return 0;
  }, [type, shares, price, fee, totalAmount]);

  const originalCashImpact = useMemo(() => {
    if (!initialData) return 0;
    const qty = initialData.shares || 0; const unitPrice = initialData.price || 0; const feeVal = initialData.fee || 0;
    if (initialData.type === TransactionType.BUY) return -((qty * unitPrice) + feeVal);
    if (initialData.type === TransactionType.SELL) return ((qty * unitPrice) - feeVal);
    if (initialData.type === TransactionType.DEPOSIT) return unitPrice; 
    if (initialData.type === TransactionType.WITHDRAW) return -unitPrice;
    if (initialData.type === TransactionType.DIVIDEND) return unitPrice;
    return 0;
  }, [initialData]);

  const projectedCashBalance = cashBalance - originalCashImpact + currentCashImpact;
  const totalNetWorth = useMemo(() => {
     const invested = holdings.reduce((sum, h) => sum + h.marketValue, 0); return invested + cashBalance;
  }, [holdings, cashBalance]);
  
  const feePercentage = useMemo(() => {
     const feeVal = parseFloat(fee) || 0; const totalVal = parseFloat(totalAmount) || 0;
     return (feeVal > 0 && totalVal > 0) ? (feeVal / totalVal) * 100 : 0;
  }, [fee, totalAmount]);

  const validate = () => {
    if (needsSymbol && !symbol) return "Asset Symbol is required.";
    if (!needsSymbol && !totalAmount) return "Amount is required.";
    if (type === TransactionType.SELL) {
        const holding = holdings.find(h => h.symbol === symbol.toUpperCase());
        const currentShares = holding ? holding.shares : 0;
        const originalShares = (initialData && initialData.type === TransactionType.SELL && initialData.symbol === symbol) ? (initialData.shares || 0) : 0;
        const available = currentShares + originalShares;
        if ((parseFloat(shares) || 0) > available) return `Insufficient shares. Owned: ${formatNumber(available)}. Selling: ${shares}.`;
    }
    if ((type === TransactionType.WITHDRAW || type === TransactionType.BUY) && projectedCashBalance < 0) return "Insufficient funds. Transaction exceeds cash balance.";
    return null;
  };

  const handleReview = (e: React.FormEvent) => {
      e.preventDefault();
      const errMsg = validate();
      if (errMsg) return setError(errMsg);
      setError(null);
      setStep('review');
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    await onSave({
      id: initialData && initialData.id ? initialData.id : generateId(),
      date, type, symbol: needsSymbol ? symbol.toUpperCase() : undefined,
      shares: needsShares ? parseFloat(shares) : undefined,
      price: type === TransactionType.SPLIT ? 0 : (needsShares ? parseFloat(price) : parseFloat(totalAmount)),
      fee: (fee && (type === TransactionType.BUY || type === TransactionType.SELL)) ? parseFloat(fee) : undefined,
      assetClass: !needsSymbol ? AssetClass.CASH : assetClass,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1, notes: notes || undefined
    });
    setIsSaving(false);
  };

  const getTypeConfig = (t: TransactionType) => {
    switch (t) {
        case TransactionType.BUY: return { color: 'emerald', label: 'Buy Asset', icon: <TrendingUp size={18} /> };
        case TransactionType.DEPOSIT: return { color: 'blue', label: 'Deposit Cash', icon: <Wallet size={18} /> };
        case TransactionType.SELL: return { color: 'rose', label: 'Sell Asset', icon: <TrendingDown size={18} /> };
        case TransactionType.WITHDRAW: return { color: 'orange', label: 'Withdraw', icon: <Banknote size={18} /> };
        case TransactionType.DIVIDEND: return { color: 'teal', label: 'Dividend', icon: <Coins size={18} /> };
        case TransactionType.SPLIT: return { color: 'purple', label: 'Stock Split', icon: <Split size={18} /> };
        default: return { color: 'slate', label: t, icon: <CheckCircle2 size={18} /> };
    }
  }
  const theme = getTypeConfig(type);

  const summaryBox = useMemo(() => {
     const absImpact = Math.abs(currentCashImpact);
     const isPositiveFlow = currentCashImpact >= 0;
     const portfolioPercent = (totalNetWorth > 0) ? (absImpact / totalNetWorth) * 100 : 0;
     const impactColor = isPositiveFlow ? 'bg-emerald-500' : 'bg-rose-500';
     const impactTextColor = isPositiveFlow ? 'text-emerald-600' : 'text-rose-600';
     
     return (
         <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 mt-4">
             <div className="flex justify-between items-start mb-4">
                 <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Cash Impact</p>
                    <h3 className={`text-2xl font-bold font-display ${impactTextColor}`}>{isPositiveFlow ? '+' : '-'}{formatCurrency(absImpact)}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center"><Percent size={10} className="mr-1"/> ≈ {portfolioPercent.toFixed(1)}% of Total Portfolio</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projected Cash</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">{formatCurrency(projectedCashBalance)}</p>
                 </div>
             </div>
             <div className="relative h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="absolute top-0 left-0 h-full bg-slate-400 dark:bg-slate-500 transition-all" style={{ width: '100%' }}></div>
                 {projectedCashBalance < cashBalance && <div className={`absolute top-0 right-0 h-full ${impactColor} transition-all animate-pulse`} style={{ width: `${((cashBalance - projectedCashBalance)/cashBalance)*100}%` }}></div>}
                 {projectedCashBalance > cashBalance && <div className={`absolute top-0 left-0 h-full ${impactColor} transition-all`} style={{ width: '100%' }}></div>}
             </div>
             <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-bold uppercase">
                 <span>Before: {formatCurrency(cashBalance)}</span>
                 <span>After: {formatCurrency(projectedCashBalance)}</span>
             </div>
         </div>
     )
  }, [currentCashImpact, projectedCashBalance, cashBalance, totalNetWorth]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     setNotes(e.target.value);
     e.target.style.height = 'auto';
     e.target.style.height = `${e.target.scrollHeight}px`;
  }

  if (step === 'review') {
      return (
          <div className="flex flex-col h-full bg-white dark:bg-slate-900">
             <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
                <div className={`w-16 h-16 mx-auto rounded-full bg-${theme.color}-100 dark:bg-${theme.color}-900/30 text-${theme.color}-600 dark:text-${theme.color}-400 flex items-center justify-center mb-4 shadow-lg shadow-${theme.color}-500/20`}>
                   {theme.icon}
                </div>
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">Review Transaction</h3>
                <p className="text-sm text-slate-500">Please confirm details before saving.</p>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Date</span><span className="text-sm font-bold text-slate-900 dark:text-white">{date}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Type</span><span className={`text-sm font-bold uppercase text-${theme.color}-600`}>{theme.label}</span>
                     </div>
                     {needsSymbol && (
                         <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span className="text-sm text-slate-500">Asset</span><span className="text-sm font-bold text-slate-900 dark:text-white">{symbol} <span className="text-xs text-slate-400 font-normal">({assetClass})</span></span>
                         </div>
                     )}
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Total Amount</span><span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(totalAmount))}</span>
                     </div>
                     {needsShares && (
                        <div className="flex justify-between pt-1"><span className="text-xs text-slate-400">Details</span><span className="text-xs text-slate-500">{shares} units @ {formatCurrency(parseFloat(price))}</span></div>
                     )}
                 </div>
                 {projectedCashBalance < 0 && (
                     <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold flex items-center"><AlertCircle size={20} className="mr-3 shrink-0" /> WARNING: This transaction will result in a negative cash balance.</div>
                 )}
                 <div className="text-xs text-center text-slate-400 italic">Note: Transactions are stored in the base currency (USD).</div>
             </div>
             <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                 <button onClick={() => setStep('input')} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Back to Edit</button>
                 <button onClick={handleFinalSubmit} disabled={isSaving} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-xl flex items-center justify-center space-x-2 bg-${theme.color}-600 hover:bg-${theme.color}-700 transition-all`}>
                    {isSaving ? <Spinner className="text-white" /> : <><CheckCircle2 size={18} /><span>Confirm & Save</span></>}
                 </button>
             </div>
          </div>
      )
  }

  return (
    <>
      <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">{initialData?.id ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={20} /></button>
      </div>
      <form onSubmit={handleReview} className="flex-1 overflow-y-auto min-h-0 p-6 custom-scrollbar bg-white dark:bg-slate-900">
        <div className="mb-8">
           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">What would you like to do?</label>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[TransactionType.BUY, TransactionType.DEPOSIT, TransactionType.SELL, TransactionType.WITHDRAW, TransactionType.DIVIDEND, TransactionType.SPLIT].map(t => {
                 const isActive = type === t; const config = getTypeConfig(t);
                 return (
                   <button key={t} type="button" onClick={() => setType(t)} className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${isActive ? `border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-900/20 text-${config.color}-700 dark:text-${config.color}-400 ring-1 ring-${config.color}-500` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <div className={`p-2 rounded-lg ${isActive ? `bg-${config.color}-200 dark:bg-${config.color}-900/50` : 'bg-slate-100 dark:bg-slate-700'}`}>{config.icon}</div>
                      <span className="text-xs sm:text-sm font-bold">{config.label}</span>
                   </button>
                 )
              })}
           </div>
        </div>
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">When did this happen?</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" />
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
            {needsSymbol ? (
                <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2"><FileText size={18} /><h4 className="font-bold text-sm uppercase tracking-wide">Asset Details</h4></div>
                    <div className="relative z-20" ref={wrapperRef}>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Asset Symbol</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input type="text" placeholder="e.g. AAPL, BTC" value={symbol} onChange={e => { setSymbol(e.target.value); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold uppercase tracking-wide focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all" />
                             {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400">Suggestions</div>
                                    {suggestions.map(s => (
                                        <div key={s} onMouseDown={(e) => { e.preventDefault(); setSymbol(s); setShowSuggestions(false); }} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-0 group"><span>{s}</span><span className="text-xs text-blue-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center">Use <ArrowRightCircle size={12} className="ml-1"/></span></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Asset Class</label>
                        <select value={assetClass} onChange={e => setAssetClass(e.target.value as AssetClass)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                            {Object.values(AssetClass).filter(a => a !== AssetClass.CASH).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            ) : (
                <div className="hidden md:block"><div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700"><Wallet size={100} strokeWidth={1} /></div></div>
            )}
            <div className="space-y-5">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2"><DollarSign size={18} /><h4 className="font-bold text-sm uppercase tracking-wide">Financials (Base Currency)</h4></div>
                {(needsPrice || isFunding) && (
                   <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between"><span>{needsShares ? 'Total Amount' : 'Amount'}</span>{type === TransactionType.BUY && (<button type="button" onClick={handleMax} className="text-blue-500 hover:underline text-[10px] font-bold">Max Cash</button>)}</label>
                       <div className="relative group">
                           <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold ${type === TransactionType.SELL || type === TransactionType.WITHDRAW ? 'text-rose-500' : 'text-emerald-500'}`}>$</span>
                           <input type="number" step="any" min="0" placeholder="0.00" value={totalAmount} onChange={handleTotalChange} className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xl font-display font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all" />
                       </div>
                   </div>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                     {needsShares && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between"><span>Quantity</span>{type === TransactionType.SELL && (<button type="button" onClick={handleMax} className="text-rose-500 hover:underline text-[10px] font-bold">All</button>)}</label>
                            <input type="number" step="any" placeholder="0" value={shares} onChange={handleSharesChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                     )}
                     {needsPrice && needsShares && (
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Price / Share</label>
                           <input type="number" step="any" placeholder="0.00" value={price} onChange={handlePriceChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                     )}
                 </div>
                 {(type === TransactionType.BUY || type === TransactionType.SELL) && (
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Transaction Fee</label>
                        <input type="number" step="any" placeholder="0.00" value={fee} onChange={e => setFee(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        {feePercentage > 0 && <div className="text-[10px] text-slate-400 mt-1 flex items-center"><Info size={10} className="mr-1" /> ≈ {feePercentage.toFixed(2)}% of total amount</div>}
                    </div>
                 )}
                 {hasExchangeRate && (
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Exchange Rate (Optional)</label>
                       <input type="number" step="any" min="0" placeholder="1.0" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                 )}
            </div>
        </div>
        {summaryBox}
        <details className="group mt-4" open={!!notes}>
            <summary className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors w-fit"><span className="mr-2">Add Notes</span><ChevronDown size={14} className="group-open:rotate-180 transition-transform" /></summary>
            <div className="mt-2 animate-slide-up"><textarea ref={notesRef} rows={2} placeholder="E.g. Monthly DCA, Rebalancing..." value={notes} onChange={handleNoteChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none transition-all focus:border-blue-400 overflow-hidden min-h-[50px]" /></div>
        </details>
      </form>
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex gap-3">
             {error && <div className="absolute bottom-full left-0 w-full px-6 pb-2"><div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center animate-slide-up shadow-sm border border-rose-100"><AlertCircle size={16} className="mr-2" /> {error}</div></div>}
             {initialData?.id && onDelete && (<button type="button" onClick={() => onDelete(initialData!.id)} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 transition-colors"><Trash2 size={20} /></button>)}
             <button onClick={handleReview} title="Double check your details before saving" className={`flex-1 py-3 rounded-xl font-bold text-base text-white shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 bg-${theme.color}-600 hover:bg-${theme.color}-700 shadow-${theme.color}-500/30`}><span>Review & Save</span><ArrowRight size={18} /></button>
      </div>
    </>
  );
};

export default AddTransactionForm;
