
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  DIVIDEND = 'DIVIDEND',
  SPLIT = 'SPLIT'
}

export enum AssetClass {
  STOCK = 'Stock',
  CRYPTO = 'Crypto',
  FUND = 'Fund',
  ETF = 'ETF',
  BOND = 'Bond',
  REAL_ESTATE = 'Real Estate',
  GOLD = 'Gold',
  CASH = 'Cash'
}

export interface Portfolio {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  symbol?: string; // e.g., AAPL, BTC
  name?: string; // e.g., Apple Inc.
  assetClass?: AssetClass;
  sector?: string; // e.g., Tech, Finance
  shares?: number; // For SPLIT, this stores the Ratio (e.g. 2 for 2:1)
  price?: number; // Price per share or Amount for Deposit/Withdraw
  fee?: number;
  exchangeRate?: number; // 1 for local currency
  notes?: string;
}

export interface Holding {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: string;
  shares: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalDividends: number;
  totalReturn: number;
  targetAllocation?: number; // User defined percentage (0-100)
}

export interface MonthlyReturn {
  yearMonth: string; // YYYY-MM
  value: number; // Percentage
}

export interface FinancialGoal {
  id: string;
  targetAmount: number;
  startDate: string; // ISO Date
  endDate?: string; // ISO Date (if completed/changed)
  isAchieved: boolean;
  notes?: string;
}

export interface PortfolioState {
  transactions: Transaction[];
  prices: Record<string, number>; // symbol -> current price
  financialGoal: number; // Deprecated in favor of goals list, kept for legacy type safety if needed
  goals: FinancialGoal[];
  monthlyReturns: Record<string, number>; // YYYY-MM -> %
}

export interface ChartDataPoint {
  date: string;
  invested: number;
  value: number;
}
