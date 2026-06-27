import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Save, Edit3, X, Activity } from 'lucide-react';
import axios from 'axios';
import logo from '../assest/pivotPathLogo.svg';
import PageLoader from '../components/PageLoader';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 30 }, (_, i) => 2021 + i); // 30 years from 2021 to 2050

export default function PlantDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState(null); // { rowId, monthIndex }
  const [editForm, setEditForm] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/plant-dashboard/${year}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Plant Dashboard - QDSHI";
    fetchData();
    return () => { document.title = "PivotPath (QDSHI)"; };
  }, [year]);

  const handleEditClick = (row, mIndex, monthData) => {
    if (!editMode) return;
    setEditingCell({ rowId: row._id, monthIndex: mIndex });
    setEditForm({
      planValue: monthData.plan.value || '',
      actualValue: monthData.actual.value || '',
      textColor: monthData.actual.textColor || 'black',
      arrowDir: monthData.actual.arrowDir || 'none',
      arrowColor: monthData.actual.arrowColor || 'black'
    });
  };

  const handleSaveCell = async () => {
    try {
      const row = data.find(r => r._id === editingCell.rowId);
      const updatedMonths = [...row.months];
      updatedMonths[editingCell.monthIndex] = {
        ...updatedMonths[editingCell.monthIndex],
        plan: { value: editForm.planValue },
        actual: {
          value: editForm.actualValue,
          textColor: editForm.textColor,
          arrowDir: editForm.arrowDir,
          arrowColor: editForm.arrowColor
        }
      };

      const res = await axios.put(`${API}/api/plant-dashboard/${row._id}`, { months: updatedMonths });
      setData(data.map(r => r._id === row._id ? res.data : r));
      setEditingCell(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save cell data');
    }
  };

  return (
    <PageLoader loading={loading}>
    <div className="min-h-screen bg-slate-100 p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-50 px-8 py-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <img src={logo} alt="PivotPath Logo" className="h-10" />
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Activity className="text-emerald-500" /> Performance Dashboard of PivotPath - {year}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={year} 
              onChange={e => setYear(Number(e.target.value))}
              className="bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2 outline-none focus:border-emerald-500 transition-colors"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black uppercase text-[11px] shadow-md transition-all active:scale-95 ${editMode ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
            >
              {editMode ? <><X size={14} /> Exit Edit Mode</> : <><Edit3 size={14} /> Edit Data</>}
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto p-6">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-sky-900 text-white text-[10px] uppercase font-black tracking-wider">
                <th className="border border-slate-600 p-3 text-left w-64 bg-emerald-800">Key Performance Indicator</th>
                <th className="border border-slate-600 p-3 text-center w-16 bg-emerald-900">UoM</th>
                <th className="border border-slate-600 p-3 text-center w-24">Plan Vs Actual</th>
                <th className="border border-slate-600 p-3 text-center w-20">YTD '{String(year).slice(-2)} AVG</th>
                {MONTHS.map(m => (
                  <th key={m} className="border border-slate-600 p-3 text-center w-24">{m} '{String(year).slice(-2)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {data.map((row, i) => (
                <React.Fragment key={row._id}>
                  {/* Plan Row */}
                  <tr className="bg-sky-100/50">
                    <td className="border border-slate-300 p-3 text-slate-700 row-span-2 bg-slate-50" rowSpan={2}>{row.kpi}</td>
                    <td className="border border-slate-300 p-3 text-center text-slate-500 row-span-2 bg-slate-50" rowSpan={2}>{row.uom}</td>
                    <td className="border border-slate-300 p-2 text-center text-sky-700 bg-sky-200/50 font-black">Plan</td>
                    <td className="border border-slate-300 p-2 text-center text-sky-700 bg-sky-200/50" rowSpan={2}>
                       {/* YTD Avg - can be editable later if needed */}
                       <div className="flex items-center justify-center h-full">-</div>
                    </td>
                    {row.months.map((m, mIndex) => (
                      <td 
                        key={mIndex} 
                        className={`border border-slate-300 p-2 text-center cursor-pointer transition-colors ${editMode ? 'hover:bg-sky-200' : ''}`}
                        onClick={() => handleEditClick(row, mIndex, m)}
                      >
                        {m.plan.value || '-'}
                      </td>
                    ))}
                  </tr>
                  {/* Actual Row */}
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center text-slate-600 bg-slate-200/50 font-black">Actual</td>
                    {row.months.map((m, mIndex) => (
                      <td 
                        key={mIndex} 
                        className={`border border-slate-300 p-2 text-center cursor-pointer transition-colors ${editMode ? 'hover:bg-slate-200' : ''}`}
                        onClick={() => handleEditClick(row, mIndex, m)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span style={{ color: m.actual.textColor === 'red' ? '#ef4444' : m.actual.textColor === 'green' ? '#10b981' : '#334155' }}>
                            {m.actual.value || '-'}
                          </span>
                          {m.actual.arrowDir === 'up' && <ArrowUp size={12} color={m.actual.arrowColor === 'red' ? '#ef4444' : m.actual.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
                          {m.actual.arrowDir === 'down' && <ArrowDown size={12} color={m.actual.arrowColor === 'red' ? '#ef4444' : m.actual.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
                        </div>
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-black uppercase text-slate-800 mb-6 flex items-center justify-between">
              Edit Cell Data
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-rose-500 transition"><X size={20}/></button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-sky-600 uppercase mb-1 block">Plan Value</label>
                <input 
                  type="text" 
                  value={editForm.planValue} 
                  onChange={e => setEditForm({...editForm, planValue: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-sky-500"
                  placeholder="Enter plan value..."
                />
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black text-slate-600 uppercase mb-1 block">Actual Value</label>
                <input 
                  type="text" 
                  value={editForm.actualValue} 
                  onChange={e => setEditForm({...editForm, actualValue: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-slate-500"
                  placeholder="Enter actual value..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Text Color</label>
                  <select 
                    value={editForm.textColor} 
                    onChange={e => setEditForm({...editForm, textColor: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none"
                  >
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Arrow Dir</label>
                  <select 
                    value={editForm.arrowDir} 
                    onChange={e => setEditForm({...editForm, arrowDir: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none"
                  >
                    <option value="none">None</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              </div>

              {editForm.arrowDir !== 'none' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Arrow Color</label>
                  <select 
                    value={editForm.arrowColor} 
                    onChange={e => setEditForm({...editForm, arrowColor: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none"
                  >
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                  </select>
                </div>
              )}
            </div>

            <button 
              onClick={handleSaveCell}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-4 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
    </PageLoader>
  );
}
