import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Save, Edit3, X, Activity, Download } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ExcelJS from 'exceljs';
import logo from '../assest/pivotPathLogo.svg';
import PageLoader from '../components/PageLoader';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const FIN_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const YEARS = Array.from({ length: 30 }, (_, i) => 2021 + i); // 30 years from 2021 to 2050

export default function PlantDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [editingCell, setEditingCell] = useState(null); // { rowId, monthIndex }
  const [editForm, setEditForm] = useState(null);
  const [editingYtd, setEditingYtd] = useState(null); // { rowId }
  const [ytdForm, setYtdForm] = useState(null);

  const getSortedMonths = (row) => {
    return FIN_MONTHS.map(fm => {
      const idx = row.months.findIndex(m => m.monthName === fm);
      return { 
        m: idx !== -1 ? row.months[idx] : { monthName: fm, plan: {}, actual: {} }, 
        mIndex: Math.max(0, idx) 
      };
    });
  };

  const downloadPDF = async () => {
    const input = document.getElementById('dashboard-table-container');
    if (!input) return;
    
    // Temporarily fix styles for html2canvas
    const origOverflow = input.style.overflow;
    const origWidth = input.style.width;
    
    input.style.overflow = 'visible';
    input.style.width = 'max-content';

    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const finalWidth = pdfWidth - 10;
      const finalHeight = (canvas.height * finalWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 5, 5, finalWidth, finalHeight);
      pdf.save(`Plant_Dashboard_${year}.pdf`);
    } finally {
      // Restore styles
      input.style.overflow = origOverflow;
      input.style.width = origWidth;
    }
  };

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dashboard');
    
    const headers = ['Key Performance Indicator', 'UoM', 'Plan Vs Actual', 'YTD AVG', ...FIN_MONTHS];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    
    data.forEach(row => {
      const sorted = getSortedMonths(row);
      // Plan row — include YTD plan
      const planYtd = row.ytd?.plan?.value || '-';
      worksheet.addRow([row.kpi, row.uom, 'Plan', planYtd, ...sorted.map(s => s.m.plan?.value || '-')]);
      
      const ytdActualVal = row.ytd?.actual?.value || '-';
      const actualRowValues = [row.kpi, row.uom, 'Actual', ytdActualVal];
      const textColors = [];  // per-cell text color
      const arrowColors = []; // per-cell arrow color
      
      sorted.forEach(s => {
        let val = s.m.actual?.value || '-';
        let txtColor = null;
        let arwColor = null;
        if (val !== '-') {
           if (s.m.actual?.arrowDir === 'up') val += ' ↑';
           if (s.m.actual?.arrowDir === 'down') val += ' ↓';
           if (s.m.actual?.textColor === 'red') txtColor = 'FFFF0000';
           else if (s.m.actual?.textColor === 'green') txtColor = 'FF00B050';
           // Arrow color is separate from text color
           if (s.m.actual?.arrowDir !== 'none' && s.m.actual?.arrowDir) {
             if (s.m.actual?.arrowColor === 'red') arwColor = 'FFFF0000';
             else if (s.m.actual?.arrowColor === 'green') arwColor = 'FF00B050';
           }
        }
        actualRowValues.push(val);
        textColors.push(txtColor);
        arrowColors.push(arwColor);
      });
      
      const actualRow = worksheet.addRow(actualRowValues);
      // Apply text color (font color for the whole cell uses textColor)
      textColors.forEach((color, i) => {
        const cell = actualRow.getCell(5 + i);
        // Use text color; if arrow color differs we note it in a comment
        const arwColor = arrowColors[i];
        if (color) {
          cell.font = { color: { argb: color }, bold: true };
        }
        // If arrow color differs from text color, add a note via cell comment
        if (arwColor && arwColor !== color) {
          cell.note = { texts: [{ text: `Arrow color: ${arwColor === 'FFFF0000' ? 'Red' : 'Green'}` }] };
        }
      });
    });
    
    worksheet.columns.forEach(col => col.width = 15);
    worksheet.getColumn(1).width = 30;
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Plant_Dashboard_${year}.xlsx`;
    a.click();
  };

  const downloadAllExcel = async () => {
    try {
      const res = await axios.get(`${API}/api/plant-dashboard/`);
      const allData = res.data;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dashboard');
      
      const headers = ['Year', 'Key Performance Indicator', 'UoM', 'Plan Vs Actual', 'YTD AVG', ...FIN_MONTHS];
      worksheet.addRow(headers);
      worksheet.getRow(1).font = { bold: true };
      
      allData.forEach(row => {
        const sorted = FIN_MONTHS.map(fm => {
          const idx = row.months.findIndex(m => m.monthName === fm);
          return idx !== -1 ? row.months[idx] : { plan: {}, actual: {} };
        });
        
        const planYtd = row.ytd?.plan?.value || '-';
        worksheet.addRow([row.year, row.kpi, row.uom, 'Plan', planYtd, ...sorted.map(s => s.plan?.value || '-')]);
        
        const ytdActualVal = row.ytd?.actual?.value || '-';
        const actualRowValues = [row.year, row.kpi, row.uom, 'Actual', ytdActualVal];
        const textColors = [];
        const arrowColors = [];
        
        sorted.forEach(s => {
          let val = s.actual?.value || '-';
          let txtColor = null;
          let arwColor = null;
          if (val !== '-') {
             if (s.actual?.arrowDir === 'up') val += ' ↑';
             if (s.actual?.arrowDir === 'down') val += ' ↓';
             if (s.actual?.textColor === 'red') txtColor = 'FFFF0000';
             else if (s.actual?.textColor === 'green') txtColor = 'FF00B050';
             if (s.actual?.arrowDir !== 'none' && s.actual?.arrowDir) {
               if (s.actual?.arrowColor === 'red') arwColor = 'FFFF0000';
               else if (s.actual?.arrowColor === 'green') arwColor = 'FF00B050';
             }
          }
          actualRowValues.push(val);
          textColors.push(txtColor);
          arrowColors.push(arwColor);
        });
        
        const actualRow = worksheet.addRow(actualRowValues);
        textColors.forEach((color, i) => {
          const cell = actualRow.getCell(6 + i);
          const arwColor = arrowColors[i];
          if (color) {
            cell.font = { color: { argb: color }, bold: true };
          }
          if (arwColor && arwColor !== color) {
            cell.note = { texts: [{ text: `Arrow color: ${arwColor === 'FFFF0000' ? 'Red' : 'Green'}` }] };
          }
        });
      });
      
      worksheet.columns.forEach(col => col.width = 15);
      worksheet.getColumn(2).width = 30;
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Plant_Dashboard_All_Years.xlsx`;
      a.click();
    } catch (err) {
      console.error(err);
      alert('Failed to download overall data');
    }
  };

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

  const handleYtdClick = (row) => {
    if (!editMode) return;
    setEditingYtd({ rowId: row._id });
    setYtdForm({
      planValue: row.ytd?.plan?.value || '',
      actualValue: row.ytd?.actual?.value || '',
      textColor: row.ytd?.actual?.textColor || 'black',
      arrowDir: row.ytd?.actual?.arrowDir || 'none',
      arrowColor: row.ytd?.actual?.arrowColor || 'black'
    });
  };

  const handleSaveYtd = async () => {
    try {
      const row = data.find(r => r._id === editingYtd.rowId);
      const res = await axios.put(`${API}/api/plant-dashboard/${row._id}`, {
        ytd: {
          plan: { value: ytdForm.planValue },
          actual: {
            value: ytdForm.actualValue,
            textColor: ytdForm.textColor,
            arrowDir: ytdForm.arrowDir,
            arrowColor: ytdForm.arrowColor
          }
        }
      });
      setData(data.map(r => r._id === row._id ? res.data : r));
      setEditingYtd(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save YTD data');
    }
  };

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
            <div className="flex items-center gap-2 mr-2">
              <button onClick={downloadExcel} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                <Download size={12} /> Excel (Year)
              </button>
              <button onClick={downloadAllExcel} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                <Download size={12} /> Excel (All)
              </button>
              <button onClick={downloadPDF} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                <Download size={12} /> PDF
              </button>
            </div>
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
        <div id="dashboard-table-container" className="overflow-x-auto p-6 bg-white">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-sky-900 text-white text-[10px] uppercase font-black tracking-wider">
                <th className="border border-slate-600 p-3 text-left w-64 bg-emerald-800">Key Performance Indicator</th>
                <th className="border border-slate-600 p-3 text-center w-16 bg-emerald-900">UoM</th>
                <th className="border border-slate-600 p-3 text-center w-24">Plan Vs Actual</th>
                <th className="border border-slate-600 p-3 text-center w-20">YTD '{String(year).slice(-2)} AVG</th>
                {FIN_MONTHS.map(m => (
                  <th key={m} className="border border-slate-600 p-3 text-center w-24">
                    {m} '{m === 'Jan' || m === 'Feb' || m === 'Mar' ? String(year + 1).slice(-2) : String(year).slice(-2)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold">
              {data.map((row, i) => (
                <React.Fragment key={row._id}>
                  {/* Plan Row */}
                  <tr className="bg-sky-100/50">
                    <td className="border border-slate-300 border-b-0 p-3 text-slate-700 bg-slate-50 align-bottom pb-1">{row.kpi}</td>
                    <td className="border border-slate-300 border-b-0 p-3 text-center text-slate-500 bg-slate-50 align-bottom pb-1">{row.uom}</td>
                    <td className="border border-slate-300 p-2 text-center text-sky-700 bg-sky-200/50 font-black">Plan</td>
                    {/* YTD Plan cell - clickable in edit mode */}
                    <td
                      className={`border border-slate-300 border-b-0 p-2 text-center bg-sky-100/80 text-sky-800 font-bold ${editMode ? 'cursor-pointer hover:bg-sky-200' : ''}`}
                      onClick={() => handleYtdClick(row)}
                    >
                      {row.ytd?.plan?.value || '-'}
                    </td>
                    {getSortedMonths(row).map(({ m, mIndex }, i) => (
                      <td 
                        key={i} 
                        className={`border border-slate-300 p-2 text-center cursor-pointer transition-colors ${editMode ? 'hover:bg-sky-200' : ''}`}
                        onClick={() => handleEditClick(row, mIndex, m)}
                      >
                        {m.plan?.value || '-'}
                      </td>
                    ))}
                  </tr>
                  {/* Actual Row */}
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 border-t-0 p-3 bg-slate-50"></td>
                    <td className="border border-slate-300 border-t-0 p-3 bg-slate-50"></td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600 bg-slate-200/50 font-black">Actual</td>
                    {/* YTD Actual cell - clickable in edit mode */}
                    <td
                      className={`border border-slate-300 border-t-0 p-2 text-center bg-sky-100/80 ${editMode ? 'cursor-pointer hover:bg-sky-200' : ''}`}
                      onClick={() => handleYtdClick(row)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span style={{ color: row.ytd?.actual?.textColor === 'red' ? '#ef4444' : row.ytd?.actual?.textColor === 'green' ? '#10b981' : '#334155' }}>
                          {row.ytd?.actual?.value || '-'}
                        </span>
                        {row.ytd?.actual?.arrowDir === 'up' && <ArrowUp size={12} color={row.ytd?.actual?.arrowColor === 'red' ? '#ef4444' : row.ytd?.actual?.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
                        {row.ytd?.actual?.arrowDir === 'down' && <ArrowDown size={12} color={row.ytd?.actual?.arrowColor === 'red' ? '#ef4444' : row.ytd?.actual?.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
                      </div>
                    </td>
                    {getSortedMonths(row).map(({ m, mIndex }, i) => (
                      <td 
                        key={i} 
                        className={`border border-slate-300 p-2 text-center cursor-pointer transition-colors ${editMode ? 'hover:bg-slate-200' : ''}`}
                        onClick={() => handleEditClick(row, mIndex, m)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span style={{ color: m.actual?.textColor === 'red' ? '#ef4444' : m.actual?.textColor === 'green' ? '#10b981' : '#334155' }}>
                            {m.actual?.value || '-'}
                          </span>
                          {m.actual?.arrowDir === 'up' && <ArrowUp size={12} color={m.actual?.arrowColor === 'red' ? '#ef4444' : m.actual?.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
                          {m.actual?.arrowDir === 'down' && <ArrowDown size={12} color={m.actual?.arrowColor === 'red' ? '#ef4444' : m.actual?.arrowColor === 'green' ? '#10b981' : '#334155'} strokeWidth={4} />}
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
      {/* YTD Edit Modal */}
      {editingYtd && ytdForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-lg font-black uppercase text-slate-800 mb-6 flex items-center justify-between">
              Edit YTD AVG
              <button onClick={() => setEditingYtd(null)} className="text-slate-400 hover:text-rose-500 transition"><X size={20}/></button>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-sky-600 uppercase mb-1 block">YTD Plan Value</label>
                <input type="text" value={ytdForm.planValue} onChange={e => setYtdForm({...ytdForm, planValue: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-sky-500" placeholder="Enter YTD plan value..." />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="text-[10px] font-black text-slate-600 uppercase mb-1 block">YTD Actual Value</label>
                <input type="text" value={ytdForm.actualValue} onChange={e => setYtdForm({...ytdForm, actualValue: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-slate-500" placeholder="Enter YTD actual value..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Text Color</label>
                  <select value={ytdForm.textColor} onChange={e => setYtdForm({...ytdForm, textColor: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none">
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Arrow Dir</label>
                  <select value={ytdForm.arrowDir} onChange={e => setYtdForm({...ytdForm, arrowDir: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none">
                    <option value="none">None</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              </div>
              {ytdForm.arrowDir !== 'none' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Arrow Color</label>
                  <select value={ytdForm.arrowColor} onChange={e => setYtdForm({...ytdForm, arrowColor: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none">
                    <option value="black">Black</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                  </select>
                </div>
              )}
            </div>
            <button onClick={handleSaveYtd}
              className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-4 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95">
              <Save size={16} /> Save YTD
            </button>
          </div>
        </div>
      )}
    </div>
    </PageLoader>
  );
}
