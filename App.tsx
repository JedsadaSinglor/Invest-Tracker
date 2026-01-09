
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import Reports from './components/Reports';
import History from './components/History';
import GoalModal from './components/GoalModal';
import { Transaction, TransactionType, AssetClass, Holding, Portfolio, FinancialGoal } from './types';
import { calculateHoldings, calculatePortfolioHistory, generateId, formatCurrency, formatNumber } from './utils';
import { X, Save, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, GitFork, AlertCircle, ArrowRight, Trash2, Zap, Calculator, Search, Clock, PlusCircle, MinusCircle, RefreshCcw, Split, Hash, ChevronDown, ArrowRightCircle, Globe, CheckCircle2, FileText, Banknote, Percent, Info, Coins, Plus } from 'lucide-react';
import { Spinner } from './components/LoadingSkeletons';

const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B', 'V', 'JNJ', 'WMT', 'JPM', // Tech/Blue Chip
  'VOO', 'VTI', 'QQQ', 'IVV', 'SCHD', 'JEPI', 'VUG', 'VTV', // ETFs
  'BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'ADA' // Crypto
];

// Helper to safely parse JSON from localStorage without crashing
const safeJSONParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error parsing ${key} from localStorage, using fallback.`, error);
    return fallback;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  
  // Persistence for better UX
  const [lastTxDate, setLastTxDate] = useState<string>(() => {
      return localStorage.getItem('lastTxDate') || new Date().toISOString().split('T')[0];
  });

  // Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // --- CONFIRMATION MODAL STATE ---
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- GLOBAL CURRENCY STATE ---
  const [globalCurrency, setGlobalCurrency] = useState<string>(() => localStorage.getItem('globalCurrency') || 'USD');
  const [globalFxRate, setGlobalFxRate] = useState<number>(() => {
      const saved = localStorage.getItem('globalFxRate');
      const parsed = parseFloat(saved || '');
      return !isNaN(parsed) ? parsed : 34.0; // Default approximation
  });

  const handleCurrencyChange = (curr: string) => {
      setGlobalCurrency(curr);
      localStorage.setItem('globalCurrency', curr);
  };

  const handleFxRateChange = (rate: number) => {
      setGlobalFxRate(rate);
      localStorage.setItem('globalFxRate', rate.toString());
  };

  // Helper to be passed down to components
  // It converts the base Amount (USD) to the Display Amount
  const formatMoney = (amount: number) => {
      const rate = globalCurrency === 'USD' ? 1 : globalFxRate;
      return formatCurrency(amount * rate, globalCurrency);
  };

  // --- PORTFOLIO MANAGEMENT STATE ---
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
    return safeJSONParse<Portfolio[]>('portfolios', [{ id: generateId(), name: 'My First Portfolio' }]);
  });

  const [activePortfolioId, setActivePortfolioId] = useState<string>(() => {
    const saved = localStorage.getItem('activePortfolioId');
    const safePortfolios = safeJSONParse<Portfolio[]>('portfolios', []);
    if (saved && safePortfolios.some((p) => p.id === saved)) return saved;
    return safePortfolios.length > 0 ? safePortfolios[0].id : 'default';
  });

  // --- DATA STATE (Per Portfolio) - Synchronous Initialization ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const key = `transactions_${activePortfolioId}`;
    return safeJSONParse<Transaction[]>(key, []);
  });

  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const key = `prices_${activePortfolioId}`;
    return safeJSONParse<Record<string, number>>(key, {});
  });

  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const key = `targets_${activePortfolioId}`;
    return safeJSONParse<Record<string, number>>(key, {});
  });
  
  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const key = `goals_${activePortfolioId}`;
    const saved = safeJSONParse<FinancialGoal[]>(key, []);
    
    // Legacy migration check
    if (saved.length === 0) {
        const legacyKey = `financialGoal_${activePortfolioId}`;
        const savedLegacy = localStorage.getItem(legacyKey);
        if (savedLegacy) {
            const legacyAmount = parseFloat(savedLegacy);
            if (!isNaN(legacyAmount)) {
                return [{ id: generateId(), targetAmount: legacyAmount, startDate: new Date().toISOString(), isAchieved: false, notes: 'Initial Goal' }];
            }
        }
    }
    return saved.length > 0 ? saved : [{ id: generateId(), targetAmount: 100000, startDate: new Date().toISOString(), isAchieved: false, notes: 'Initial Goal' }];
  });
  
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isFirstMount = useRef(true);

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('portfolios', JSON.stringify(portfolios)); }, [portfolios]);
  useEffect(() => { localStorage.setItem('activePortfolioId', activePortfolioId); }, [activePortfolioId]);

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    setIsLoading(true);
    setIsDataLoaded(false);
    
    // Simulate loading to ensure clean state transition
    const loadData = () => {
        const txKey = `transactions_${activePortfolioId}`;
        const pricesKey = `prices_${activePortfolioId}`;
        const goalsKey = `goals_${activePortfolioId}`;
        const targetsKey = `targets_${activePortfolioId}`;
        
        setTransactions(safeJSONParse(txKey, []));
        setPrices(safeJSONParse(pricesKey, {}));
        setTargets(safeJSONParse(targetsKey, {}));
        
        const loadedGoals = safeJSONParse<FinancialGoal[]>(goalsKey, []);
        if (loadedGoals.length === 0) {
             setGoals([{ id: generateId(), targetAmount: 100000, startDate: new Date().toISOString(), isAchieved: false, notes: 'Initial Goal' }]);
        } else {
             setGoals(loadedGoals);
        }

        setIsDataLoaded(true);
        setTimeout(() => setIsLoading(false), 500);
    };
    requestAnimationFrame(loadData);
  }, [activePortfolioId]);

  useEffect(() => { if (isDataLoaded) localStorage.setItem(`transactions_${activePortfolioId}`, JSON.stringify(transactions)); }, [transactions, activePortfolioId, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem(`prices_${activePortfolioId}`, JSON.stringify(prices)); }, [prices, activePortfolioId, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem(`targets_${activePortfolioId}`, JSON.stringify(targets)); }, [targets, activePortfolioId, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) localStorage.setItem(`goals_${activePortfolioId}`, JSON.stringify(goals)); }, [goals, activePortfolioId, isDataLoaded]);

  // --- CALCULATIONS ---
  const holdings = useMemo(() => calculateHoldings(transactions, prices, targets), [transactions, prices, targets]);
  const chartData = useMemo(() => calculatePortfolioHistory(transactions, prices), [transactions, prices]);
  const investedAmount = transactions.reduce((sum, t) => {
    if (t.type === TransactionType.DEPOSIT) return sum + (t.price || 0);
    if (t.type === TransactionType.WITHDRAW) return sum - (t.price || 0);
    return sum;
  }, 0);
  const cashBalance = useMemo(() => {
    let balance = 0;
    transactions.forEach(t => {
      if (t.type === TransactionType.DEPOSIT) balance += (t.price || 0);
      if (t.type === TransactionType.WITHDRAW) balance -= (t.price || 0);
      if (t.type === TransactionType.BUY) balance -= (t.price! * t.shares!) + (t.fee || 0);
      if (t.type === TransactionType.SELL) balance += (t.price! * t.shares!) - (t.fee || 0);
      if (t.type === TransactionType.DIVIDEND) balance += (t.price || 0);
    });
    return balance;
  }, [transactions]);
  const portfolioValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalNetWorth = portfolioValue + cashBalance;
  const activeGoal = useMemo(() => goals.find(g => !g.endDate) || { targetAmount: 100000 } as FinancialGoal, [goals]);

  // --- HANDLERS ---
  const handleOpenAddModal = (initialState?: Partial<Transaction>) => { 
      setEditingTransaction(initialState || null); 
      setIsAddModalOpen(true); 
  };
  const handleOpenEditModal = (tx: Transaction) => { setEditingTransaction(tx); setIsAddModalOpen(true); };
  
  const handleSaveTransaction = (tx: Transaction) => {
    return new Promise<void>((resolve) => {
      if (editingTransaction && editingTransaction.id) {
         setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
      } else {
         setTransactions(prev => [...prev, tx]);
      }
      
      // Update price reference
      if ((tx.type === TransactionType.BUY || tx.type === TransactionType.SELL) && tx.symbol && tx.price) {
        setPrices(prev => ({...prev, [tx.symbol!]: tx.price!}));
      }

      // Update Last Used Date Persistence
      setLastTxDate(tx.date);
      localStorage.setItem('lastTxDate', tx.date);

      setIsAddModalOpen(false); 
      setEditingTransaction(null); 
      resolve();
    });
  };

  const handleUpdatePrice = (symbol: string, newPrice: number) => setPrices(prev => ({ ...prev, [symbol]: newPrice }));
  const handleUpdateTarget = (symbol: string, target: number) => setTargets(prev => ({ ...prev, [symbol]: target }));

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editingTransaction && editingTransaction.id === id) { setIsAddModalOpen(false); setEditingTransaction(null); }
  };
  const handleRequestDelete = (id: string) => {
      setConfirmConfig({ isOpen: true, title: 'Delete Transaction', message: 'Permanently remove this record?', onConfirm: () => { handleDeleteTransaction(id); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } });
  };
  const handleImportTransactions = (importedTxs: Transaction[]) => {
      setTransactions(prev => {
          const currentMap = new Map(prev.map(t => [t.id, t]));
          importedTxs.forEach(t => { currentMap.set(t.id, t); });
          return Array.from(currentMap.values());
      });
  };

  // Portfolios
  const handleCreatePortfolio = (name: string) => { const newId = generateId(); setPortfolios([...portfolios, { id: newId, name }]); setActivePortfolioId(newId); };
  const handleRenamePortfolio = (id: string, newName: string) => { setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p)); };
  const handleDeletePortfolio = (id: string) => {
    if (portfolios.length <= 1) { alert("Cannot delete last portfolio"); return; }
    setConfirmConfig({
        isOpen: true, title: 'Delete Portfolio', message: 'Delete entire portfolio and all data?', 
        onConfirm: () => {
             localStorage.removeItem(`transactions_${id}`); localStorage.removeItem(`prices_${id}`); localStorage.removeItem(`goals_${id}`); localStorage.removeItem(`targets_${id}`);
             const newPortfolios = portfolios.filter(p => p.id !== id); setPortfolios(newPortfolios);
             if (activePortfolioId === id) setActivePortfolioId(newPortfolios[0].id);
             setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  // Goals
  const handleSetNewGoal = (targetAmount: number, notes: string) => {
    const now = new Date().toISOString();
    setGoals(prev => [...prev.map(g => !g.endDate ? { ...g, endDate: now, isAchieved: totalNetWorth >= g.targetAmount } : g), { id: generateId(), targetAmount, startDate: now, isAchieved: false, notes }]);
  };
  const handleEditGoal = (updatedGoal: FinancialGoal) => setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  const handleDeleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  return (
    <Layout 
      activeTab={activeTab} setActiveTab={setActiveTab} onOpenAddModal={() => handleOpenAddModal()}
      portfolios={portfolios} activePortfolioId={activePortfolioId} onSwitchPortfolio={setActivePortfolioId}
      onCreatePortfolio={handleCreatePortfolio} onRenamePortfolio={handleRenamePortfolio} onDeletePortfolio={handleDeletePortfolio}
      currency={globalCurrency} exchangeRate={globalFxRate} onCurrencyChange={handleCurrencyChange} onExchangeRateChange={handleFxRateChange}
    >
      <div key={activePortfolioId} className="h-full">
        {activeTab === 'dashboard' && (
            <Dashboard 
                isLoading={isLoading} 
                holdings={holdings} 
                transactions={transactions} 
                financialGoal={activeGoal.targetAmount} 
                onOpenGoalModal={() => setIsGoalModalOpen(true)} 
                investedAmount={investedAmount} 
                cashBalance={cashBalance} 
                portfolioValue={portfolioValue} 
                chartData={chartData} 
                onQuickAction={(type) => handleOpenAddModal({ type })}
                formatMoney={formatMoney}
            />
        )}
        {activeTab === 'holdings' && (
            <Holdings 
                isLoading={isLoading} 
                holdings={holdings} 
                transactions={transactions} 
                cashBalance={cashBalance}
                onUpdatePrice={handleUpdatePrice} 
                onUpdateTarget={handleUpdateTarget} 
                onTrade={(symbol, type) => handleOpenAddModal({ symbol, type })}
                formatMoney={formatMoney}
            />
        )}
        {activeTab === 'history' && (
            <History 
                isLoading={isLoading} 
                transactions={transactions} 
                onDelete={handleRequestDelete} 
                onEdit={handleOpenEditModal} 
                onAdd={handleOpenAddModal} 
                onImport={handleImportTransactions}
                formatMoney={formatMoney} 
            />
        )}
        {activeTab === 'reports' && (
            <Reports 
                isLoading={isLoading} 
                transactions={transactions} 
                holdings={holdings} 
                currentPortfolioValue={portfolioValue + cashBalance} 
                chartData={chartData} 
                formatMoney={formatMoney}
            />
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90dvh]">
            <AddTransactionForm 
              onClose={() => setIsAddModalOpen(false)} 
              onSave={handleSaveTransaction} 
              onDelete={handleRequestDelete} 
              cashBalance={cashBalance} 
              holdings={holdings} 
              prices={prices} 
              transactions={transactions} 
              initialData={editingTransaction as Transaction | null}
              defaultDate={lastTxDate}
            />
          </div>
        </div>
      )}

      <GoalModal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)} 
        goals={goals} 
        currentNetWorth={totalNetWorth} 
        onSetGoal={handleSetNewGoal} 
        onEditGoal={handleEditGoal} 
        onDeleteGoal={handleDeleteGoal}
        formatMoney={formatMoney}
      />

      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in p-6 text-center">
              <Trash2 size={40} className="mx-auto text-rose-500 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmConfig.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{confirmConfig.message}</p>
              <div className="flex space-x-3">
                <button onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Cancel</button>
                <button onClick={confirmConfig.onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-rose-600 text-white shadow-lg shadow-rose-600/20">Delete</button>
              </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

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

const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onClose, onSave, onDelete, cashBalance, holdings, prices, transactions, initialData, defaultDate }) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(defaultDate);
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(''); // Price per share
  const [totalAmount, setTotalAmount] = useState(''); // Total transaction value
  const [fee, setFee] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>(AssetClass.STOCK);
  const [exchangeRate, setExchangeRate] = useState(''); 
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Validation logic helpers
  const needsSymbol = [TransactionType.BUY, TransactionType.SELL, TransactionType.DIVIDEND, TransactionType.SPLIT].includes(type);
  const needsShares = [TransactionType.BUY, TransactionType.SELL, TransactionType.SPLIT].includes(type);
  const needsPrice = type !== TransactionType.SPLIT;
  
  // FX Rate is relevant for: Deposits, Withdrawals, and Dividends (Foreign income)
  const hasExchangeRate = type === TransactionType.DEPOSIT || type === TransactionType.WITHDRAW || type === TransactionType.DIVIDEND;
  const isFunding = type === TransactionType.DEPOSIT || type === TransactionType.WITHDRAW;

  // Effects (Initialization, Auto-fill, Calculation)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowSuggestions(false); };
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Auto-fill price from holdings or market data when symbol changes (and no data set yet)
  useEffect(() => {
    if (!initialData && symbol && !price && !totalAmount) {
       const h = holdings.find(h => h.symbol === symbol.toUpperCase());
       if (h) { setAssetClass(h.assetClass); if (h.currentPrice > 0) setPrice(h.currentPrice.toString()); }
       else { const kp = prices[symbol.toUpperCase()]; if (kp) setPrice(kp.toString()); }
    }
  }, [symbol]);

  // --- Real-time Calculation Handlers ---
  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setShares(val);
    const s = parseFloat(val);
    const p = parseFloat(price);
    if (!isNaN(s) && !isNaN(p)) {
        setTotalAmount((s * p).toFixed(2));
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrice(val);
    const p = parseFloat(val);
    const s = parseFloat(shares);
    // If we have shares, calc total
    if (!isNaN(p) && !isNaN(s)) {
        setTotalAmount((s * p).toFixed(2));
    } 
    // If we have total but no shares, calc shares? (Inverse flow)
    else if (!isNaN(p) && totalAmount && !shares) {
        const t = parseFloat(totalAmount);
        if (!isNaN(t) && p !== 0) setShares((t/p).toFixed(4));
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTotalAmount(val);
    const t = parseFloat(val);
    const p = parseFloat(price);
    // Standard: Total / Price = Shares
    if (!isNaN(t) && !isNaN(p) && p !== 0) {
        setShares((t / p).toFixed(4));
    }
  };

  // --- Auto-complete Logic ---
  const allSymbols = useMemo(() => {
    const fromHoldings = holdings.map(h => h.symbol);
    const fromHistory = transactions.map(t => t.symbol).filter(s => s) as string[];
    // Unique combined list
    return Array.from(new Set([...fromHoldings, ...fromHistory, ...POPULAR_SYMBOLS])).sort();
  }, [holdings, transactions]);

  const suggestions = useMemo(() => {
    if (!symbol) return [];
    const inputUpper = symbol.toUpperCase();
    return allSymbols.filter(s => s.includes(inputUpper)).slice(0, 6);
  }, [symbol, allSymbols]);

  // Max Button Handlers
  const handleMax = () => {
    const p = parseFloat(price);
    if (type === TransactionType.BUY) {
        if (p > 0) {
            const maxAmt = Math.max(0, cashBalance);
            setTotalAmount(maxAmt.toFixed(2));
            setShares((maxAmt / p).toFixed(4));
        } else {
            setTotalAmount(cashBalance.toFixed(2));
        }
    } else if (type === TransactionType.SELL) {
        const holding = holdings.find(h => h.symbol === symbol.toUpperCase());
        if (holding) {
            setShares(holding.shares.toString());
            if (p > 0) setTotalAmount((holding.shares * p).toFixed(2));
        }
    }
  };

  // IMPACT CALCULATIONS FOR SUMMARY
  const currentCashImpact = useMemo(() => {
     const qty = parseFloat(shares) || 0;
     const unitPrice = parseFloat(price) || 0;
     const feeVal = parseFloat(fee) || 0;
     const amt = parseFloat(totalAmount) || 0;

     if (type === TransactionType.BUY) return -((qty * unitPrice) + feeVal);
     if (type === TransactionType.SELL) return ((qty * unitPrice) - feeVal);
     if (type === TransactionType.DEPOSIT) return amt;
     if (type === TransactionType.WITHDRAW) return -amt;
     if (type === TransactionType.DIVIDEND) return amt;
     return 0;
  }, [type, shares, price, fee, totalAmount]);

  const originalCashImpact = useMemo(() => {
    if (!initialData) return 0;
    const qty = initialData.shares || 0;
    const unitPrice = initialData.price || 0;
    const feeVal = initialData.fee || 0;
    
    if (initialData.type === TransactionType.BUY) return -((qty * unitPrice) + feeVal);
    if (initialData.type === TransactionType.SELL) return ((qty * unitPrice) - feeVal);
    if (initialData.type === TransactionType.DEPOSIT) return unitPrice; 
    if (initialData.type === TransactionType.WITHDRAW) return -unitPrice;
    if (initialData.type === TransactionType.DIVIDEND) return unitPrice;
    return 0;
  }, [initialData]);

  const projectedCashBalance = cashBalance - originalCashImpact + currentCashImpact;
  const totalNetWorth = useMemo(() => {
     const invested = holdings.reduce((sum, h) => sum + h.marketValue, 0);
     return invested + cashBalance;
  }, [holdings, cashBalance]);
  
  const feePercentage = useMemo(() => {
     const feeVal = parseFloat(fee) || 0;
     const totalVal = parseFloat(totalAmount) || 0;
     if (feeVal > 0 && totalVal > 0) {
        return (feeVal / totalVal) * 100;
     }
     return 0;
  }, [fee, totalAmount]);

  // Validation
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
    if ((type === TransactionType.WITHDRAW || type === TransactionType.BUY) && projectedCashBalance < 0) {
        return "Insufficient funds. Transaction exceeds cash balance.";
    }
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
      // For types that don't need shares (Deposit, Withdraw, Dividend), use the total amount as price
      price: type === TransactionType.SPLIT ? 0 : (needsShares ? parseFloat(price) : parseFloat(totalAmount)),
      fee: (fee && (type === TransactionType.BUY || type === TransactionType.SELL)) ? parseFloat(fee) : undefined,
      assetClass: !needsSymbol ? AssetClass.CASH : assetClass,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1, notes: notes || undefined
    });
    setIsSaving(false);
  };

  const getTypeConfig = (t: TransactionType) => {
    switch (t) {
        case TransactionType.BUY: return { color: 'emerald', label: 'Buy Asset', icon: <TrendingUp size={18} /> }; // Green
        case TransactionType.DEPOSIT: return { color: 'blue', label: 'Deposit Cash', icon: <Wallet size={18} /> }; // Blue
        case TransactionType.SELL: return { color: 'rose', label: 'Sell Asset', icon: <TrendingDown size={18} /> }; // Red
        case TransactionType.WITHDRAW: return { color: 'orange', label: 'Withdraw', icon: <Banknote size={18} /> }; // Orange
        case TransactionType.DIVIDEND: return { color: 'teal', label: 'Dividend', icon: <Coins size={18} /> }; // Teal
        case TransactionType.SPLIT: return { color: 'purple', label: 'Stock Split', icon: <Split size={18} /> }; // Purple
        default: return { color: 'slate', label: t, icon: <CheckCircle2 size={18} /> };
    }
  }
  const theme = getTypeConfig(type);

  // SUMMARY BAR
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
                    <h3 className={`text-2xl font-bold font-display ${impactTextColor}`}>
                        {isPositiveFlow ? '+' : '-'}{formatCurrency(absImpact)}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center">
                        <Percent size={10} className="mr-1"/>
                        ≈ {portfolioPercent.toFixed(1)}% of Total Portfolio
                    </p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projected Cash</p>
                    <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">{formatCurrency(projectedCashBalance)}</p>
                 </div>
             </div>
             
             {/* Progress Bar */}
             <div className="relative h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div className="absolute top-0 left-0 h-full bg-slate-400 dark:bg-slate-500 transition-all" style={{ width: '100%' }}></div>
                 {projectedCashBalance < cashBalance && (
                    <div className={`absolute top-0 right-0 h-full ${impactColor} transition-all animate-pulse`} style={{ width: `${((cashBalance - projectedCashBalance)/cashBalance)*100}%` }}></div>
                 )}
                 {projectedCashBalance > cashBalance && (
                     <div className={`absolute top-0 left-0 h-full ${impactColor} transition-all`} style={{ width: '100%' }}></div>
                 )}
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

  // RENDER: REVIEW STEP
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
                 {/* Details Card */}
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Date</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{date}</span>
                     </div>
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Type</span>
                        <span className={`text-sm font-bold uppercase text-${theme.color}-600`}>{theme.label}</span>
                     </div>
                     {needsSymbol && (
                         <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                            <span className="text-sm text-slate-500">Asset</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{symbol} <span className="text-xs text-slate-400 font-normal">({assetClass})</span></span>
                         </div>
                     )}
                     <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                        <span className="text-sm text-slate-500">Total Amount</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(parseFloat(totalAmount))}</span>
                     </div>
                     {needsShares && (
                        <div className="flex justify-between pt-1">
                            <span className="text-xs text-slate-400">Details</span>
                            <span className="text-xs text-slate-500">{shares} units @ {formatCurrency(parseFloat(price))}</span>
                        </div>
                     )}
                 </div>

                 {projectedCashBalance < 0 && (
                     <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold flex items-center">
                         <AlertCircle size={20} className="mr-3 shrink-0" />
                         WARNING: This transaction will result in a negative cash balance.
                     </div>
                 )}
                 
                 <div className="text-xs text-center text-slate-400 italic">
                    Note: Transactions are stored in the base currency (USD).
                 </div>
             </div>

             <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                 <button onClick={() => setStep('input')} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Back to Edit
                 </button>
                 <button onClick={handleFinalSubmit} disabled={isSaving} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-xl flex items-center justify-center space-x-2 bg-${theme.color}-600 hover:bg-${theme.color}-700 transition-all`}>
                    {isSaving ? <Spinner className="text-white" /> : (
                        <>
                            <CheckCircle2 size={18} />
                            <span>Confirm & Save</span>
                        </>
                    )}
                 </button>
             </div>
          </div>
      )
  }

  // RENDER: INPUT STEP
  return (
    <>
      <div className="shrink-0 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">{initialData?.id ? 'Edit Transaction' : 'New Transaction'}</h3>
          <button onClick={onClose} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><X size={20} /></button>
      </div>
      
      <form onSubmit={handleReview} className="flex-1 overflow-y-auto min-h-0 p-6 custom-scrollbar bg-white dark:bg-slate-900">
        
        {/* 1. Transaction Type Selector (Large Cards) */}
        <div className="mb-8">
           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">What would you like to do?</label>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[TransactionType.BUY, TransactionType.DEPOSIT, TransactionType.SELL, TransactionType.WITHDRAW, TransactionType.DIVIDEND, TransactionType.SPLIT].map(t => {
                 const isActive = type === t;
                 const config = getTypeConfig(t);
                 return (
                   <button
                      key={t} type="button" onClick={() => setType(t)}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                         isActive 
                         ? `border-${config.color}-500 bg-${config.color}-50 dark:bg-${config.color}-900/20 text-${config.color}-700 dark:text-${config.color}-400 ring-1 ring-${config.color}-500` 
                         : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                   >
                      <div className={`p-2 rounded-lg ${isActive ? `bg-${config.color}-200 dark:bg-${config.color}-900/50` : 'bg-slate-100 dark:bg-slate-700'}`}>
                        {config.icon}
                      </div>
                      <span className="text-xs sm:text-sm font-bold">{config.label}</span>
                   </button>
                 )
              })}
           </div>
        </div>

        {/* 2. Date Input (Full Width) */}
        <div className="mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">When did this happen?</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer" />
            </div>
        </div>

        {/* 3. Dynamic Inputs Based on Type */}
        <div className="grid md:grid-cols-2 gap-8">
            
            {/* LEFT COLUMN: ASSET INFO */}
            {needsSymbol ? (
                <div className="space-y-5">
                    <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <FileText size={18} />
                        <h4 className="font-bold text-sm uppercase tracking-wide">Asset Details</h4>
                    </div>

                    <div className="relative z-20" ref={wrapperRef}>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Asset Symbol</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input 
                               type="text" placeholder="e.g. AAPL, BTC" value={symbol} 
                               onChange={e => { setSymbol(e.target.value); setShowSuggestions(true); }}
                               onFocus={() => setShowSuggestions(true)}
                               className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold uppercase tracking-wide focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                            />
                             {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400">Suggestions</div>
                                    {suggestions.map(s => (
                                        <div key={s} onMouseDown={(e) => { e.preventDefault(); setSymbol(s); setShowSuggestions(false); }} className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-0 group">
                                           <span>{s}</span>
                                           <span className="text-xs text-blue-500 font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                              Use <ArrowRightCircle size={12} className="ml-1"/>
                                           </span>
                                        </div>
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
                <div className="hidden md:block">
                    {/* Spacer for non-asset transactions to balance layout */}
                    <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        <Wallet size={100} strokeWidth={1} />
                    </div>
                </div>
            )}

            {/* RIGHT COLUMN: FINANCIALS */}
            <div className="space-y-5">
                <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <DollarSign size={18} />
                    <h4 className="font-bold text-sm uppercase tracking-wide">Financials (Base Currency)</h4>
                </div>

                {/* Amount / Price Fields */}
                {(needsPrice || isFunding) && (
                   <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                           <span>{needsShares ? 'Total Amount' : 'Amount'}</span>
                           {type === TransactionType.BUY && (
                               <button type="button" onClick={handleMax} className="text-blue-500 hover:underline text-[10px] font-bold">Max Cash</button>
                           )}
                       </label>
                       <div className="relative group">
                           <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold ${type === TransactionType.SELL || type === TransactionType.WITHDRAW ? 'text-rose-500' : 'text-emerald-500'}`}>$</span>
                           <input 
                              type="number" step="any" min="0" placeholder="0.00"
                              value={totalAmount}
                              onChange={handleTotalChange}
                              className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-2xl font-display font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                           />
                       </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                     {needsShares && (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Quantity</span>
                                {type === TransactionType.SELL && (
                                   <button type="button" onClick={handleMax} className="text-rose-500 hover:underline text-[10px] font-bold">All</button>
                                )}
                            </label>
                            <input 
                                type="number" step="any" 
                                placeholder="0" 
                                value={shares}
                                onChange={handleSharesChange}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                     )}

                     {needsPrice && needsShares && (
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Price / Share</label>
                           <input 
                                type="number" step="any" placeholder="0.00" value={price}
                                onChange={handlePriceChange}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                     )}
                 </div>
                 
                 {(type === TransactionType.BUY || type === TransactionType.SELL) && (
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Transaction Fee</label>
                        <input 
                             type="number" step="any" placeholder="0.00" value={fee} onChange={e => setFee(e.target.value)} 
                             className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                        />
                        {feePercentage > 0 && (
                           <div className="text-[10px] text-slate-400 mt-1 flex items-center">
                              <Info size={10} className="mr-1" />
                              ≈ {feePercentage.toFixed(2)}% of total amount
                           </div>
                        )}
                    </div>
                 )}
                 
                 {hasExchangeRate && (
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Exchange Rate (Optional)</label>
                       <input 
                         type="number" step="any" min="0" placeholder="1.0" 
                         value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} 
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                       />
                    </div>
                 )}
            </div>
        </div>
        
        {/* SUMMARY SECTION */}
        {summaryBox}

        {/* Notes Collapsible */}
        <details className="group mt-4" open={!!notes}>
            <summary className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-500 transition-colors w-fit">
               <span className="mr-2">Add Notes</span>
               <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-2 animate-slide-up">
                 <textarea 
                   ref={notesRef}
                   rows={2} 
                   placeholder="E.g. Monthly DCA, Rebalancing..." 
                   value={notes} 
                   onChange={handleNoteChange} 
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none transition-all focus:border-blue-400 overflow-hidden min-h-[50px]" 
                 />
            </div>
        </details>

      </form>
      
      {/* 6. FOOTER ACTIONS */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex gap-3">
             {error && (
                <div className="absolute bottom-full left-0 w-full px-6 pb-2">
                    <div className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center animate-slide-up shadow-sm border border-rose-100">
                        <AlertCircle size={16} className="mr-2" /> {error}
                    </div>
                </div>
             )}
             
             {initialData?.id && onDelete && (
                 <button type="button" onClick={() => onDelete(initialData!.id)} className="p-3 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 transition-colors"><Trash2 size={20} /></button>
             )}
             <button 
                onClick={handleReview}
                title="Double check your details before saving"
                className={`flex-1 py-3 rounded-xl font-bold text-base text-white shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 bg-${theme.color}-600 hover:bg-${theme.color}-700 shadow-${theme.color}-500/30`}
             >
                <span>Review & Save</span>
                <ArrowRight size={18} />
             </button>
      </div>
    </>
  );
};

export default App;
