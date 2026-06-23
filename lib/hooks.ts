import { useState, useEffect, useRef } from 'react';
import { Transaction, FinancialGoal } from '../types';
import { safeJSONParse, generateId } from '../utils';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        try {
          return JSON.parse(item);
        } catch {
          // If it's not valid JSON, return it as a string if T is expected to be a string,
          // otherwise return the fallback.
          return (item as unknown) as T;
        }
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const valueToStore = typeof storedValue === 'string' ? storedValue : JSON.stringify(storedValue);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export function usePortfolioData(activePortfolioId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => safeJSONParse<Transaction[]>(`transactions_${activePortfolioId}`, []));
  const [prices, setPrices] = useState<Record<string, number>>(() => safeJSONParse<Record<string, number>>(`prices_${activePortfolioId}`, {}));
  const [targets, setTargets] = useState<Record<string, number>>(() => safeJSONParse<Record<string, number>>(`targets_${activePortfolioId}`, {}));
  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = safeJSONParse<FinancialGoal[]>(`goals_${activePortfolioId}`, []);
    return saved.length > 0 ? saved : [{ id: generateId(), targetAmount: 100000, startDate: new Date().toISOString(), isAchieved: false, notes: 'Initial Goal' }];
  });

  const [isLoading, setIsLoading] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setIsLoading(true);
    
    // Load new data
    const newTransactions = safeJSONParse<Transaction[]>(`transactions_${activePortfolioId}`, []);
    const newPrices = safeJSONParse<Record<string, number>>(`prices_${activePortfolioId}`, {});
    const newTargets = safeJSONParse<Record<string, number>>(`targets_${activePortfolioId}`, {});
    const loadedGoals = safeJSONParse<FinancialGoal[]>(`goals_${activePortfolioId}`, []);
    const newGoals = loadedGoals.length > 0 ? loadedGoals : [{ id: generateId(), targetAmount: 100000, startDate: new Date().toISOString(), isAchieved: false, notes: 'Initial Goal' }];

    setTransactions(newTransactions);
    setPrices(newPrices);
    setTargets(newTargets);
    setGoals(newGoals);
    
    // Small delay to show loading state for better UX
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [activePortfolioId]);

  // Save data when it changes (and not on first mount of a new portfolio id)
  const isSavingRef = useRef(false);
  
  useEffect(() => {
    if (isLoading) return;
    window.localStorage.setItem(`transactions_${activePortfolioId}`, JSON.stringify(transactions));
  }, [transactions, activePortfolioId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    window.localStorage.setItem(`prices_${activePortfolioId}`, JSON.stringify(prices));
  }, [prices, activePortfolioId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    window.localStorage.setItem(`targets_${activePortfolioId}`, JSON.stringify(targets));
  }, [targets, activePortfolioId, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    window.localStorage.setItem(`goals_${activePortfolioId}`, JSON.stringify(goals));
  }, [goals, activePortfolioId, isLoading]);

  return {
    transactions, setTransactions,
    prices, setPrices,
    targets, setTargets,
    goals, setGoals,
    isLoading
  };
}
