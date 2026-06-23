
import { Transaction, TransactionType, Holding, AssetClass, ChartDataPoint, MonthlyReturnData, MonthlyActivity } from '../types';

// Newton-Raphson approximation for XIRR
export const calculateIRR = (cashFlows: { amount: number; date: Date }[]): number | null => {
  if (cashFlows.length < 2) return null;
  const chronFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const startDate = chronFlows[0].date;
  
  // Need at least one positive and one negative cash flow
  const hasPos = chronFlows.some(f => f.amount > 0);
  const hasNeg = chronFlows.some(f => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const func = (rate: number) => {
    return chronFlows.reduce((sum, flow) => {
      const days = (flow.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + flow.amount / Math.pow(1 + rate, days / 365);
    }, 0);
  };
  
  const deriv = (rate: number) => {
    return chronFlows.reduce((sum, flow) => {
      const days = (flow.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum - (days / 365) * flow.amount / Math.pow(1 + rate, (days / 365) + 1);
    }, 0);
  };

  let rate = 0.1; // Initial guess 10%
  for (let i = 0; i < 20; i++) {
    const fVal = func(rate);
    if (Math.abs(fVal) < 1e-4) return rate * 100; // Converged close enough
    const dVal = deriv(rate);
    if (Math.abs(dVal) < 1e-6) break;
    const newRate = rate - fVal / dVal;
    if (Math.abs(newRate - rate) < 1e-6) return newRate * 100;
    rate = newRate;
  }
  return null; // Failed to converge
};

export const calculateHoldings = (transactions: Transaction[], prices: Record<string, number>, targets: Record<string, number> = {}): Holding[] => {
  const holdingsMap: Record<string, Holding> = {};
  const safeTargets = targets || {};
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sortedTx.forEach(tx => {
    if (!tx.symbol) return;
    
    if (!holdingsMap[tx.symbol]) {
      holdingsMap[tx.symbol] = {
        symbol: tx.symbol,
        name: tx.name || tx.symbol,
        assetClass: tx.assetClass || AssetClass.STOCK,
        sector: tx.sector || 'General',
        shares: 0,
        avgCost: 0,
        totalCost: 0,
        currentPrice: prices[tx.symbol] || 0,
        marketValue: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        realizedPL: 0,
        totalDividends: 0,
        totalReturn: 0,
        targetAllocation: 0
      };
    }

    const h = holdingsMap[tx.symbol];
    const price = tx.price || 0;
    const shares = tx.shares || 0;
    const fee = tx.fee || 0;

    if (tx.type === TransactionType.BUY) {
      const cost = (price * shares) + fee;
      h.totalCost += cost;
      h.shares += shares;
      h.avgCost = h.totalCost / h.shares;
    } else if (tx.type === TransactionType.SELL) {
      const proceeds = (price * shares) - fee;
      const costBasis = h.avgCost * shares;
      h.realizedPL += (proceeds - costBasis);
      h.shares -= shares;
      h.totalCost -= costBasis;
      if (h.shares < 0.000001) { h.shares = 0; h.totalCost = 0; }
    } else if (tx.type === TransactionType.DIVIDEND) {
      h.totalDividends += (price - fee);
    } else if (tx.type === TransactionType.SPLIT) {
      const ratio = shares;
      if (ratio > 0) { h.shares = h.shares * ratio; h.avgCost = h.avgCost / ratio; }
    }
  });

  return Object.values(holdingsMap).map(h => {
    if (prices[h.symbol]) h.currentPrice = prices[h.symbol];
    h.marketValue = h.shares * h.currentPrice;
    h.unrealizedPL = h.marketValue - h.totalCost;
    h.unrealizedPLPercent = h.totalCost > 0 ? (h.unrealizedPL / h.totalCost) * 100 : 0;
    h.totalReturn = h.unrealizedPL + h.realizedPL + h.totalDividends;
    h.targetAllocation = safeTargets[h.symbol] || 0;
    return h;
  }).filter(h => h.shares > 0 || h.realizedPL !== 0 || h.totalDividends !== 0);
};

export const calculatePortfolioHistory = (transactions: Transaction[], currentPrices: Record<string, number>): ChartDataPoint[] => {
  if (transactions.length === 0) return [];
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const points: ChartDataPoint[] = [];
  let invested = 0;
  let cash = 0;
  const holdings: Record<string, { shares: number, lastPrice: number }> = {};

  sortedTx.forEach(tx => {
    if (tx.type === TransactionType.DEPOSIT) invested += (tx.price || 0);
    if (tx.type === TransactionType.WITHDRAW) invested -= (tx.price || 0);

    const amount = (tx.price || 0);
    const shares = (tx.shares || 0);
    const fee = (tx.fee || 0);

    if (tx.type === TransactionType.DEPOSIT) cash += amount;
    else if (tx.type === TransactionType.WITHDRAW) cash -= amount;
    else if (tx.type === TransactionType.DIVIDEND) cash += amount;
    
    if (tx.symbol) {
        if (!holdings[tx.symbol]) holdings[tx.symbol] = { shares: 0, lastPrice: 0 };
        const h = holdings[tx.symbol];
        if (amount > 0 && (tx.type === TransactionType.BUY || tx.type === TransactionType.SELL)) { h.lastPrice = amount; }

        const tradeTotal = (amount * shares);
        if (tx.type === TransactionType.BUY) { cash -= (tradeTotal + fee); h.shares += shares; } 
        else if (tx.type === TransactionType.SELL) { cash += (tradeTotal - fee); h.shares -= shares; } 
        else if (tx.type === TransactionType.SPLIT) { 
            const ratio = shares || 1; h.shares = h.shares * ratio; 
            if (h.lastPrice > 0) h.lastPrice = h.lastPrice / ratio; 
        }
    }

    let stockValue = 0;
    Object.values(holdings).forEach(h => { stockValue += h.shares * h.lastPrice; });
    points.push({ date: tx.date, invested: invested, value: cash + stockValue });
  });

  let currentStockValue = 0;
  Object.keys(holdings).forEach(symbol => {
      const h = holdings[symbol];
      const price = currentPrices[symbol] || h.lastPrice; 
      currentStockValue += h.shares * price;
  });
  points.push({ date: 'Now', invested: invested, value: cash + currentStockValue });
  return points;
};

export const calculateCAGR = (startValue: number, endValue: number, years: number) => {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

export const getYearlyDividends = (transactions: Transaction[]) => {
  const divs = transactions.filter(t => t.type === TransactionType.DIVIDEND);
  const grouped: Record<string, number> = {};
  divs.forEach(t => { const year = t.date.substring(0, 4); grouped[year] = (grouped[year] || 0) + (t.price || 0); });
  return Object.entries(grouped).map(([year, value]) => ({ year, value })).sort((a, b) => a.year.localeCompare(b.year));
};

export const getMonthlyDividends = (transactions: Transaction[]) => {
  const divs = transactions.filter(t => t.type === TransactionType.DIVIDEND);
  const grouped: Record<string, number> = {};
  divs.forEach(t => { const date = t.date.substring(0, 7); grouped[date] = (grouped[date] || 0) + (t.price || 0); });
  return Object.entries(grouped).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateFundingStats = (transactions: Transaction[]) => {
  const fundingTxs = transactions.filter(t => t.type === TransactionType.DEPOSIT || t.type === TransactionType.WITHDRAW);
  let netFundingUSD = 0;
  let netFundingLocal = 0;
  let totalDepositsUSD = 0;
  let totalDepositsLocal = 0;

  fundingTxs.forEach(tx => {
    const amount = tx.price || 0;
    const rate = tx.exchangeRate || 1;
    if (tx.type === TransactionType.DEPOSIT) {
      netFundingUSD += amount; netFundingLocal += amount * rate;
      totalDepositsUSD += amount; totalDepositsLocal += amount * rate;
    } else {
      netFundingUSD -= amount; netFundingLocal -= amount * rate;
    }
  });
  const avgFxCost = totalDepositsUSD > 0 ? totalDepositsLocal / totalDepositsUSD : 0;
  return { netFundingUSD, netFundingLocal, avgFxCost, fundingTxs };
};

export const calculateMonthlyActivity = (transactions: Transaction[]): MonthlyActivity[] => {
  const groups: Record<string, MonthlyActivity> = {};
  transactions.forEach(tx => {
    if (!tx.date || tx.date.length < 7) return;
    const ym = tx.date.substring(0, 7);
    if (!groups[ym]) groups[ym] = { yearMonth: ym, buyVolume: 0, sellVolume: 0, dividendIncome: 0, deposit: 0, withdraw: 0, transactionCount: 0 };
    
    const g = groups[ym];
    g.transactionCount++;
    const amt = tx.price || 0;
    const total = (tx.price || 0) * (tx.shares || 0);
    
    if (tx.type === TransactionType.BUY) g.buyVolume += total;
    else if (tx.type === TransactionType.SELL) g.sellVolume += total;
    else if (tx.type === TransactionType.DIVIDEND) g.dividendIncome += amt;
    else if (tx.type === TransactionType.DEPOSIT) g.deposit += amt;
    else if (tx.type === TransactionType.WITHDRAW) g.withdraw += amt;
  });
  return Object.values(groups).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
};

export const calculateMonthlyReturns = (chartData: ChartDataPoint[]): MonthlyReturnData[] => {
  if (chartData.length === 0) return [];
  
  const sorted = [...chartData].sort((a, b) => {
    const da = a.date === 'Now' ? new Date() : new Date(a.date);
    const db = b.date === 'Now' ? new Date() : new Date(b.date);
    return da.getTime() - db.getTime();
  });

  const monthlySnapshots: { yearMonth: string, value: number, invested: number }[] = [];
  const getDate = (dStr: string) => dStr === 'Now' ? new Date() : new Date(dStr);
  const getYearMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const firstDate = getDate(sorted[0].date);
  const lastDate = getDate(sorted[sorted.length - 1].date);
  
  let current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  
  let dataIdx = 0;
  let lastState = { value: 0, invested: 0 };

  while (current <= endMonth) {
     const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
     const currentYearMonth = getYearMonth(current);
     let monthState = lastState;
     
     while(dataIdx < sorted.length) {
         const p = sorted[dataIdx];
         const pDate = getDate(p.date);
         if (pDate < nextMonth) { monthState = { value: p.value, invested: p.invested }; dataIdx++; } else { break; }
     }
     lastState = monthState;
     monthlySnapshots.push({ yearMonth: currentYearMonth, ...monthState });
     current.setMonth(current.getMonth() + 1);
  }

  const returns: MonthlyReturnData[] = [];
  for (let i = 0; i < monthlySnapshots.length; i++) {
     const end = monthlySnapshots[i];
     const start = i > 0 ? monthlySnapshots[i-1] : { value: 0, invested: 0 };
     
     const netFlow = end.invested - start.invested;
     const startVal = start.value;
     const endVal = end.value;
     const pnl = endVal - startVal - netFlow;
     const denominator = startVal + (netFlow / 2);
     let pct = 0;
     if (denominator !== 0) pct = (pnl / denominator) * 100;
     if (denominator !== 0 || pnl !== 0) returns.push({ yearMonth: end.yearMonth, value: pct, pnl });
  }
  return returns;
};

export const calculateMaxDrawdown = (chartData: ChartDataPoint[]): number => {
  let peak = -Infinity;
  let maxDD = 0;
  for (const point of chartData) {
    if (point.value > peak) peak = point.value;
    if (peak > 0) {
      const dd = (peak - point.value) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD * 100;
};

export const calculateWinRate = (monthlyReturns: MonthlyReturnData[]): number => {
    if (monthlyReturns.length === 0) return 0;
    const wins = monthlyReturns.filter(m => m.value > 0).length;
    return (wins / monthlyReturns.length) * 100;
};
