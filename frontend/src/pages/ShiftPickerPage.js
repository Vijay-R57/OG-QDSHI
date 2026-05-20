import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DEPARTMENTS, MODULES } from '../App';

const SHIFT_COLORS = {
  '1': { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', shadow: 'shadow-emerald-200/50', label: 'Morning Shift' },
  '2': { bg: 'bg-blue-600',    hover: 'hover:bg-blue-700',    shadow: 'shadow-blue-200/50',    label: 'Afternoon Shift' },
  '3': { bg: 'bg-violet-600',  hover: 'hover:bg-violet-700',  shadow: 'shadow-violet-200/50',  label: 'Night Shift' },
};

const ShiftPickerPage = ({ dept, module }) => {
  const navigate = useNavigate();

  // Find info from global constants
  const deptInfo   = DEPARTMENTS.find(d => d.key === dept) || { name: dept?.toUpperCase(), short: dept?.toUpperCase() };
  const moduleInfo = MODULES.find(m => m.key === module)   || { label: module?.toUpperCase(), letter: module?.toUpperCase() };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Arcolab QDSHI Tracker</p>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 opacity-80">{deptInfo.name}</p>
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">{moduleInfo.label}</h1>
        <div className="w-12 h-1 bg-slate-200 mx-auto mt-4 rounded-full" />
        <p className="text-slate-500 text-sm font-medium mt-4">Select a shift to view or update data</p>
      </motion.div>

      {/* Shift Selection Grid */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl mt-4">
        {['1', '2', '3'].map((shift, i) => {
          const color = SHIFT_COLORS[shift];
          return (
            <motion.button
              key={shift}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1, type: 'spring' }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/shift/${shift}/${dept}/${module}`)}
              className={`flex-1 ${color.bg} ${color.hover} text-white rounded-3xl py-12 flex flex-col items-center gap-4 shadow-2xl ${color.shadow} transition-all group`}
            >
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                 <span className="text-5xl font-black">{shift}</span>
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">{color.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col items-center gap-4 mt-12">
        <button
          onClick={() => navigate(`/${dept}`)}
          className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-800 transition-colors flex items-center gap-2"
        >
          <span>←</span> Back to {deptInfo.short} Modules
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="text-slate-300 text-[10px] font-bold uppercase tracking-widest hover:text-slate-500 transition-colors"
        >
          Main Dashboard
        </button>
      </div>

    </div>
  );
};

export default ShiftPickerPage;