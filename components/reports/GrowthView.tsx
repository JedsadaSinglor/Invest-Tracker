import React, { useState, useMemo } from 'react';
import { Transaction, Holding, ChartDataPoint, TransactionType } from '../../types';
import { calculateMaxDrawdown, calculateMonthlyReturns, calculateWinRate } from '../../utils';
import { AreaChart, Area, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity, Target } from 'lucide-react';
import { SummaryBar, SummaryMetric, CustomTooltip, EmptyState } from './SharedComponents';

export const GrowthView: React.FC<{ transactions: Transaction[], holdings: Holding[], currentPortfolioValue: number, chartData: ChartDataPoint[], formatMoney: (val: number) => string }> = ({ transactions, holdings, currentPortfolioValue, chartData, formatMoney }) => {
    const [chartTimeRange, setChartTimeRange] = useState<'1M' | '6M' | '1Y' | 'ALL'>('ALL');

    // 1. Filtered Chart Data
    const filteredChartData = useMemo(() => {
        if (chartTimeRange === 'ALL') return chartData;
        const now = new Date();
        const cutoff = new Date();
        if (chartTimeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
        else if (chartTimeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
        else if (chartTimeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
        
        return chartData.filter(pt => {
            if (pt.date === 'Now') return true;
            return new Date(pt.date) >= cutoff;
        });
    }, [chartData, chartTimeRange]);

    // 2. Advanced Metrics
    const metrics = useMemo(() => {
        if (chartData.length < 2) return null;
        
        const firstPoint = chartData[0];
        const lastPoint = chartData[chartData.length - 1];
        
        // Total Return
        const totalReturnPct = firstPoint.invested > 0 
            ? ((lastPoint.value - lastPoint.invested) / lastPoint.invested) * 100 
            : 0;

        // Max Drawdown
        const maxDrawdown = calculateMaxDrawdown(chartData);

        // Win Rate (Months positive vs negative)
        const monthlyReturns = calculateMonthlyReturns(chartData);
        const winRate = calculateWinRate(monthlyReturns);

        // Benchmark (Simple 8% annualized assumption for comparison)
        const benchmarkData = chartData.map((pt, index) => {
            if (index === 0) return { ...pt, benchmark: pt.invested };
            const daysDiff = (new Date(pt.date).getTime() - new Date(firstPoint.date).getTime()) / (1000 * 3600 * 24);
            const yearsDiff = daysDiff / 365.25;
            const expectedValue = pt.invested * Math.pow(1.08, yearsDiff);
            return { ...pt, benchmark: expectedValue };
        });

        const filteredBenchmarkData = benchmarkData.filter(pt => {
            if (chartTimeRange === 'ALL') return true;
            const now = new Date();
            const cutoff = new Date();
            if (chartTimeRange === '1M') cutoff.setMonth(now.getMonth() - 1);
            else if (chartTimeRange === '6M') cutoff.setMonth(now.getMonth() - 6);
            else if (chartTimeRange === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
            return pt.date === 'Now' || new Date(pt.date) >= cutoff;
        });

        return { totalReturnPct, maxDrawdown, winRate, benchmarkData: filteredBenchmarkData };
    }, [chartData, chartTimeRange]);

    if (chartData.length < 2) {
        return <EmptyState message="Not enough data for growth analysis." subMessage="Add more transactions over time to see your growth trajectory." />;
    }

    return (
        <div className="space-y-6 animate-slide-up">
            {/* 1. Summary Bar */}
            <SummaryBar>
                 <SummaryMetric 
                    label="Total Return" 
                    value={`${metrics?.totalReturnPct >= 0 ? '+' : ''}${metrics?.totalReturnPct.toFixed(2)}%`} 
                    subValue="All time performance"
                    icon={metrics?.totalReturnPct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    color={metrics?.totalReturnPct >= 0 ? 'emerald' : 'rose'}
                />
                 <SummaryMetric 
                    label="Max Drawdown" 
                    value={`${metrics?.maxDrawdown.toFixed(2)}%`} 
                    subValue="Largest peak-to-trough drop"
                    icon={<ArrowDown size={16} />}
                    color="rose"
                />
                 <SummaryMetric 
                    label="Win Rate" 
                    value={`${metrics?.winRate.toFixed(0)}%`} 
                    subValue="Profitable months"
                    icon={<Target size={16} />}
                    color="indigo"
                />
                 <SummaryMetric 
                    label="Alpha" 
                    value={`${((metrics?.totalReturnPct || 0) - 8).toFixed(2)}%`} 
                    subValue="vs 8% Benchmark"
                    icon={<Activity size={16} />}
                    color={(metrics?.totalReturnPct || 0) >= 8 ? 'emerald' : 'amber'}
                />
            </SummaryBar>

            {/* 2. Main Growth Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white">Performance vs Benchmark</h3>
                       <p className="text-xs text-slate-500">Comparing your portfolio against a standard 8% annualized return</p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        {['1M', '6M', '1Y', 'ALL'].map(range => (
                            <button
                                key={range}
                                onClick={() => setChartTimeRange(range as any)}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                                    chartTimeRange === range 
                                    ? 'bg-white dark:bg-slate-600 shadow text-slate-900 dark:text-white' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics?.benchmarkData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValueGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} dy={10} minTickGap={40} 
                                tickFormatter={(val) => {
                                    if (val === 'Now') return 'Now';
                                    const d = new Date(val);
                                    return d.toLocaleDateString(undefined, {month:'short', year:'2-digit'});
                                }}
                            />
                            <YAxis 
                                axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} 
                                tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                            />
                            <Tooltip content={<CustomTooltip formatter={formatMoney} />} />
                            
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                name="Market Value"
                                stroke="#10b981" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorValueGrowth)" 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="benchmark" 
                                name="Benchmark (8%)"
                                stroke="#f59e0b" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false}
                            />
                            <Line 
                                type="stepAfter" 
                                dataKey="invested" 
                                name="Net Invested"
                                stroke="#94a3b8" 
                                strokeWidth={2} 
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="flex justify-center gap-6 mt-6 text-xs font-bold">
                    <div className="flex items-center text-emerald-500"><div className="w-3 h-3 bg-emerald-500 rounded-full mr-2 shadow-sm"></div> Portfolio Value</div>
                    <div className="flex items-center text-amber-500"><div className="w-3 h-3 bg-amber-500 rounded-full mr-2 shadow-sm"></div> 8% Benchmark</div>
                    <div className="flex items-center text-slate-400"><div className="w-3 h-3 bg-slate-400 rounded-full mr-2 shadow-sm"></div> Net Invested</div>
                </div>
            </div>
        </div>
    );
};
