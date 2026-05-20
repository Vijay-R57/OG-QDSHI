import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CircularTracker from './CircularTracker';

const MetricCard = ({ data, monthData }) => {
  const navigate = useNavigate();

   const handleRedirect = () => {
    navigate(`/${data.letter.toLowerCase()}`);
  };

  return (
    <motion.div 
      onClick={handleRedirect}
      whileHover={{ y: -5 }}  
      className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center cursor-pointer transition-shadow hover:shadow-xl"
    >
      <h2 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-4 uppercase">
        {data.label}
      </h2> 

      <div className="mb-6">
        <CircularTracker letter={data.letter} daysData={monthData} />
      </div>

       <div className="text-center pt-4 border-t border-slate-50 w-full">
        <div className="text-3xl font-black text-slate-800">{data.value}</div>
        <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">{data.unit}</div>
      </div>
    </motion.div>
  );
};

export default MetricCard;