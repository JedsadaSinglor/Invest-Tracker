
import React, { useState, useEffect } from 'react';
import { FinancialGoal } from '../types';
import { X, Target, Save, CheckCircle2, XCircle, Calendar, ArrowRight, History, TrendingUp, Edit2, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: FinancialGoal[];
  currentNetWorth: number;
  onSetGoal: (amount: number, notes: string) => void;
  onEditGoal: (goal: FinancialGoal) => void;
  onDeleteGoal: (id: string) => void;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, goals, currentNetWorth, onSetGoal, onEditGoal, onDeleteGoal }) => {
  // Form State
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isEndDateSet, setIsEndDateSet] = useState(false); // For editing purely
  
  // Edit Mode State
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingGoal(null);
    setAmount('');
    setNotes('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setIsEndDateSet(false);
    setDeleteId(null);
  };
  
  const handleEditClick = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setAmount(goal.targetAmount.toString());
    setNotes(goal.notes || '');
    setStartDate(goal.startDate.split('T')[0]);
    setIsEndDateSet(!!goal.endDate);
  };

  const onRequestDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteGoal(deleteId);
      if (editingGoal && editingGoal.id === deleteId) {
        resetForm();
      }
      setDeleteId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (numAmount > 0) {
      if (editingGoal) {
        // Update existing
        onEditGoal({
          ...editingGoal,
          targetAmount: numAmount,
          notes: notes,
          startDate: startDate // Update start date if changed
        });
        resetForm();
      } else {
        // Create new
        onSetGoal(numAmount, notes);
        resetForm();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  // Sort goals: Active first, then by end date descending
  const sortedGoals = [...goals].sort((a, b) => {
    if (!a.endDate && b.endDate) return -1;
    if (a.endDate && !b.endDate) return 1;
    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  });

  const activeGoal = goals.find(g => !g.endDate);
  
  // Calculate progress for the *currently viewed/edited* goal context or the active goal
  const displayGoal = editingGoal || activeGoal;
  const progressPercentage = displayGoal ? Math.min((currentNetWorth / displayGoal.targetAmount) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-zoom-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        
        {/* Internal Delete Confirmation Overlay */}
        {deleteId && (
          <div className="absolute inset-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full animate-zoom-in">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 mx-auto">
                   <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-2 text-center">Delete Goal?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
                  Are you sure you want to remove this goal from your history? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setDeleteId(null)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-2.5 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                  >
                    Delete
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
           <div className="flex items-center space-x-3">
             <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
               <Target size={24} />
             </div>
             <div>
               <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Financial Goal</h2>
               <p className="text-sm text-slate-500">Set targets and track your journey</p>
             </div>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500">
             <X size={20} />
           </button>
        </div>

        <div className="overflow-hidden flex flex-col md:flex-row flex-1 min-h-0">
           
           {/* Left Column: Form & Current Status */}
           <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
              
              {/* Status Card (Visualizes either the Active Goal or the one being edited) */}
              {displayGoal && (
                 <div className={`p-5 rounded-2xl border mb-6 transition-all ${
                    editingGoal 
                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                 }`}>
                    <div className="flex justify-between items-start mb-4">
                       <span className={`text-xs font-bold uppercase tracking-wider ${editingGoal ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500'}`}>
                          {editingGoal ? 'Editing Goal Record' : 'Current Target'}
                       </span>
                       {!displayGoal.endDate ? (
                         <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-full flex items-center">
                           <TrendingUp size={12} className="mr-1" /> Ongoing
                         </span>
                       ) : (
                         <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full">
                           Past Record
                         </span>
                       )}
                    </div>
                    
                    <div className="flex items-baseline space-x-2 mb-1">
                      <div className="text-3xl font-display font-bold text-slate-900 dark:text-white">
                        {formatCurrency(displayGoal.targetAmount)}
                      </div>
                    </div>

                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex items-center">
                      <Calendar size={12} className="mr-1.5" />
                      Started {new Date(displayGoal.startDate).toLocaleDateString()}
                    </div>
                    
                    {/* Progress Bar (Only meaningful for active goals or active context) */}
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-400">
                          {progressPercentage.toFixed(1)}% Achieved
                        </span>
                         <span className="text-xs font-medium text-slate-400">
                           Current: {formatCurrency(currentNetWorth)}
                         </span>
                      </div>
                      <div className="overflow-hidden h-2 mb-1 text-xs flex rounded-full bg-slate-200 dark:bg-slate-700">
                        <div style={{ width: `${progressPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-1000"></div>
                      </div>
                    </div>
                 </div>
              )}

              {/* Form Section */}
              <div className="flex-1 flex flex-col justify-end">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                       {editingGoal ? <Edit2 size={16} className="mr-2 text-amber-500"/> : <Plus size={16} className="mr-2 text-blue-500"/>}
                       {editingGoal ? 'Update Goal Details' : 'Set New Target'}
                    </h3>
                    {editingGoal && (
                       <button 
                         onClick={resetForm} 
                         className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white underline"
                       >
                         Cancel Edit
                       </button>
                    )}
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                          type="number" 
                          required
                          min="1"
                          placeholder="e.g. 100000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-8 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Show Date Picker only if Editing (to fix history) or if creating new one (optional, defaults to today) */}
                    {editingGoal && (
                       <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                         <div className="relative">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                           <input 
                             type="date"
                             required
                             value={startDate}
                             onChange={(e) => setStartDate(e.target.value)}
                             className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                           />
                         </div>
                       </div>
                    )}
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                      <textarea 
                        rows={editingGoal ? 3 : 2}
                        placeholder="What are you saving for?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      className={`w-full py-3 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/20 ${editingGoal ? 'bg-amber-500' : 'bg-slate-900 dark:bg-blue-600'}`}
                    >
                      {editingGoal ? <Save size={18} /> : <Target size={18} />}
                      <span>{editingGoal ? 'Update Goal' : (activeGoal ? 'Start New Goal' : 'Set Goal')}</span>
                    </button>
                    {!editingGoal && activeGoal && (
                       <p className="text-center text-xs text-slate-400 mt-2">
                         Starting a new goal will mark the current one as completed/ended.
                       </p>
                    )}
                 </form>
              </div>
           </div>

           {/* Right Column: History */}
           <div className="flex-1 bg-slate-50 dark:bg-slate-800/30 p-6 flex flex-col overflow-hidden min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                    <History size={18} />
                    <span className="font-bold text-sm uppercase tracking-wider">Goal History</span>
                 </div>
                 <span className="text-xs font-medium text-slate-400">{goals.length} records</span>
              </div>

              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 pb-4">
                 {sortedGoals.map((goal) => {
                    const isActive = !goal.endDate;
                    const isEditing = editingGoal?.id === goal.id;
                    return (
                      <div 
                        key={goal.id} 
                        className={`p-4 rounded-xl border transition-all group ${
                           isEditing 
                           ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 ring-1 ring-amber-400'
                           : isActive 
                              ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900 shadow-sm' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <div className="text-lg font-bold font-display text-slate-900 dark:text-white">
                                 {formatCurrency(goal.targetAmount)}
                               </div>
                               <div className="mt-1">
                                  {isActive ? (
                                    <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">ACTIVE</span>
                                  ) : (
                                     goal.isAchieved ? (
                                       <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center w-fit">
                                         <CheckCircle2 size={10} className="mr-1" /> REACHED
                                       </span>
                                     ) : (
                                       <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full flex items-center w-fit">
                                         <XCircle size={10} className="mr-1" /> ENDED
                                       </span>
                                     )
                                  )}
                               </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => handleEditClick(goal)}
                                 className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                 title="Edit"
                               >
                                 <Edit2 size={14} />
                               </button>
                               <button 
                                 onClick={() => onRequestDelete(goal.id)}
                                 className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                 title="Delete"
                               >
                                 <Trash2 size={14} />
                               </button>
                            </div>
                         </div>
                         
                         <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-2 mt-2">
                            <Calendar size={12} className="mr-1.5" />
                            <span>{new Date(goal.startDate).toLocaleDateString()}</span>
                            {goal.endDate && (
                              <>
                                <ArrowRight size={12} className="mx-1" />
                                <span>{new Date(goal.endDate).toLocaleDateString()}</span>
                              </>
                            )}
                         </div>

                         {goal.notes && (
                           <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg italic">
                             "{goal.notes}"
                           </p>
                         )}
                      </div>
                    );
                 })}
                 {sortedGoals.length === 0 && (
                   <div className="text-center py-10 text-slate-400 text-sm">
                     No history yet. Set your first goal!
                   </div>
                 )}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default GoalModal;
