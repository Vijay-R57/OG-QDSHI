import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, X, Save, ChevronLeft, ChevronRight, Lock, CheckCircle2, ShieldAlert, Clock, Download } from 'lucide-react';
import axios from 'axios';
// IST timezone helpers
const getISTDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const getISTTime = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEPT_FULL = { fg: 'Finished Good Material Warehouse', pm: 'Packing Material Warehouse', rm: 'Raw Material Warehouse' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Health = () => {
  const { shift, dept } = useParams();
  const navigate = useNavigate();

  const user        = JSON.parse(localStorage.getItem('userInfo')) || { role: 'supervisor' };
  const isSuperAdmin = user.role === 'superadmin';
  const isSupervisor = user.role === 'supervisor';
  const userDepts    = (user.department || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const isAssignedDept = isSuperAdmin || userDepts.includes((dept || '').toLowerCase());
  const canUpdate    = (isSupervisor && isAssignedDept) || isSuperAdmin;
  const reportRef    = useRef(null);

  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const currentYear = new Date().getFullYear();
  const currentMonthName = MONTHS[currentMonthIndex];

  const [notification, setNotification]       = useState({ show: false, message: '', type: '' });
  const [allMonthsData, setAllMonthsData]     = useState(() => {
    const init = {};
    MONTHS.forEach(m => {
      init[m] = Array.from({ length: 31 }, (_, i) => ({
        date: i + 1, status: null, keypoints: '', attendance: '', attendees: null, totalStrength: null,
      }));
    });
    return init;
  });

  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [selectedDay, setSelectedDay]         = useState(null);
  const [formData, setFormData]               = useState({ status: '', keypoints: '', attendees: '', totalStrength: '' });

  // Time lock (replaces old cutoff system)
  const [timeLock, setTimeLock] = useState(null);

  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  // Fetch health data
  useEffect(() => {
    const fetchMonthData = async () => {
      try {
        const { data } = await axios.get(`${API}/api/health`, {
          params: { month: currentMonthName, year: currentYear, dept: dept || 'fg', shift: shift || '1' },
        });
        if (data?.days?.length > 0) {
          setAllMonthsData(prev => ({ ...prev, [currentMonthName]: data.days }));
        } else {
          setAllMonthsData(prev => ({
            ...prev,
            [currentMonthName]: Array.from({ length: 31 }, (_, i) => ({
              date: i + 1, status: null, keypoints: '', attendance: '', attendees: null, totalStrength: null,
            })),
          }));
        }
      } catch {
        setAllMonthsData(prev => ({
          ...prev,
          [currentMonthName]: Array.from({ length: 31 }, (_, i) => ({
            date: i + 1, status: null, keypoints: '', attendance: '', attendees: null, totalStrength: null,
          })),
        }));
      }
    };
    fetchMonthData();
  }, [currentMonthName, currentYear, shift, dept]);

  // Fetch time lock for this dept+shift
  useEffect(() => {
    fetch(`${API}/api/timelock/${dept || 'fg'}/${shift || '1'}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setTimeLock(d))
      .catch(() => {});
  }, [dept, shift]);

  // --- helpers ---

  const isOutsideTimeLock = () => {
    if (!timeLock?.enabled || isSuperAdmin) return false;
    const istTime = getISTTime(); // HH:MM in IST
    const [nowH, nowM] = istTime.split(':').map(Number);
    const nowMins = nowH * 60 + nowM;
    const [sh, sm] = timeLock.startTime.split(':').map(Number);
    const [eh, em] = timeLock.endTime.split(':').map(Number);
    return nowMins < sh * 60 + sm || nowMins > eh * 60 + em;
  };

  const isCurrentDay = (dayDate) => {
    const istDate = getISTDate(); // YYYY-MM-DD
    const [yr, mo, dy] = istDate.split('-').map(Number);
    return dayDate === dy && currentMonthName === MONTHS[mo - 1] && currentYear === yr;
  };

  const calcAttendance = (attendees, totalStrength) => {
    const a = Number(attendees), t = Number(totalStrength);
    if (!a || !t || t === 0) return null;
    return Math.round((a / t) * 100);
  };

  // --- handlers ---

  const handleSave = async () => {
    if (!canUpdate) return;
    const attendancePct = formData.status !== 'holiday'
      ? calcAttendance(formData.attendees, formData.totalStrength)
      : null;
    const payload = {
      month: currentMonthName, year: currentYear,
      dept: dept || 'fgmw', shift: shift || '1',
      date: selectedDay.date, status: formData.status,
      keypoints: formData.keypoints,
      attendance: attendancePct != null ? String(attendancePct) : '',
      attendees:     formData.attendees     !== '' ? Number(formData.attendees)     : null,
      totalStrength: formData.totalStrength !== '' ? Number(formData.totalStrength) : null,
      userRole: user.role,
      empId:   user?.employeeId,
      empName: user?.name,
    };
    try {
      await axios.post(`${API}/api/health/update`, payload);
      const updated = allMonthsData[currentMonthName].map(item =>
        item.date === selectedDay.date
          ? { ...item, status: formData.status, keypoints: formData.keypoints,
              attendance: payload.attendance, attendees: payload.attendees, totalStrength: payload.totalStrength }
          : item,
      );
      setAllMonthsData({ ...allMonthsData, [currentMonthName]: updated });
      setIsModalOpen(false);
      showNotify('Entry Secured & Locked Successfully', 'success');
    } catch (err) {
      showNotify(err.response?.data?.message || 'System Error: Unable to Save', 'error');
    }
  };

  const openEntryModal = (day) => {
    if (!canUpdate) {
      showNotify('Access Denied: You are not the Health Supervisor', 'error');
      return;
    }
    if (isSupervisor && !isCurrentDay(day.date)) {
      showNotify('Supervisors can only update today\'s entry', 'error');
      return;
    }
    if (day.status && !canUpdate) {
      showNotify('Security Lock: Only authorized personnel can modify entries', 'error');
      return;
    }
    if (isOutsideTimeLock()) {
      showNotify(`Outside save window (${timeLock.startTime}–${timeLock.endTime}). Contact Super Admin.`, 'error');
      return;
    }
    setSelectedDay(day);
    setFormData({
      status:        day.status        || '',
      keypoints:     day.keypoints     || '',
      attendees:     day.attendees     != null ? String(day.attendees)     : '',
      totalStrength: day.totalStrength != null ? String(day.totalStrength) : '',
    });
    setIsModalOpen(true);
  };

  const downloadCSV = () => {
    const days = allMonthsData[currentMonthName];
    const headers = ['Date', 'Month', 'Status', 'Key Points / Observations', 'Attendees', 'Total Strength', 'Attendance %'];
    const rows = days.filter(d => d.status).map(d => {
      const pct = d.status === 'meeting' ? calcAttendance(d.attendees, d.totalStrength) : '';
      return [d.date, currentMonthName, d.status, d.keypoints || '', d.attendees ?? '', d.totalStrength ?? '', pct ?? ''];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Health_${dept}_Shift${shift}_${currentMonthName}_${currentYear}.csv`;
    a.click();
  };

  const downloadAllShiftsCSV = async () => {
    try {
      const shiftsData = await Promise.all(
        ['1', '2', '3'].map(s =>
          axios.get(`${API}/api/health`, {
            params: { month: currentMonthName, year: currentYear, dept: dept || 'fgmw', shift: s },
          }).then(r => ({ shift: s, days: r.data?.days || [] })).catch(() => ({ shift: s, days: [] }))
        )
      );
      const headers = ['Shift', 'Date', 'Status', 'Key Points / Observations', 'Attendees', 'Total Strength', 'Attendance %'];
      const rows = [];
      for (const { shift: s, days } of shiftsData) {
        days.filter(d => d.status).forEach(d => {
          const pct = d.status === 'meeting' ? calcAttendance(d.attendees, d.totalStrength) : '';
          rows.push([`Shift ${s}`, d.date, d.status, d.keypoints || '', d.attendees ?? '', d.totalStrength ?? '', pct ?? '']);
        });
      }
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `Health_AllShifts_${dept}_${currentMonthName}_${currentYear}.csv`;
      a.click();
    } catch { alert('Failed to download all-shifts data'); }
  };

  const isMeeting           = formData.status === 'meeting';
  const attendancePctPreview = isMeeting ? calcAttendance(formData.attendees, formData.totalStrength) : null;
  const isFormInvalid       = !formData.status ||
    (isMeeting && (!formData.attendees || !formData.totalStrength || !formData.keypoints.trim()));

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-8 duration-500">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border-t border-white/10 min-w-[320px] ${
            notification.type === 'error'
              ? 'bg-slate-900/95 border-rose-500/50 text-rose-400'
              : 'bg-slate-900/95 border-emerald-500/50 text-emerald-400'
          }`}>
            <div className={`p-2 rounded-full ${notification.type === 'error' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
              {notification.type === 'error' ? <ShieldAlert size={24}/> : <CheckCircle2 size={24}/>}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">Security System</p>
              <p className="font-bold tracking-tight text-sm text-white">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Clean sticky nav */}
      <nav className="flex justify-between items-center px-4 sm:px-6 py-3 bg-[#f8fafc] border-b border-slate-200 sticky top-0 z-50">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-[#475569] font-bold text-xs uppercase hover:text-emerald-600 transition-colors">
          <ChevronLeft size={18}/> <span className="hidden sm:inline">Back</span>
        </button>
        <button onClick={downloadCSV}
          className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-full font-bold text-xs shadow-sm transition-all">
          <Download size={13}/> <span className="hidden sm:inline">Shiftwise</span>
        </button>
      </nav>

      {/* Title card with month nav on right */}
      <div className="px-4 sm:px-6 mb-4 mt-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Health — Shift {shift}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{DEPT_FULL[dept] || dept?.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Shift time badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full">
              <Clock size={13} className="text-blue-500 shrink-0"/>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shift {shift}</p>
                <p className="text-[11px] font-black text-slate-700">{shift === '1' ? '06:00 – 14:00' : '14:00 – 22:00'}</p>
              </div>
            </div>
            {/* Month navigation */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-full p-1">
              <button onClick={() => setCurrentMonthIndex(prev => prev === 0 ? 11 : prev - 1)} className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-800 transition-all"><ChevronLeft size={16}/></button>
              <span className="px-3 font-black uppercase tracking-widest text-[10px] text-center text-slate-700 min-w-[90px]">
                {currentMonthName.slice(0,3)} <span className="text-slate-400">{currentYear}</span>
              </span>
              <button onClick={() => setCurrentMonthIndex(prev => prev === 11 ? 0 : prev + 1)} className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-800 transition-all"><ChevronRight size={16}/></button>
            </div>
            {/* TimeLock */}
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

      {/* GRID */}
      <div ref={reportRef} className="flex-1 px-4 sm:px-6 pb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-5">
        {allMonthsData[currentMonthName].map((item) => {
          const isTimeLocked = isCurrentDay(item.date) && isOutsideTimeLock();
          const isLocked     = (item.status && !isSuperAdmin) || !canUpdate || isTimeLocked;

          let colorClass = 'bg-white border-slate-100 text-slate-400';
          if (item.status === 'meeting')    colorClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 border-transparent';
          if (item.status === 'no-meeting') colorClass = 'bg-rose-500 text-white shadow-lg shadow-rose-200 border-transparent';
          if (item.status === 'holiday')    colorClass = 'bg-slate-800 text-white shadow-lg shadow-slate-300 border-transparent';
          if (isTimeLocked && !item.status) colorClass = 'bg-amber-50 border-amber-200 text-amber-500';

          const pct = item.status === 'meeting' ? calcAttendance(item.attendees, item.totalStrength) : null;

          return (
            <div
              key={item.date}
              onClick={() => openEntryModal(item)}
              className={`group relative cursor-pointer rounded-[2rem] h-40 p-5 transition-all duration-300 border-2 hover:scale-[1.03] flex flex-col justify-between ${colorClass} ${isLocked ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-black text-2xl tracking-tighter">{item.date}</span>
                {isLocked
                  ? <Lock size={16} className="opacity-40"/>
                  : isTimeLocked
                    ? <Clock size={16} className="text-amber-400"/>
                    : <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                }
              </div>
              <div className="overflow-hidden">
                {item.status ? (
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase leading-tight truncate tracking-wide">{item.keypoints || item.status}</p>
                    {item.status === 'meeting' && (
                      <div className="space-y-0.5">
                        {item.attendees != null && item.totalStrength != null && (
                          <p className="text-[9px] font-bold opacity-80">{item.attendees}/{item.totalStrength}</p>
                        )}
                        {pct != null && <p className="text-[10px] font-bold opacity-80 italic">{pct}%</p>}
                      </div>
                    )}
                  </div>
                ) : isTimeLocked ? (
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Outside save window</p>
                ) : (
                  <div className="h-1 w-8 bg-slate-100 rounded-full group-hover:w-12 transition-all"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      </div>{/* end grid wrapper */}

      {/* Floating All-Shifts CSV download button */}
      <button
        onClick={downloadAllShiftsCSV}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl shadow-emerald-200 flex items-center justify-center z-[90] active:scale-95 transition-all"
        title="Download All Shifts CSV (current month)"
      >
        <Download size={22} />
      </button>

      {/* MODAL */}
      {isModalOpen && canUpdate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.25)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-0 flex justify-between items-center">
              <div>
                <h2 className="font-black uppercase tracking-widest text-xs text-slate-400">Data Transmission</h2>
                <p className="text-2xl font-black text-slate-900">{selectedDay?.date} {currentMonthName}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-6">

              {/* Status selector */}
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                {['meeting', 'no-meeting', 'holiday'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFormData({ ...formData, status: s })}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      formData.status === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Meeting fields */}
              {formData.status === 'meeting' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number" min="0" placeholder="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                        value={formData.attendees}
                        onChange={e => setFormData({ ...formData, attendees: e.target.value })}
                      />
                      <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">Attendees</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number" min="0" placeholder="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 font-black text-xl outline-none focus:border-slate-900 transition-all"
                        value={formData.totalStrength}
                        onChange={e => setFormData({ ...formData, totalStrength: e.target.value })}
                      />
                      <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.15em]">Total Strength</label>
                    </div>
                  </div>

                  {attendancePctPreview != null && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Attendance</span>
                      <span className="text-2xl font-black text-emerald-700">{attendancePctPreview}%</span>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      placeholder="Input findings..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 h-32 font-bold text-sm outline-none focus:border-slate-900 transition-all resize-none"
                      value={formData.keypoints}
                      onChange={e => setFormData({ ...formData, keypoints: e.target.value })}
                    />
                    <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Observations</label>
                  </div>
                </div>
              )}

              {/* No-meeting fields */}
              {formData.status === 'no-meeting' && (
                <div className="animate-in slide-in-from-bottom-4">
                  <div className="relative">
                    <textarea
                      placeholder="Reason for no meeting..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pt-7 h-28 font-bold text-sm outline-none focus:border-slate-900 transition-all resize-none"
                      value={formData.keypoints}
                      onChange={e => setFormData({ ...formData, keypoints: e.target.value })}
                    />
                    <label className="absolute top-3 left-4 text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Notes</label>
                  </div>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isFormInvalid}
                className={`w-full font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 ${
                  isFormInvalid
                    ? 'bg-slate-100 text-slate-300'
                    : 'bg-slate-900 text-white shadow-2xl shadow-slate-300 hover:bg-black hover:-translate-y-1'
                }`}
              >
                <Save size={16}/> {isFormInvalid ? 'Incomplete Data' : 'Secure Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Health;
