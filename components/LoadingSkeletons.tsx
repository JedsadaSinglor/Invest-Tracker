
import React from 'react';
import { Loader2 } from 'lucide-react';

// Enhanced Skeleton with Shimmer Effect
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-xl ${className}`} />
);

export const Spinner = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} />
);

export const LoadingOverlay = () => (
  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
    <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl border border-slate-100 dark:border-slate-700">
      <Spinner size={32} className="text-blue-600 dark:text-blue-400" />
    </div>
  </div>
);

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Row 1: Big Net Worth Card & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
         <div className="md:col-span-7 h-[220px] rounded-3xl skeleton-shimmer shadow-sm relative overflow-hidden">
             {/* Simulate content inside */}
             <div className="absolute top-8 left-8 space-y-4 w-2/3">
                 <div className="h-6 w-32 bg-black/10 dark:bg-white/10 rounded-lg"></div>
                 <div className="h-12 w-48 bg-black/10 dark:bg-white/10 rounded-xl"></div>
                 <div className="flex gap-4 mt-4">
                     <div className="h-10 w-24 bg-black/10 dark:bg-white/10 rounded-lg"></div>
                     <div className="h-10 w-24 bg-black/10 dark:bg-white/10 rounded-lg"></div>
                 </div>
             </div>
         </div>
         <div className="md:col-span-5 flex flex-col gap-6">
             <Skeleton className="flex-1 rounded-3xl" />
             <Skeleton className="h-20 rounded-3xl" />
         </div>
      </div>

      {/* Row 2: Charts & Top Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between mb-6">
             <Skeleton className="h-6 w-32" />
             <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="w-full h-[280px]" />
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between">
             <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>

      {/* Row 3: Allocation & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="h-[340px] bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center">
             <Skeleton className="w-48 h-48 rounded-full mx-auto" />
         </div>
         <div className="h-[340px] bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
             <Skeleton className="h-6 w-32 mb-2" />
             <Skeleton className="h-14 w-full rounded-2xl" />
             <Skeleton className="h-14 w-full rounded-2xl" />
             <Skeleton className="h-14 w-full rounded-2xl" />
             <Skeleton className="h-14 w-full rounded-2xl" />
         </div>
      </div>
    </div>
  );
};

export const HoldingsSkeleton = () => {
  return (
    <div className="space-y-8 animate-fade-in">
       {/* Summary Row */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <Skeleton className="h-28 rounded-2xl" />
           <Skeleton className="h-28 rounded-2xl" />
           <Skeleton className="h-28 rounded-2xl" />
           <Skeleton className="h-28 rounded-2xl" />
       </div>

       {/* Rebalancing Section */}
       <Skeleton className="h-64 w-full rounded-3xl" />

       {/* Controls */}
       <div className="flex justify-between items-center">
         <Skeleton className="h-8 w-48" />
         <Skeleton className="h-8 w-24" />
       </div>
       
       {/* Cards Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 h-[240px] border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-sm">
               <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                     <Skeleton className="w-10 h-10 rounded-xl" />
                     <div className="space-y-2">
                        <Skeleton className="w-16 h-4" />
                        <Skeleton className="w-12 h-3" />
                     </div>
                  </div>
                  <Skeleton className="w-16 h-6" />
               </div>
               <Skeleton className="w-full h-10 my-2" />
               <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="space-y-2">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-16" />
                  </div>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

export const HistorySkeleton = () => {
   return (
     <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col gap-6">
          <div className="flex justify-between items-end">
             <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
             </div>
             <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <Skeleton className="h-24 rounded-2xl" />
             <Skeleton className="h-24 rounded-2xl" />
             <Skeleton className="h-24 rounded-2xl" />
             <Skeleton className="h-24 rounded-2xl" />
          </div>
       </div>

       <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="space-y-6">
             {[1, 2, 3].map(group => (
                 <div key={group} className="space-y-3">
                     <Skeleton className="h-4 w-32" />
                     <div className="space-y-2">
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                     </div>
                 </div>
             ))}
          </div>
       </div>
     </div>
   )
}

export const ReportsSkeleton = () => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Tabs */}
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-80 rounded-xl" />
            </div>
            
            {/* Summary Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-4 gap-8">
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-8 w-full"/></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-8 w-full"/></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-8 w-full"/></div>
                <div className="space-y-2"><Skeleton className="h-4 w-20"/><Skeleton className="h-8 w-full"/></div>
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm h-[400px]">
                <div className="flex justify-between mb-6">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="w-full h-full rounded-xl" />
            </div>
            
            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        </div>
    )
}
