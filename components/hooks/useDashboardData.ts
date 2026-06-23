import { useMemo } from 'react';
import { Holding, Transaction, ChartDataPoint, TransactionType } from '../../types';
import { calculateMonthlyReturns, calculateWinRate, calculateCAGR } from '../../utils';

interface UseDashboardDataProps {
  holdings: Holding[];
  transactions: Transaction[];
  investedAmount: number;
  cashBalance: number;
  portfolioValue: number;
  chartData: ChartDataPoint[];
  timeRange: '1M' | '6M' | '1Y' | 'ALL';
  selectedCategory: string | null;
}

export function useDashboardData({
  holdings,
  transactions,
  investedAmount,
  cashBalance,
  portfolioValue,
  chartData,
  timeRange,
  selectedCategory
}: UseDashboardDataProps) {
  const totalNetWorth = portfolioValue + cashBalance;
  const totalUnrealizedPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);
  const totalPLPercent = investedAmount > 0 ? (totalUnrealizedPL / investedAmount) * 100 : 0;

  // 1. Filtered Chart Data
  const filteredChartData = useMemo(() => {
    if (timeRange === 'ALL') return chartData;
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
    if (timeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
    if (timeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
    
    return chartData.filter(pt => {
      if (pt.date === 'Now') return true;
      return new Date(pt.date) >= cutoff;
    });
  }, [chartData, timeRange]);

  // 2. Allocation Data
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
    return data.sort((a: any, b: any) => b.value - a.value);
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
  const activeTotalValue = activeChartData.reduce((sum: number, item: any) => sum + item.value, 0);

  // 3. Winners & Losers
  const { winners, losers, bestAsset } = useMemo(() => {
    const active = [...holdings].filter(h => h.marketValue > 0);
    const sorted = active.sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent);
    const best = sorted.length > 0 && sorted[0].unrealizedPLPercent > 0 ? sorted[0] : null;
    
    return {
      winners: sorted.filter(h => h.unrealizedPL >= 0).slice(0, 3),
      losers: [...sorted].reverse().filter(h => h.unrealizedPL < 0).slice(0, 3),
      bestAsset: best
    };
  }, [holdings]);

  // 4. Advanced KPIs
  const kpiData = useMemo(() => {
    const monthlyReturns = calculateMonthlyReturns(chartData);
    
    // CAGR
    let cagr = 0;
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDate = new Date(sorted[0].date);
      const years = (new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (years >= 1 && investedAmount > 0) {
        cagr = calculateCAGR(investedAmount, totalNetWorth, years);
      } else {
        cagr = totalPLPercent; // Fallback for < 1 year
      }
    }

    // Dividend Yield
    const totalDivs = transactions.filter(t => t.type === TransactionType.DIVIDEND).reduce((sum, t) => sum + (t.price || 0), 0);
    const yieldPct = investedAmount > 0 ? (totalDivs / investedAmount) * 100 : 0;

    // Win Rate
    const winRate = calculateWinRate(monthlyReturns);

    // Last 6 Months PnL
    const last6Months = monthlyReturns.slice(-6);

    return { cagr, yieldPct, winRate, last6Months };
  }, [chartData, transactions, investedAmount, totalNetWorth, totalPLPercent]);

  // 5. Recent Activity
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [transactions]);

  return {
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
  };
}
