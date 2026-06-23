import React, { useState } from 'react';
import { Transaction, Holding, ChartDataPoint } from '../types';
import { formatMoney } from '../lib/formatting';
import { BarChart3, Calendar, TrendingUp, DollarSign, Landmark } from 'lucide-react';
import { MonthlyActivityView } from './reports/MonthlyActivityView';
import { DividendsView } from './reports/DividendsView';
import { FundingView } from './reports/FundingView';
import { GrowthView } from './reports/GrowthView';
import { ReportsSkeleton } from './LoadingSkeletons';

interface ReportsProps {
    transactions: Transaction[];
    holdings: Holding[];
    currentPortfolioValue: number;
    chartData: ChartDataPoint[];
    isLoading?: boolean;
    formatMoney: (amount: number) => string;
}

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

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'monthly' && <MonthlyActivityView transactions={transactions} formatMoney={formatMoney} />}
                {activeTab === 'dividends' && <DividendsView transactions={transactions} formatMoney={formatMoney} />}
                {activeTab === 'funding' && <FundingView transactions={transactions} currentPortfolioValue={currentPortfolioValue} formatMoney={formatMoney} />}
                {activeTab === 'growth' && <GrowthView transactions={transactions} holdings={holdings} currentPortfolioValue={currentPortfolioValue} chartData={chartData} formatMoney={formatMoney} />}
            </div>
        </div>
    );
};

export default Reports;
