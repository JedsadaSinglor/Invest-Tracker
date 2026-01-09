
import { Transaction, TransactionType, Holding, AssetClass, ChartDataPoint } from './types';

export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Calculate holdings based on transaction history
export const calculateHoldings = (transactions: Transaction[], prices: Record<string, number>, targets: Record<string, number> = {}): Holding[] => {
  const holdingsMap: Record<string, Holding> = {};
  
  // Safety check: ensure targets is an object
  const safeTargets = targets || {};

  // Sort transactions by date ascending
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
      // Prevent small floating point errors
      if (h.shares < 0.000001) {
        h.shares = 0;
        h.totalCost = 0;
      }
    } else if (tx.type === TransactionType.DIVIDEND) {
      h.totalDividends += (price - fee); // price here acts as total amount
    } else if (tx.type === TransactionType.SPLIT) {
      const ratio = shares; // Use shares field as ratio
      if (ratio > 0) {
        h.shares = h.shares * ratio;
        h.avgCost = h.avgCost / ratio;
        // Total cost remains unchanged
      }
    }
  });

  // Final Calculations based on current price
  return Object.values(holdingsMap).map(h => {
    // If user provided a price, update it, otherwise keep 0 (or last known)
    if (prices[h.symbol]) h.currentPrice = prices[h.symbol];
    
    h.marketValue = h.shares * h.currentPrice;
    h.unrealizedPL = h.marketValue - h.totalCost;
    h.unrealizedPLPercent = h.totalCost > 0 ? (h.unrealizedPL / h.totalCost) * 100 : 0;
    h.totalReturn = h.unrealizedPL + h.realizedPL + h.totalDividends;
    // Use safeTargets to prevent crash if targets is null
    h.targetAllocation = safeTargets[h.symbol] || 0;
    
    return h;
  }).filter(h => h.shares > 0 || h.realizedPL !== 0 || h.totalDividends !== 0); // Keep if we have history/shares
};

export const calculatePortfolioHistory = (transactions: Transaction[], currentPrices: Record<string, number>): ChartDataPoint[] => {
  if (transactions.length === 0) return [];

  // Sort by date
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const points: ChartDataPoint[] = [];
  let invested = 0;
  let cash = 0;
  const holdings: Record<string, { shares: number, lastPrice: number }> = {};

  sortedTx.forEach(tx => {
    // Invested Logic
    if (tx.type === TransactionType.DEPOSIT) invested += (tx.price || 0);
    if (tx.type === TransactionType.WITHDRAW) invested -= (tx.price || 0);

    // Cash Logic
    const amount = (tx.price || 0);
    const shares = (tx.shares || 0);
    const fee = (tx.fee || 0);

    if (tx.type === TransactionType.DEPOSIT) cash += amount;
    else if (tx.type === TransactionType.WITHDRAW) cash -= amount;
    else if (tx.type === TransactionType.DIVIDEND) cash += amount;
    
    // Trade & Split Logic
    if (tx.symbol) {
        if (!holdings[tx.symbol]) holdings[tx.symbol] = { shares: 0, lastPrice: 0 };
        const h = holdings[tx.symbol];
        
        // Update price from transaction if available (Buy/Sell)
        if (amount > 0 && (tx.type === TransactionType.BUY || tx.type === TransactionType.SELL)) {
            h.lastPrice = amount; // For Buy/Sell, price field is per share
        }

        const tradeTotal = (amount * shares);

        if (tx.type === TransactionType.BUY) {
            cash -= (tradeTotal + fee);
            h.shares += shares;
        } else if (tx.type === TransactionType.SELL) {
            cash += (tradeTotal - fee);
            h.shares -= shares;
        } else if (tx.type === TransactionType.SPLIT) {
            const ratio = shares || 1;
            h.shares = h.shares * ratio;
            // Adjust the last known price to prevent value spike
            if (h.lastPrice > 0) h.lastPrice = h.lastPrice / ratio;
        }
    }

    // Calculate Portfolio Value at this point
    let stockValue = 0;
    Object.values(holdings).forEach(h => {
        stockValue += h.shares * h.lastPrice;
    });

    points.push({
        date: tx.date,
        invested: invested,
        value: cash + stockValue
    });
  });

  // Add "Now" point with current market prices
  let currentStockValue = 0;
  Object.keys(holdings).forEach(symbol => {
      const h = holdings[symbol];
      // Use current price from app state if available, else last known transaction price
      const price = currentPrices[symbol] || h.lastPrice; 
      currentStockValue += h.shares * price;
  });

  points.push({
      date: 'Now',
      invested: invested,
      value: cash + currentStockValue
  });

  return points;
};

// Simple CAGR calculation
export const calculateCAGR = (startValue: number, endValue: number, years: number) => {
  if (startValue <= 0 || years <= 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

// --- NEW HELPERS ---

export const getYearlyDividends = (transactions: Transaction[]) => {
  const divs = transactions.filter(t => t.type === TransactionType.DIVIDEND);
  const grouped: Record<string, number> = {}; // "YYYY" -> amount
  
  divs.forEach(t => {
    const year = t.date.substring(0, 4);
    grouped[year] = (grouped[year] || 0) + (t.price || 0);
  });
  
  return Object.entries(grouped)
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year.localeCompare(b.year));
};

export const getMonthlyDividends = (transactions: Transaction[]) => {
  const divs = transactions.filter(t => t.type === TransactionType.DIVIDEND);
  const grouped: Record<string, number> = {}; // "YYYY-MM" -> amount
  
  divs.forEach(t => {
    const date = t.date.substring(0, 7); // YYYY-MM
    grouped[date] = (grouped[date] || 0) + (t.price || 0);
  });
  
  // Return last 12 months or all? Let's return all for chart
  return Object.entries(grouped)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const calculateFundingStats = (transactions: Transaction[]) => {
  const fundingTxs = transactions.filter(t => t.type === TransactionType.DEPOSIT || t.type === TransactionType.WITHDRAW);
  
  let netFundingUSD = 0;
  let netFundingLocal = 0;
  let totalDepositsUSD = 0;
  let totalDepositsLocal = 0;

  fundingTxs.forEach(tx => {
    const amount = tx.price || 0;
    const rate = tx.exchangeRate || 1; // Default to 1 if no rate (assuming base currency)
    
    if (tx.type === TransactionType.DEPOSIT) {
      netFundingUSD += amount;
      netFundingLocal += amount * rate;
      totalDepositsUSD += amount;
      totalDepositsLocal += amount * rate;
    } else {
      netFundingUSD -= amount;
      netFundingLocal -= amount * rate;
    }
  });

  const avgFxCost = totalDepositsUSD > 0 ? totalDepositsLocal / totalDepositsUSD : 0;

  return { netFundingUSD, netFundingLocal, avgFxCost, fundingTxs };
};

export interface MonthlyActivity {
  yearMonth: string; // YYYY-MM
  buyVolume: number;
  sellVolume: number;
  dividendIncome: number;
  deposit: number;
  withdraw: number;
  transactionCount: number;
}

export const calculateMonthlyActivity = (transactions: Transaction[]): MonthlyActivity[] => {
  const groups: Record<string, MonthlyActivity> = {};

  transactions.forEach(tx => {
    // Ensure date is valid string and takes first 7 chars for YYYY-MM
    if (!tx.date || tx.date.length < 7) return;
    
    const ym = tx.date.substring(0, 7);
    if (!groups[ym]) {
      groups[ym] = { yearMonth: ym, buyVolume: 0, sellVolume: 0, dividendIncome: 0, deposit: 0, withdraw: 0, transactionCount: 0 };
    }
    
    const g = groups[ym];
    g.transactionCount++;
    const amt = tx.price || 0;
    const total = (tx.price || 0) * (tx.shares || 0); // For Buy/Sell
    
    if (tx.type === TransactionType.BUY) g.buyVolume += total;
    else if (tx.type === TransactionType.SELL) g.sellVolume += total;
    else if (tx.type === TransactionType.DIVIDEND) g.dividendIncome += amt;
    else if (tx.type === TransactionType.DEPOSIT) g.deposit += amt;
    else if (tx.type === TransactionType.WITHDRAW) g.withdraw += amt;
  });

  return Object.values(groups).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)); // Descending
};

// Calculate Monthly Returns (Time-Weighted or Modified Dietz Approx)
export interface MonthlyReturnData {
  yearMonth: string;
  value: number; // Percent
  pnl: number;
}

export const calculateMonthlyReturns = (chartData: ChartDataPoint[]): MonthlyReturnData[] => {
  if (chartData.length === 0) return [];
  
  // Sort chronologically
  const sorted = [...chartData].sort((a, b) => {
    const da = a.date === 'Now' ? new Date() : new Date(a.date);
    const db = b.date === 'Now' ? new Date() : new Date(b.date);
    return da.getTime() - db.getTime();
  });

  const monthlySnapshots: { yearMonth: string, value: number, invested: number }[] = [];
  
  // Helper to parse date
  const getDate = (dStr: string) => dStr === 'Now' ? new Date() : new Date(dStr);
  const getYearMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const firstDate = getDate(sorted[0].date);
  const lastDate = getDate(sorted[sorted.length - 1].date);
  
  // Loop through every month from start to end
  let current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
  
  let dataIdx = 0;
  let lastState = { value: 0, invested: 0 };

  while (current <= endMonth) {
     const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
     const currentYearMonth = getYearMonth(current);
     
     // Find the last data point that belongs to this month (strictly less than nextMonth start)
     let monthState = lastState;
     
     while(dataIdx < sorted.length) {
         const p = sorted[dataIdx];
         const pDate = getDate(p.date);
         if (pDate < nextMonth) {
             monthState = { value: p.value, invested: p.invested };
             dataIdx++;
         } else {
             break;
         }
     }
     
     lastState = monthState;
     monthlySnapshots.push({ yearMonth: currentYearMonth, ...monthState });
     
     // Advance
     current.setMonth(current.getMonth() + 1);
  }

  const returns: MonthlyReturnData[] = [];
  for (let i = 0; i < monthlySnapshots.length; i++) {
     const end = monthlySnapshots[i];
     const start = i > 0 ? monthlySnapshots[i-1] : { value: 0, invested: 0 };
     
     const netFlow = end.invested - start.invested;
     const startVal = start.value;
     const endVal = end.value;
     
     // PnL
     const pnl = endVal - startVal - netFlow;
     
     // Return % (Modified Dietz denominator)
     const denominator = startVal + (netFlow / 2);
     
     let pct = 0;
     if (denominator !== 0) {
         pct = (pnl / denominator) * 100;
     }
     
     // Ignore months with 0 start value and 0 flow (empty months before start)
     if (denominator !== 0 || pnl !== 0) {
        returns.push({ yearMonth: end.yearMonth, value: pct, pnl });
     }
  }
  
  return returns;
};

// --- STATS HELPERS ---

export const calculateMaxDrawdown = (chartData: ChartDataPoint[]): number => {
  let peak = -Infinity;
  let maxDD = 0;

  for (const point of chartData) {
    if (point.value > peak) {
      peak = point.value;
    }
    if (peak > 0) {
      const dd = (peak - point.value) / peak;
      if (dd > maxDD) {
        maxDD = dd;
      }
    }
  }
  return maxDD * 100; // Percentage
};

export const calculateWinRate = (monthlyReturns: MonthlyReturnData[]): number => {
    if (monthlyReturns.length === 0) return 0;
    const wins = monthlyReturns.filter(m => m.value > 0).length;
    return (wins / monthlyReturns.length) * 100;
};


// --- CSV IMPORT / EXPORT HELPERS ---

const escapeCSV = (str: string | number | undefined) => {
  if (str === undefined || str === null) return '';
  const stringValue = String(str);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const transactionsToCSV = (transactions: Transaction[]): string => {
  const headers = ['ID', 'Date', 'Type', 'Symbol', 'Shares', 'Price', 'Fee', 'Asset Class', 'Exchange Rate', 'Notes', 'Total Value'];
  const csvRows = [headers.join(',')];

  for (const t of transactions) {
    const totalValue = (t.shares && (t.type === TransactionType.BUY || t.type === TransactionType.SELL))
        ? (t.shares * (t.price || 0))
        : (t.price || 0);

    const row = [
      escapeCSV(t.id),
      escapeCSV(t.date),
      escapeCSV(t.type),
      escapeCSV(t.symbol),
      escapeCSV(t.shares),
      escapeCSV(t.price),
      escapeCSV(t.fee),
      escapeCSV(t.assetClass),
      escapeCSV(t.exchangeRate),
      escapeCSV(t.notes),
      escapeCSV(totalValue)
    ];
    csvRows.push(row.join(','));
  }
  return csvRows.join('\n');
};

const parseCSVLine = (text: string) => {
  const result = [];
  let curVal = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          curVal += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        curVal += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        result.push(curVal);
        curVal = '';
      } else {
        curVal += char;
      }
    }
  }
  result.push(curVal);
  return result;
};

export const csvToTransactions = (csvContent: string): Transaction[] => {
  // 1. Strip BOM to prevent header corruption
  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // 2. Advanced Header Normalization (Aliases)
  const normalizeHeader = (h: string) => {
    const lower = h.trim().toLowerCase().replace(/['"]/g, '');
    if (['qty', 'quantity', 'units', 'count'].includes(lower)) return 'shares';
    if (['cost', 'rate', 'price per share', 'unit price', 'price'].includes(lower)) return 'price';
    if (['amount', 'total', 'total value', 'value', 'total amount', 'market value'].includes(lower)) return 'total_value_temp'; // Map to temp field
    if (['ticker', 'stock', 'asset', 'symbol'].includes(lower)) return 'symbol';
    if (['transaction type', 'action', 'operation', 'type'].includes(lower)) return 'type';
    if (['date', 'time', 'timestamp'].includes(lower)) return 'date';
    if (['fee', 'commission', 'cost'].includes(lower)) return 'fee';
    return lower;
  };

  const headers = lines[0].split(',').map(normalizeHeader);
  const transactions: Transaction[] = [];

  // Robust Number Parsing
  const parseNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const clean = val.replace(/[^0-9.-]/g, ''); // Remove currency symbols, commas, spaces
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Date Normalization (Ensure YYYY-MM-DD for consistency)
  const parseDate = (val: string): string => {
     if (!val) return new Date().toISOString().split('T')[0];
     
     // Attempt standard parse
     const date = new Date(val);
     if (!isNaN(date.getTime())) {
         return date.toISOString().split('T')[0];
     }
     
     // Fallback for simple formats not handled by Date() constructor automatically?
     // Most browsers handle 'MM/DD/YYYY', 'YYYY/MM/DD' fine.
     // If it fails, return raw string (risk of breaking sorting/grouping), or today.
     return new Date().toISOString().split('T')[0];
  };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const t: any = {};
    let totalValueTemp = 0;

    headers.forEach((header, index) => {
      let val = values[index];
      if (val === undefined || val === '') return;
      val = val.trim();
      
      switch (header) {
        case 'id': t.id = val; break;
        case 'date': t.date = parseDate(val); break;
        case 'type': t.type = val.toUpperCase(); break;
        case 'symbol': t.symbol = val.toUpperCase(); break;
        case 'shares': t.shares = parseNumber(val); break;
        case 'price': t.price = parseNumber(val); break;
        case 'fee': t.fee = parseNumber(val); break;
        case 'asset class': t.assetClass = val; break; 
        case 'exchange rate': t.exchangeRate = parseNumber(val); break;
        case 'notes': t.notes = val; break;
        case 'total_value_temp': totalValueTemp = parseNumber(val); break;
      }
    });
    
    // --- Post-Processing / Calculation ---
    
    // Auto-calculate Price if missing but Total is present (Common in manual CSVs)
    if ((t.type === 'BUY' || t.type === 'SELL') && (!t.price || t.price === 0)) {
        if (totalValueTemp > 0 && t.shares > 0) {
            t.price = totalValueTemp / t.shares;
        }
    }
    
    // Auto-calculate Price (Amount) for Funding Transactions if missing
    if ((['DEPOSIT', 'WITHDRAW', 'DIVIDEND'].includes(t.type)) && (!t.price || t.price === 0)) {
        if (totalValueTemp > 0) t.price = totalValueTemp;
    }

    // --- Validation ---
    if (t.date && t.type) {
        if (!t.id) t.id = generateId();
        if (isNaN(t.shares)) t.shares = 0;
        if (isNaN(t.price)) t.price = 0;
        if (isNaN(t.fee)) t.fee = 0;
        
        transactions.push(t as Transaction);
    }
  }
  return transactions;
};
