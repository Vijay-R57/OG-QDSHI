import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Star, Maximize2, X, ShieldAlert, AlertTriangle, CheckCircle, Download, Clock, Trash2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import CircularTracker from '../components/CircularTracker';
import { dashboardMetrics as initialData } from '../dashboardData';

const getISTDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

const API_BASE_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/metrics`;
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEPT_FULL = { fg: 'Finished Good Material Warehouse', pm: 'Packing Material Warehouse', rm: 'Raw Material Warehouse' };

const THEME_STYLES = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-800', light: 'bg-emerald-50/20', border: 'border-emerald-100' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-800', light: 'bg-blue-50/20', border: 'border-blue-100' }
};

const SafetyPage = () => {
  const { shift, dept } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Safety Department - QDSHI";
    return () => { document.title = "PivotPath (QDSHI)"; };
  }, []);

  const user = JSON.parse(localStorage.getItem('userInfo'));
  const isSuperAdmin = user?.role === 'superadmin';
  const isSupervisor = user?.role === 'supervisor';
  const userDepts = (user?.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const isAssignedDept = isSuperAdmin || userDepts.includes((dept || '').toLowerCase());
  const canUpdate = (isSupervisor && isAssignedDept) || isSuperAdmin;
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customDate, setCustomDate] = useState(getISTDate);
  const [numSafetyIncidents, setNumSafetyIncidents] = useState(0);
  const [numNearMiss, setNumNearMiss] = useState(0);
  const [numUnsafeActs, setNumUnsafeActs] = useState(0);
  const [peopleAffected, setPeopleAffected] = useState(0);
  const [severity, setSeverity] = useState("Low");

  const [timeLock, setTimeLock] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const viewMonthName = viewDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const viewYear = viewDate.getFullYear();

  // New state for Logs
  const [staffLogs, setStaffLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [tableSyncing, setTableSyncing] = useState({ staff: false, activity: false });
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: null, index: null, rawDate: null });

  useEffect(() => {
    fetch(`${API}/api/timelock/${dept || 'fg'}/${shift || '1'}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTimeLock(d))
      .catch(() => {});
  }, [shift, dept]);

  const handleMonthChange = (offset) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const url = `${API_BASE_URL}?shift=${shift || '1'}&dept=${dept || 'fg'}`;
        const response = await fetch(url);
        const dbData = await response.json();
        if (dbData?.length > 0) {
          const merged = initialData.map(blueprint => {
            const live = dbData.find(d => d.letter === blueprint.letter);
            return live ? { ...blueprint, ...live } : blueprint;
          });
          setMetrics(merged);
          const sLive = dbData.find(d => d.letter === 'S');
          setStaffLogs(sLive?.staffLogs || []);
          setActivityLogs(sLive?.activityLogs || []);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchMetrics();
  }, [shift, dept]);

  const sData = useMemo(() => {
    const found = metrics.find(m => m.letter === 'S') || initialData[2];
    let logs = found?.issueLogs || [];
    if (!Array.isArray(logs)) logs = Object.values(logs);
    return { ...found, issueLogs: logs };
  }, [metrics]);

  const filteredLogs = useMemo(() => {
    return sData.issueLogs.filter(l => {
      if (!l.rawDate) return false;
      const d = new Date(l.rawDate);
      return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewYear;
    }).sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  }, [sData.issueLogs, viewDate, viewYear]);

  const yearlyStats = useMemo(() => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return months.map((month, index) => {
      const monthLogs = sData.issueLogs.filter(l => {
        const d = new Date(l.rawDate);
        return d.getMonth() === index && d.getFullYear() === viewYear;
      });
      return {
        name: month,
        incidents: monthLogs.reduce((sum, l) => sum + (Number(l.numSafetyIncidents) || 0), 0),
        nearMiss: monthLogs.reduce((sum, l) => sum + (Number(l.numNearMiss) || 0), 0),
        unsafeActs: monthLogs.reduce((sum, l) => sum + (Number(l.numUnsafeActs) || 0), 0),
        safe: monthLogs.filter(l => (Number(l.numSafetyIncidents) || 0) === 0).length,
      };
    });
  }, [sData.issueLogs, viewYear]);

  const daysInViewMonth = useMemo(() =>
    new Date(viewYear, viewDate.getMonth() + 1, 0).getDate(),
  [viewDate, viewYear]);

  const dynamicDaysData = useMemo(() => {
    const baseDays = Array(daysInViewMonth).fill("none");
    filteredLogs.forEach(log => {
      const d = new Date(log.rawDate);
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < baseDays.length) {
        baseDays[idx] = (Number(log.numSafetyIncidents) || 0) === 0 ? "success" : "fail";
      }
    });
    return baseDays;
  }, [filteredLogs, daysInViewMonth]);

  const stats = useMemo(() => {
    const totalSafetyIncidents = filteredLogs.reduce((s, l) => s + (Number(l.numSafetyIncidents) || 0), 0);
    const totalNearMiss = filteredLogs.reduce((s, l) => s + (Number(l.numNearMiss) || 0), 0);
    const totalUnsafeActs = filteredLogs.reduce((s, l) => s + (Number(l.numUnsafeActs) || 0), 0);
    const totalAffected = filteredLogs.reduce((sum, l) => sum + (Number(l.affected) || 0), 0);
    const safeDays = dynamicDaysData.filter(s => s === "success").length;
    return { totalSafetyIncidents, totalNearMiss, totalUnsafeActs, totalAffected, safeDays };
  }, [filteredLogs, dynamicDaysData]);

  const anyIncidents = stats.totalSafetyIncidents > 0;

  const handleUpdateSafety = async () => {
    if (!canUpdate) return;

    let updatedLogs = [...sData.issueLogs];
    const [y, m, d] = customDate.split('-');
    const hasSafetyIncident = Number(numSafetyIncidents) > 0;

    const newEntry = {
      date: `${d}/${m}/${y}`,
      rawDate: customDate,
      numSafetyIncidents: Number(numSafetyIncidents),
      numNearMiss: Number(numNearMiss),
      numUnsafeActs: Number(numUnsafeActs),
      affected: hasSafetyIncident ? Number(peopleAffected) : 0,
      severity: hasSafetyIncident ? severity : "None",
      incident: hasSafetyIncident ? "Safety Incident" : "No Incident",
      timestamp: new Date().toISOString()
    };

    const idx = updatedLogs.findIndex(log => log.rawDate === customDate);
    if (idx !== -1) updatedLogs[idx] = newEntry; else updatedLogs.push(newEntry);

    try {
      const res = await fetch(`${API_BASE_URL}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: 'S', shift: shift || '1', dept: dept || 'fgmw', name: 'Safety', issueLogs: updatedLogs, empId: user?.employeeId, empName: user?.name, userRole: user?.role })
      });
      if (res.ok) {
        const saved = await res.json();
        setMetrics(prev => prev.map(m => m.letter === 'S' ? saved : m));
        setIsModalOpen(false);
        setNumSafetyIncidents(0);
        setNumNearMiss(0);
        setNumUnsafeActs(0);
        setPeopleAffected(0);
        setSeverity("Low");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Save failed — check time lock or connection');
      }
    } catch (e) { alert("Sync failed."); }
  };

  const handleLogSubmit = async (type) => {
    setTableSyncing(prev => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: 'S', shift: shift || '1', dept: dept || 'fg',
          logs: type === 'staff' ? staffLogs : activityLogs,
          empId: user?.employeeId,
          empName: user?.name,
          userRole: user?.role,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setMetrics(prev => prev.map(m => m.letter === 'S' ? { ...m, ...result } : m));
        type === 'staff' ? setIsStaffModalOpen(false) : setIsActivityModalOpen(false);
      }
    } catch (e) { alert("Sync failed"); } finally { setTableSyncing(prev => ({ ...prev, [type]: false })); }
  };

  const handleDeleteLog = async () => {
    const { type, index } = deleteConfig;
    if (type === 'staff' || type === 'activity') {
      const setter = type === 'staff' ? setStaffLogs : setActivityLogs;
      const currentLogs = type === 'staff' ? staffLogs : activityLogs;
      const updatedLogs = currentLogs.filter((_, i) => i !== index);

      try {
        const res = await fetch(`${API_BASE_URL}/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            letter: 'S', shift: shift || '1', dept: dept || 'fg', 
            logs: updatedLogs,
            empId: user?.employeeId,
            empName: user?.name,
            userRole: user?.role,
          }),
        });
        if (res.ok) setter(updatedLogs);
      } catch (e) { alert("Delete operation failed."); }
    }
    setDeleteConfig({ isOpen: false, type: null, index: null, rawDate: null });
  };

  const downloadAllShiftsCSV = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}?dept=${dept || 'fgmw'}`);
      const allMetrics = await res.json();
      const sMetric = Array.isArray(allMetrics) ? allMetrics.find(m => m.letter === 'S') : null;
      if (!sMetric) return alert('No data found');

      const viewMonthIdx = viewDate.getMonth();
      const headers = ['Shift', 'Date', 'Safety Incidents', 'Near Miss', 'Unsafe Acts', 'People Affected', 'Severity'];
      const rows = [];
      for (const s of ['1', '2', '3']) {
        const logs = sMetric.shifts?.[s]?.issueLogs || [];
        logs
          .filter(l => {
            if (!l.rawDate) return false;
            const d = new Date(l.rawDate);
            return d.getMonth() === viewMonthIdx && d.getFullYear() === viewYear;
          })
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
          .forEach(l => rows.push([`Shift ${s}`, l.date || l.rawDate, l.numSafetyIncidents ?? 0, l.numNearMiss ?? 0, l.numUnsafeActs ?? 0, l.affected ?? 0, l.severity || '']));
      }
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `Safety_AllShifts_${dept}_${viewMonthName}_${viewYear}.csv`;
      a.click();
    } catch { alert('Failed to download all-shifts data'); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-orange-600 font-black uppercase tracking-widest italic">PivotPath Safety Sync...</div>;

  return (
    <div ref={reportRef} className="min-h-screen bg-[#F0F4F8] text-[#334155] font-sans flex flex-col">

      {deleteConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[320px] p-8 shadow-2xl border border-white/20 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={28} />
            </div>
            <h3 className="text-slate-800 font-black uppercase text-sm tracking-widest mb-2">Confirm Delete</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase leading-relaxed mb-8">
              This action is permanent and will sync with the cloud database immediately.
            </p>
            <div className="space-y-3">
              <button onClick={handleDeleteLog} className="w-full bg-rose-500 hover:bg-rose-600 py-4 rounded-2xl font-black text-white text-[11px] uppercase shadow-lg shadow-rose-100 transition-all active:scale-95">
                Confirm Deletion
              </button>
              <button onClick={() => setDeleteConfig({ isOpen: false, type: null, index: null, rawDate: null })} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-600 transition-colors">
                Nevermind
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#F0F4F8] border-b border-slate-200 sticky top-0 z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-[#475569] font-bold text-xs uppercase hover:text-orange-600 transition-colors">
          <ChevronLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => {
              const headers = ['Date', 'Safety Incidents', 'Near Miss', 'Unsafe Acts', 'People Affected', 'Severity'];
              const rows = sData.issueLogs.map(l => [l.date || l.rawDate, l.numSafetyIncidents, l.numNearMiss, l.numUnsafeActs, l.affected, l.severity]);
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
              a.download = `Safety_Shift${shift}_${dept}.csv`; a.click();
            }}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Shiftwise</span>
          </button>
          <button onClick={downloadAllShiftsCSV}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-all">
            <Download size={13} /> <span className="hidden sm:inline">Overall</span>
          </button>
          {canUpdate && (
            <button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-5 sm:px-7 py-2 rounded-full text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2">
              <span className="hidden sm:inline">Update Logs</span><span className="sm:hidden">Update</span>
            </button>
          )}
        </div>
      </nav>

      <div className="px-4 sm:px-6 mb-4 mt-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Safety — Shift {shift}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{DEPT_FULL[dept] || dept?.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
              <Clock size={13} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shift {shift}</p>
                <p className="text-[11px] font-black text-slate-700">{shift === '1' ? '06:00 – 14:00' : '14:00 – 22:00'}</p>
              </div>
            </div>
            {timeLock?.enabled && (
               <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                 <span className="text-base">⏰</span>
                 <div>
                   <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Save Window</p>
                   <p className="text-[11px] font-black text-amber-800">{timeLock.startTime} – {timeLock.endTime}</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>

      <main className="grid grid-cols-12 gap-5 flex-1 px-4 sm:px-6 pb-4 max-w-[1600px] mx-auto w-full">

        {/* Left Panel */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-6 bg-[#FFF7ED] px-4 py-2 rounded-full border border-orange-100">
            <button onClick={() => handleMonthChange(-1)} className="text-orange-500 hover:scale-110 transition"><ChevronLeft size={20}/></button>
            <span className="text-[11px] font-black text-orange-600 tracking-widest">{viewMonthName} {viewYear}</span>
            <button onClick={() => handleMonthChange(1)} className="text-orange-500 hover:scale-110 transition"><ChevronRight size={20}/></button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <CircularTracker letter="S" daysData={dynamicDaysData} size={220} />
          </div>

          <div className="w-full space-y-3 mt-6">
            <MetricRow label="Safety Incidents" value={stats.totalSafetyIncidents} isRed={stats.totalSafetyIncidents > 0} redText={`${stats.totalSafetyIncidents} incident${stats.totalSafetyIncidents !== 1 ? 's' : ''} reported`} greenText="No safety incidents reported" />
            {anyIncidents && (
              <>
                <MetricRow label="Near Miss Incidents" value={stats.totalNearMiss} isRed={stats.totalNearMiss > 0} redText={`${stats.totalNearMiss} near miss reported`} greenText="No Near Miss Incidents Reported" />
                <MetricRow label="Unsafe Acts / Conditions" value={stats.totalUnsafeActs} isRed={stats.totalUnsafeActs > 0} redText={`${stats.totalUnsafeActs} unsafe act reported`} greenText="No Unsafe Acts / Conditions Reported" />
                <div className="flex justify-between items-center p-3 rounded-xl border bg-slate-50 border-slate-100 font-black uppercase text-[10px] text-slate-500">
                  <span className="tracking-widest opacity-70">People Affected</span><span className="text-xl">{stats.totalAffected}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center p-3 rounded-xl border bg-emerald-50 border-emerald-100 font-black uppercase text-[10px] text-emerald-600">
              <span className="tracking-widest opacity-70">Safe Days</span><span className="text-xl">{stats.safeDays}</span>
            </div>
          </div>
        </div>

        {/* Center Panel — Log Records */}
        <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col gap-5">
          <ChartCard title={`${viewMonthName} LOG RECORDS`}>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 max-h-[360px]">
              <table className="w-full text-[10px] border-separate border-spacing-0">
                <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b">
                  <tr>
                    <th className="p-2 text-left font-black text-slate-400">DATE</th>
                    <th className="p-2 text-center font-black text-slate-400">INCIDENTS</th>
                    <th className="p-2 text-center font-black text-slate-400">NEAR MISS</th>
                    <th className="p-2 text-center font-black text-slate-400">UNSAFE ACTS</th>
                    <th className="p-2 text-center font-black text-slate-400">AFFECTED</th>
                    <th className="p-2 text-center font-black text-slate-400">SEVERITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan="6" className="p-12 text-center text-slate-300 font-bold uppercase italic tracking-widest">No records for this month</td></tr>
                  ) : filteredLogs.map((log, i) => {
                    const isGreen = (Number(log.numSafetyIncidents) || 0) === 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-bold text-slate-500 whitespace-nowrap">{log.date}</td>
                        <td className="p-2 text-center">
                          <span className={`font-black text-[11px] flex items-center justify-center gap-1 ${isGreen ? 'text-emerald-500' : 'text-red-600'}`}>
                            {isGreen ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}{isGreen ? '0' : log.numSafetyIncidents}
                          </span>
                        </td>
                        <td className="p-2 text-center font-bold text-slate-500">{isGreen ? '--' : (log.numNearMiss ?? '--')}</td>
                        <td className="p-2 text-center font-bold text-slate-500">{isGreen ? '--' : (log.numUnsafeActs ?? '--')}</td>
                        <td className="p-2 text-center font-bold text-slate-500">{isGreen ? '--' : (log.affected ?? '--')}</td>
                        <td className="p-2 text-center">
                          {isGreen ? (<span className="text-slate-300 font-bold">--</span>) : (
                            <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${log.severity === 'High' ? 'bg-red-100 text-red-600' : log.severity === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{log.severity}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title={`${viewYear} YEARLY PERFORMANCE`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] text-center border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-slate-400 font-black uppercase">
                    <th className="text-left px-2">MONTH</th>{yearlyStats.map(m => <th key={m.name}>{m.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-50 rounded-lg"><td className="text-left p-2 font-black text-slate-500 uppercase">Incidents</td>{yearlyStats.map((m, i) => <td key={i} className={`font-bold ${m.incidents > 0 ? 'text-red-500 font-black' : 'text-slate-200'}`}>{m.incidents || '--'}</td>)}</tr>
                  <tr className="bg-slate-50 rounded-lg"><td className="text-left p-2 font-black text-slate-500 uppercase">Near Miss</td>{yearlyStats.map((m, i) => <td key={i} className={`font-bold ${m.nearMiss > 0 ? 'text-amber-500 font-black' : 'text-slate-200'}`}>{m.nearMiss || '--'}</td>)}</tr>
                  <tr className="bg-slate-50 rounded-lg"><td className="text-left p-2 font-black text-slate-500 uppercase">Unsafe Acts</td>{yearlyStats.map((m, i) => <td key={i} className={`font-bold ${m.unsafeActs > 0 ? 'text-orange-500 font-black' : 'text-slate-200'}`}>{m.unsafeActs || '--'}</td>)}</tr>
                  <tr className="bg-slate-50 rounded-lg"><td className="text-left p-2 font-black text-slate-500 uppercase">Safe Days</td>{yearlyStats.map((m, i) => <td key={i} className={`font-bold ${m.safe > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>{m.safe || '--'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* Right Panel — Trend Chart */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col gap-5">
          <ChartCard title="MONTHLY INCIDENT TREND">
            <div className="h-[240px] w-full mt-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={yearlyStats} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} />
                  <YAxis fontSize={8} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontWeight: 700 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="incidents" stroke="#EF4444" strokeWidth={3} dot={{ r: 3, fill: '#EF4444' }} name="Safety Incidents" />
                  <Line type="monotone" dataKey="nearMiss" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} name="Near Miss" />
                  <Line type="monotone" dataKey="unsafeActs" stroke="#F97316" strokeWidth={2} dot={{ r: 3, fill: '#F97316' }} name="Unsafe Acts" />
                  <Line type="monotone" dataKey="safe" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: '#10B981' }} name="Safe Days" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              <LegendItem color="bg-red-500" label="Safety Incidents" />
              <LegendItem color="bg-amber-500" label="Near Miss" />
              <LegendItem color="bg-orange-500" label="Unsafe Acts" />
              <LegendItem color="bg-emerald-500" label="Safe Days" />
            </div>
          </ChartCard>

          <div className={`rounded-[2rem] p-6 shadow-sm border text-white ${anyIncidents ? 'bg-red-600 border-red-500' : 'bg-emerald-600 border-emerald-500'}`}>
            <div className="flex items-center gap-2 mb-3">
              {anyIncidents ? <AlertTriangle size={20} /> : <ShieldAlert size={20} />}
              <span className="font-black text-[11px] uppercase tracking-widest">{anyIncidents ? 'Action Required' : 'All Clear'}</span>
            </div>
            <p className="text-sm font-bold opacity-90">
              {anyIncidents ? `${stats.totalSafetyIncidents} safety incident(s) recorded this month. Review and take corrective action.` : 'No safety incidents recorded this month. Keep maintaining safe practices.'}
            </p>
          </div>
        </div>

        {/* TEAM & STAFF COMPLIANCE and OPERATIONAL LOGS */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2">
          <LogContainer title="Team & Staff Compliance" data={staffLogs} type="staff" onOpen={() => { if (!canUpdate) return; setIsStaffModalOpen(true); }} setDeleteConfig={setDeleteConfig} colorTheme="emerald" />
          <LogContainer title="Operational Quality Logs" data={activityLogs} type="activity" onOpen={() => { if (!canUpdate) return; setIsActivityModalOpen(true); }} setDeleteConfig={setDeleteConfig} colorTheme="blue" />
        </div>

      </main>

      {/* --- Modals --- */}
      <EntryModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title="Team Compliance" type="staff" data={staffLogs} 
        onAdd={() => setStaffLogs([{id:"", name:"", action:"", time: getISTTime()}, ...staffLogs])}
        onEdit={(i, f, v) => setStaffLogs(prev => { let u = [...prev]; u[i][f] = v; return u; })}
        setDeleteConfig={setDeleteConfig} onSubmit={() => handleLogSubmit('staff')} syncing={tableSyncing.staff} />

      <EntryModal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title="Operational Activity" type="activity" data={activityLogs} 
        onAdd={() => setActivityLogs([{id:"", name:"", action:"", time: getISTTime()}, ...activityLogs])}
        onEdit={(i, f, v) => setActivityLogs(prev => { let u = [...prev]; u[i][f] = v; return u; })}
        setDeleteConfig={setDeleteConfig} onSubmit={() => handleLogSubmit('activity')} syncing={tableSyncing.activity} />

      {/* Floating All-Shifts CSV download button */}
      <button
        onClick={downloadAllShiftsCSV}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-2xl shadow-orange-200 flex items-center justify-center z-[90] active:scale-95 transition-all"
        title="Download All Shifts CSV (current month)"
      >
        <Download size={22} />
      </button>

      {/* MODAL */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xs tracking-widest uppercase flex items-center gap-2">
                <ShieldAlert size={18} className="text-orange-500" /> UPDATE SAFETY LOG
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              <InputField id="safety-date" label="Date" type="date" value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                max={user?.role === 'supervisor' ? getISTDate() : undefined}
                readOnly={user?.role === 'supervisor'}
                title={user?.role === 'supervisor' ? 'Supervisors can only update today' : ''}
              />

              <div className="space-y-1">
                <label htmlFor="safety-incidents" className="text-[10px] font-black text-slate-400 uppercase ml-2">No. of Safety Incidents</label>
                <input
                  id="safety-incidents"
                  name="numSafetyIncidents"
                  type="number" min="0" value={numSafetyIncidents}
                  onChange={(e) => setNumSafetyIncidents(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm outline-none ring-orange-500 focus:ring-2 transition-all"
                />
                <p className={`text-[10px] font-bold ml-2 mt-0.5 ${Number(numSafetyIncidents) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {Number(numSafetyIncidents) > 0 ? '🔴 Red — Incidents reported' : '🟢 Green — No safety incidents'}
                </p>
              </div>

              {Number(numSafetyIncidents) > 0 && (
                <>
                  <div className="space-y-1">
                    <label htmlFor="safety-nearmiss" className="text-[10px] font-black text-slate-400 uppercase ml-2">No. of Near Miss Incidents</label>
                    <input
                      id="safety-nearmiss"
                      name="numNearMiss"
                      type="number" min="0" value={numNearMiss}
                      onChange={(e) => setNumNearMiss(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm outline-none ring-orange-500 focus:ring-2 transition-all"
                    />
                    <p className={`text-[10px] font-bold ml-2 mt-0.5 ${Number(numNearMiss) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {Number(numNearMiss) > 0 ? '🔴 Near Miss Incidents Reported' : '🟢 No Near Miss Incidents Reported'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="safety-unsafeacts" className="text-[10px] font-black text-slate-400 uppercase ml-2">No. of Unsafe Acts / Conditions</label>
                    <input
                      id="safety-unsafeacts"
                      name="numUnsafeActs"
                      type="number" min="0" value={numUnsafeActs}
                      onChange={(e) => setNumUnsafeActs(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm outline-none ring-orange-500 focus:ring-2 transition-all"
                    />
                    <p className={`text-[10px] font-bold ml-2 mt-0.5 ${Number(numUnsafeActs) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {Number(numUnsafeActs) > 0 ? '🔴 Unsafe Acts / Conditions Reported' : '🟢 No Unsafe Acts / Conditions Reported'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField id="safety-affected" label="No. of People Affected" type="number" value={peopleAffected} onChange={(e)=>setPeopleAffected(e.target.value)} placeholder="0" />
                    <div className="space-y-1">
                      <label htmlFor="safety-severity" className="text-[10px] font-black text-slate-400 uppercase ml-2">Severity</label>
                      <select id="safety-severity" name="severity" value={severity} onChange={(e)=>setSeverity(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm ring-orange-500 focus:ring-2 transition-all">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button onClick={handleUpdateSafety} className="w-full bg-orange-600 py-5 rounded-2xl font-black text-white shadow-lg hover:bg-orange-700 transition-all uppercase text-xs mt-4 active:scale-95">
                Save Daily Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Green/Red metric row
const MetricRow = ({ label, value, isRed, redText, greenText }) => (
  <div className={`p-3 rounded-xl border font-black uppercase text-[10px] ${isRed ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
    <div className="flex justify-between items-center">
      <span className="tracking-widest opacity-70">{label}</span>
      <div className={`w-2 h-2 rounded-full ${isRed ? 'bg-red-500' : 'bg-emerald-500'}`} />
    </div>
    <p className="text-[9px] font-bold mt-1 opacity-80 normal-case">
      {isRed ? redText : greenText}
    </p>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="text-[9px] font-black text-slate-500 uppercase">{label}</span>
  </div>
);

const InputField = ({ label, id, ...props }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase ml-2">{label}</label>
    <input id={id} name={id} {...props} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm outline-none ring-orange-500 focus:ring-2 transition-all" />
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-white font-black uppercase text-[9px] tracking-widest text-slate-400">
      <div className="flex items-center gap-2"><Star size={14} className="text-orange-500" /> {title}</div>
      <Maximize2 size={12} className="text-slate-200" />
    </div>
    <div className="p-5 flex-1 flex flex-col min-h-0">{children}</div>
  </div>
);

// --- Reusable Log Subcomponents ---

const TableContent = ({ data, type, onEdit, readonly, setDeleteConfig }) => {
  const isStaff = type === 'staff';
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="overflow-x-auto flex-1 flex flex-col">
        <div className="min-w-[360px] flex flex-col flex-1">
          <div className="px-3 sm:px-8 py-3 bg-slate-50 grid grid-cols-5 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100 shrink-0">
            <span className="truncate">ID</span><span className="truncate">Name</span><span className="col-span-2 truncate">Details</span><span className="text-right truncate">Del</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {data.length === 0 ? (
              <div className="p-8 text-center text-slate-300 text-[10px] font-bold">No entries yet. Click "+ New Entry" to add one.</div>
            ) : (
              data.map((log, i) => (
                <div key={i} className={`grid grid-cols-5 py-3 items-center group px-3 sm:px-8 transition-colors ${i === 0 && (!log.id && !log.name && !log.action) ? 'bg-blue-50/40 border-l-4 border-blue-500' : 'hover:bg-slate-50/50'}`}>
                  <input disabled={readonly} className={`text-[10px] font-black bg-transparent outline-none truncate mr-1 min-w-0 ${isStaff ? 'text-emerald-600' : 'text-blue-600'}`} value={log.id} onChange={(e) => onEdit && onEdit(i, 'id', e.target.value)} />
                  <input disabled={readonly} className="text-[10px] font-bold text-slate-700 bg-transparent outline-none truncate mr-1 min-w-0" value={log.name} onChange={(e) => onEdit && onEdit(i, 'name', e.target.value)} />
                  <div className="col-span-2 flex items-center gap-1 min-w-0 overflow-hidden">
                    <input disabled={readonly} className="text-[9px] font-bold text-slate-400 uppercase bg-transparent outline-none min-w-0 truncate flex-1" value={log.action} onChange={(e) => onEdit && onEdit(i, 'action', e.target.value)} />
                    <span className="text-[9px] text-slate-300 shrink-0">{log.time}</span>
                  </div>
                  <div className="text-right shrink-0">
                    {!readonly && (
                      <button onClick={() => setDeleteConfig({ isOpen: true, type, index: i })} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><Trash2 size={13}/></button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LogContainer = ({ title, data, type, onOpen, colorTheme, setDeleteConfig }) => {
  const theme = THEME_STYLES[colorTheme];
  return (
    <div className="bg-white rounded-[2.5rem] shadow-md border-2 border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
      <div className={`px-8 py-5 flex justify-between items-center border-b-2 border-slate-100 ${theme.light}`}>
        <h3 className={`font-black text-[11px] uppercase ${theme.text}`}>{title}</h3>
        <button onClick={onOpen} className={`${theme.bg} text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-md transition-all active:scale-95 hover:shadow-lg hover:scale-105 duration-200`}>Update</button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <TableContent data={data.slice(0, 8)} type={type} readonly setDeleteConfig={setDeleteConfig} />
      </div>
      {data.length > 8 && (
        <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">+{data.length - 8} more records</p>
        </div>
      )}
    </div>
  );
};

const EntryModal = ({ isOpen, onClose, title, type, data, onAdd, onEdit, onSubmit, syncing, setDeleteConfig }) => {
  const tableRef = useRef(null);
  if (!isOpen) return null;
  const theme = THEME_STYLES[type === 'staff' ? 'emerald' : 'blue'];

  const handleAddNewEntry = () => {
    onAdd();
    setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollTop = 0;
      }
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl flex flex-col h-[85vh] shadow-2xl">
        <div className={`p-8 border-b flex justify-between items-center ${theme.light}`}>
          <h2 className={`font-black ${theme.text} uppercase text-[12px]`}>{title}</h2>
          <button onClick={handleAddNewEntry} className={`${theme.bg} text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95 hover:shadow-xl`}>+ New Entry</button>
        </div>
        <div className="flex-1 overflow-y-auto" ref={tableRef}>
          <TableContent data={data} type={type} onEdit={onEdit} setDeleteConfig={setDeleteConfig} />
        </div>
        <div className="p-8 border-t flex items-center gap-6">
          <button onClick={onClose} className="font-black text-slate-400 text-[10px] uppercase">Discard</button>
          <button onClick={onSubmit} className={`flex-1 ${theme.bg} text-white py-4 rounded-2xl font-black text-[11px] uppercase transition-all active:scale-95`}>
            {syncing ? "Syncing..." : "Save and Push to Cloud"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyPage;
