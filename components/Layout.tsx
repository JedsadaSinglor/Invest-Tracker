
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, PieChart, History, FileText, Sun, Moon, Plus, TrendingUp, ChevronDown, Trash2, Briefcase, Check, Edit2, Coins, Calculator } from 'lucide-react';
import { Portfolio } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: () => void;
  // Portfolio Props
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSwitchPortfolio: (id: string) => void;
  onCreatePortfolio: (name: string) => void;
  onRenamePortfolio: (id: string, newName: string) => void;
  onDeletePortfolio: (id: string) => void;
  // Currency Props
  currency: string;
  exchangeRate: number;
  onCurrencyChange: (currency: string) => void;
  onExchangeRateChange: (rate: number) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'THB', symbol: '฿', label: 'Thai Baht' },
];

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, setActiveTab, onOpenAddModal,
  portfolios, activePortfolioId, onSwitchPortfolio, onCreatePortfolio, onRenamePortfolio, onDeletePortfolio,
  currency, exchangeRate, onCurrencyChange, onExchangeRateChange
}) => {
  const [darkMode, setDarkMode] = useState(false);
  
  // Dropdown States
  const [isPortfolioDropdownOpen, setIsPortfolioDropdownOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [portfolioToRename, setPortfolioToRename] = useState<Portfolio | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check local storage or system preference
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPortfolioDropdownOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'holdings', label: 'Holdings', icon: <PieChart size={20} /> },
    { id: 'history', label: 'History', icon: <History size={20} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={20} /> },
  ];

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  const handleCreateClick = () => {
    setNewPortfolioName('');
    setIsCreateModalOpen(true);
    setIsPortfolioDropdownOpen(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPortfolioName.trim()) {
      onCreatePortfolio(newPortfolioName.trim());
      setIsCreateModalOpen(false);
    }
  };

  const handleRenameClick = (e: React.MouseEvent, p: Portfolio) => {
    e.stopPropagation();
    setPortfolioToRename(p);
    setRenameValue(p.name);
    setIsRenameModalOpen(true);
    setIsPortfolioDropdownOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (portfolioToRename && renameValue.trim()) {
      onRenamePortfolio(portfolioToRename.id, renameValue.trim());
      setIsRenameModalOpen(false);
      setPortfolioToRename(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1120] transition-colors duration-300 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Left: Branding & Portfolio Switcher */}
            <div className="flex items-center gap-4 md:gap-8">
              {/* Logo */}
              <div className="flex items-center gap-2.5 shrink-0 group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <TrendingUp className="text-white" size={20} strokeWidth={2.5} />
                </div>
                <span className="hidden md:block text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight">My Portfolio</span>
              </div>

              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                      activeTab === item.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Currency Switcher */}
              <div className="relative" ref={currencyDropdownRef}>
                 <button 
                   onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                   className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                 >
                    <Coins size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{currency}</span>
                 </button>

                 {isCurrencyDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                       <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Display Currency</p>
                          <div className="grid grid-cols-2 gap-2">
                             {CURRENCIES.map(c => (
                                <button 
                                   key={c.code}
                                   onClick={() => { onCurrencyChange(c.code); if(c.code === 'USD') onExchangeRateChange(1); }}
                                   className={`px-3 py-2 rounded-lg text-xs font-bold text-center transition-colors border ${
                                      currency === c.code 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
                                      : 'bg-white border-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                   }`}
                                >
                                   {c.code} ({c.symbol})
                                </button>
                             ))}
                          </div>
                       </div>
                       
                       {currency === 'THB' && (
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/50">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Exchange Rate (1 USD =)</label>
                             <div className="relative">
                                <Calculator size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                   type="number"
                                   step="0.01"
                                   value={exchangeRate}
                                   onChange={(e) => onExchangeRateChange(parseFloat(e.target.value) || 0)}
                                   className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">THB</span>
                             </div>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* Portfolio Switcher */}
              <div className="relative" ref={dropdownRef}>
                 <button 
                   onClick={() => setIsPortfolioDropdownOpen(!isPortfolioDropdownOpen)}
                   className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                 >
                    <Briefcase size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">{activePortfolio?.name}</span>
                    <ChevronDown size={14} className="text-slate-400" />
                 </button>

                  {isPortfolioDropdownOpen && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Switch Portfolio</p>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                              {portfolios.map(p => (
                                <div key={p.id} className="flex items-center group/item">
                                  <button
                                    onClick={() => {
                                      onSwitchPortfolio(p.id);
                                      setIsPortfolioDropdownOpen(false);
                                    }}
                                    className={`flex-1 text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between ${
                                      activePortfolioId === p.id 
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <span className="truncate">{p.name}</span>
                                    {activePortfolioId === p.id && <Check size={14} />}
                                  </button>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity pl-1">
                                      <button 
                                          onClick={(e) => handleRenameClick(e, p)}
                                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                          title="Rename"
                                      >
                                          <Edit2 size={14} />
                                      </button>
                                      {portfolios.length > 1 && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); onDeletePortfolio(p.id); }}
                                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                          title="Delete"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                  </div>
                                </div>
                              ))}
                          </div>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/50">
                          <button 
                            onClick={handleCreateClick}
                            className="w-full flex items-center justify-center space-x-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 py-2.5 rounded-xl transition-all shadow-sm"
                          >
                            <Plus size={16} strokeWidth={3} />
                            <span>Create New Portfolio</span>
                          </button>
                      </div>
                    </div>
                  )}
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Main Add Button (Desktop) */}
              <button
                onClick={() => onOpenAddModal()}
                className="hidden md:flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl transition-all active:scale-95"
              >
                <Plus size={20} strokeWidth={3} />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CREATE PORTFOLIO MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in border border-slate-200 dark:border-slate-700">
             <div className="p-6">
               <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  <Briefcase size={24} />
               </div>
               <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-2">Create Portfolio</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Give your new portfolio a name to get started.</p>
               
               <form onSubmit={handleCreateSubmit}>
                 <div className="mb-4">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                   <input 
                     type="text" 
                     autoFocus
                     placeholder="e.g. Retirement Fund"
                     value={newPortfolioName}
                     onChange={(e) => setNewPortfolioName(e.target.value)}
                     className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                   />
                 </div>
                 
                 <div className="flex space-x-3">
                   <button 
                     type="button"
                     onClick={() => setIsCreateModalOpen(false)}
                     className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={!newPortfolioName.trim()}
                     className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
                   >
                     <Check size={18} />
                     <span>Create</span>
                   </button>
                 </div>
               </form>
             </div>
          </div>
        </div>
      )}

      {/* RENAME PORTFOLIO MODAL */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsRenameModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in border border-slate-200 dark:border-slate-700">
             <div className="p-6">
               <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-4">Rename Portfolio</h3>
               <form onSubmit={handleRenameSubmit}>
                 <div className="mb-6">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                   <input 
                     type="text" 
                     autoFocus
                     value={renameValue}
                     onChange={(e) => setRenameValue(e.target.value)}
                     className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                   />
                 </div>
                 
                 <div className="flex space-x-3">
                   <button 
                     type="button"
                     onClick={() => setIsRenameModalOpen(false)}
                     className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={!renameValue.trim()}
                     className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                   >
                     <Check size={18} />
                     <span>Save</span>
                   </button>
                 </div>
               </form>
             </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 animate-fade-in mb-20 md:mb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation & FAB */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-40">
         {/* Floating Action Button (FAB) */}
         <div className="absolute bottom-20 right-4 pointer-events-none">
            <button
                onClick={() => onOpenAddModal()}
                className="pointer-events-auto w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/30 flex items-center justify-center active:scale-95 transition-transform"
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>
         </div>

         {/* Bottom Nav Bar */}
         <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe pt-1 px-4 flex justify-between items-center h-[70px]">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 translate-y-[-2px]' : ''}`}>
                            {item.icon}
                        </div>
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                )
            })}
         </div>
      </div>
    </div>
  );
};

export default Layout;
