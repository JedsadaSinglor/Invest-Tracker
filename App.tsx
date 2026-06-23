
import React, { useState, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Holdings from './components/Holdings';
import Reports from './components/Reports';
import History from './components/History';
import GoalModal from './components/GoalModal';
import AddTransactionForm from './components/AddTransactionForm';
import { Transaction, TransactionType, Portfolio, FinancialGoal } from './types';
import { calculateHoldings, calculatePortfolioHistory, generateId, formatCurrency, safeJSONParse } from './utils';
import { Trash2 } from 'lucide-react';
import { useLocalStorage, usePortfolioData } from './lib/hooks';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);
  
  const [lastTxDate, setLastTxDate] = useLocalStorage<string>('lastTxDate', new Date().toISOString().split('T')[0]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({
    isOpen: false, title: '', message: '', onConfirm: () => {},
  });

  const [globalCurrency, setGlobalCurrency] = useLocalStorage<string>('globalCurrency', 'USD');
  const [globalFxRate, setGlobalFxRate] = useLocalStorage<number>('globalFxRate', 34.0);

  const handleCurrencyChange = (curr: string) => setGlobalCurrency(curr);
  const handleFxRateChange = (rate: number) => setGlobalFxRate(rate);
  
  const formatMoney = (amount: number) => {
      const rate = globalCurrency === 'USD' ? 1 : globalFxRate;
      return formatCurrency(amount * rate, globalCurrency);
  };

  const [portfolios, setPortfolios] = useLocalStorage<Portfolio[]>('portfolios', [{ id: generateId(), name: 'My First Portfolio' }]);
  
  const [activePortfolioId, setActivePortfolioId] = useLocalStorage<string>('activePortfolioId', () => {
    const safePortfolios = safeJSONParse<Portfolio[]>('portfolios', []);
    return safePortfolios.length > 0 ? safePortfolios[0].id : 'default';
  });

  const {
    transactions, setTransactions,
    prices, setPrices,
    targets, setTargets,
    goals, setGoals,
    isLoading
  } = usePortfolioData(activePortfolioId);

  const holdings = useMemo(() => calculateHoldings(transactions, prices, targets), [transactions, prices, targets]);
  const chartData = useMemo(() => calculatePortfolioHistory(transactions, prices), [transactions, prices]);
  const investedAmount = useMemo(() => transactions.reduce((sum, t) => {
    if (t.type === TransactionType.DEPOSIT) return sum + (t.price || 0);
    if (t.type === TransactionType.WITHDRAW) return sum - (t.price || 0);
    return sum;
  }, 0), [transactions]);
  
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

  const handleOpenAddModal = (initialState?: Partial<Transaction>) => { setEditingTransaction(initialState || null); setIsAddModalOpen(true); };
  const handleOpenEditModal = (tx: Transaction) => { setEditingTransaction(tx); setIsAddModalOpen(true); };
  
  const handleSaveTransaction = (tx: Transaction) => {
    return new Promise<void>((resolve) => {
      if (editingTransaction && editingTransaction.id) { setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t)); } 
      else { setTransactions(prev => [...prev, tx]); }
      if ((tx.type === TransactionType.BUY || tx.type === TransactionType.SELL) && tx.symbol && tx.price) { setPrices(prev => ({...prev, [tx.symbol!]: tx.price!})); }
      setLastTxDate(tx.date);
      setIsAddModalOpen(false); setEditingTransaction(null); resolve();
    });
  };

  const handleUpdatePrice = (symbol: string, newPrice: number) => setPrices(prev => ({ ...prev, [symbol]: newPrice }));
  const handleUpdateTarget = (symbol: string, target: number) => setTargets(prev => ({ ...prev, [symbol]: target }));
  const handleDeleteTransaction = (id: string) => { setTransactions(prev => prev.filter(t => t.id !== id)); if (editingTransaction && editingTransaction.id === id) { setIsAddModalOpen(false); setEditingTransaction(null); } };
  const handleRequestDelete = (id: string) => { setConfirmConfig({ isOpen: true, title: 'Delete Transaction', message: 'Permanently remove this record?', onConfirm: () => { handleDeleteTransaction(id); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } }); };
  const handleImportTransactions = (importedTxs: Transaction[]) => { setTransactions(prev => { const currentMap = new Map(prev.map(t => [t.id, t])); importedTxs.forEach(t => { currentMap.set(t.id, t); }); return Array.from(currentMap.values()); }); };

  const handleCreatePortfolio = (name: string) => { const newId = generateId(); setPortfolios([...portfolios, { id: newId, name }]); setActivePortfolioId(newId); };
  const handleRenamePortfolio = (id: string, newName: string) => { setPortfolios(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p)); };
  const handleDeletePortfolio = (id: string) => {
    if (portfolios.length <= 1) { alert("Cannot delete last portfolio"); return; }
    setConfirmConfig({ isOpen: true, title: 'Delete Portfolio', message: 'Delete entire portfolio and all data?', onConfirm: () => {
             localStorage.removeItem(`transactions_${id}`); localStorage.removeItem(`prices_${id}`); localStorage.removeItem(`goals_${id}`); localStorage.removeItem(`targets_${id}`);
             const newPortfolios = portfolios.filter(p => p.id !== id); setPortfolios(newPortfolios);
             if (activePortfolioId === id) setActivePortfolioId(newPortfolios[0].id);
             setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }});
  };

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
                isLoading={isLoading} holdings={holdings} transactions={transactions} financialGoal={activeGoal.targetAmount} onOpenGoalModal={() => setIsGoalModalOpen(true)} 
                investedAmount={investedAmount} cashBalance={cashBalance} portfolioValue={portfolioValue} chartData={chartData} 
                onQuickAction={(type) => handleOpenAddModal({ type })} formatMoney={formatMoney}
            />
        )}
        {activeTab === 'holdings' && (
            <Holdings 
                isLoading={isLoading} holdings={holdings} transactions={transactions} cashBalance={cashBalance} onUpdatePrice={handleUpdatePrice} 
                onUpdateTarget={handleUpdateTarget} onTrade={(symbol, type) => handleOpenAddModal({ symbol, type })} formatMoney={formatMoney}
            />
        )}
        {activeTab === 'history' && (
            <History 
                isLoading={isLoading} transactions={transactions} onDelete={handleRequestDelete} onEdit={handleOpenEditModal} 
                onAdd={handleOpenAddModal} onImport={handleImportTransactions} formatMoney={formatMoney} 
            />
        )}
        {activeTab === 'reports' && (
            <Reports 
                isLoading={isLoading} transactions={transactions} holdings={holdings} currentPortfolioValue={portfolioValue + cashBalance} 
                chartData={chartData} formatMoney={formatMoney}
            />
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90dvh]">
            <AddTransactionForm 
              onClose={() => setIsAddModalOpen(false)} onSave={handleSaveTransaction} onDelete={handleRequestDelete} 
              cashBalance={cashBalance} holdings={holdings} prices={prices} transactions={transactions} 
              initialData={editingTransaction as Transaction | null} defaultDate={lastTxDate}
            />
          </div>
        </div>
      )}

      <GoalModal 
        isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} goals={goals} currentNetWorth={totalNetWorth} 
        onSetGoal={handleSetNewGoal} onEditGoal={handleEditGoal} onDeleteGoal={handleDeleteGoal} formatMoney={formatMoney}
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

export default App;
