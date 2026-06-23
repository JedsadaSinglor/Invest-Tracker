import React from 'react';
import { BarChart3 } from 'lucide-react';

export const SummaryBar = ({ children }: { children?: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-slate-100 dark:divide-slate-700/50">
      {children}
    </div>
  </div>
);

export const SummaryMetric = ({ label, value, subValue, icon, color = 'blue' }: { label: string, value: string | number, subValue?: string | React.ReactNode, icon?: React.ReactNode, color?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  };

  return (
    <div className="flex flex-col px-0 md:px-4 first:pl-0">
      <div className="flex items-center gap-2 mb-2">
        {icon && <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>{icon}</div>}
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-slate-900 dark:text-white leading-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
};

export const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xl z-50 min-w-[180px]">
        {label && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">{label}</p>}
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
             const nameMap: Record<string, string> = {
                'netInvested': 'Net Invested',
                'dividendIncome': 'Dividends',
                'value': 'Market Value',
                'invested': 'Cost Basis',
                'benchmark': 'Benchmark (8%)',
                'buyVolume': 'Buy Volume',
                'sellVolume': 'Sell Volume',
                'deposit': 'Deposits',
                'withdraw': 'Withdrawals'
             };
             const displayName = nameMap[entry.name] || entry.name;
             
             // Don't show if value is 0 unless it's the only thing
             if (payload.length > 1 && entry.value === 0 && entry.name !== 'benchmark') return null;

             return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  <span className="text-slate-600 dark:text-slate-300 font-medium capitalize">
                      {displayName}
                  </span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {formatter ? formatter(entry.value, entry.name, entry) : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const EmptyState = ({ message, subMessage }: { message: string, subMessage?: string }) => (
    <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-4">
            <BarChart3 size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{message}</h3>
        {subMessage && <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{subMessage}</p>}
    </div>
);
