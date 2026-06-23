import { useMemo, useState } from 'react';
import { Transaction, TransactionType, AssetClass } from '../../types';

interface UseHistoryDataProps {
  transactions: Transaction[];
}

export function useHistoryData({ transactions }: UseHistoryDataProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClass | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

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

  return {
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    assetClassFilter,
    setAssetClassFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    sortOrder,
    setSortOrder,
    showFilters,
    setShowFilters,
    filteredTransactions,
    groupedTransactions
  };
}
