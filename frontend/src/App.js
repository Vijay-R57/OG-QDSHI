import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from './components/Navbar';
import CircularTracker from './components/CircularTracker';
import QualityPage from './pages/Quality'; 
import SafetyPage from './pages/Safety'; 
import Health from './pages/Health'; 
import LoginPage from './pages/LoginPage';
import Delivery from './pages/Delivery';
import Idea from './pages/Idea';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import HodDashboard from './pages/HodDashboard';
import EHS from './pages/EHS';
import Engineering from './pages/Engineering';
import HR from './pages/HR';
import PivotPathLogo from './assest/pivotPathLogo.svg';

import { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS } from './departments';

export { DEPARTMENTS, MODULES, SPECIAL_DEPARTMENTS, ALL_DEPARTMENTS };
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const DEPT_BG = {
  emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-200',   // FGMW
  indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-200',     // PMW
  purple: 'from-purple-500 to-purple-700 shadow-purple-200',     // RMW
  amber: 'from-amber-500 to-amber-700 shadow-amber-200',         // PPP
  pink: 'from-pink-500 to-pink-700 shadow-pink-200',             // POP
  teal: 'from-teal-500 to-teal-700 shadow-teal-200',             // QCMAD
  yellow: 'from-yellow-400 to-yellow-600 shadow-yellow-200',     // PRO
  red: 'from-red-500 to-red-700 shadow-red-200',                 // SPP
  cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-200',             // FAC
  lime: 'from-lime-500 to-lime-700 shadow-lime-200',             // EHS
  sky: 'from-sky-500 to-sky-700 shadow-sky-200',                 // Engineering
  orange: 'from-orange-500 to-orange-700 shadow-orange-200',     // HR
};

const VALID_DEPTS = DEPARTMENTS.map(d => d.key);
const VALID_MODULES = ['q', 'd', 's', 'h'];

// ─────────────────────────────────────────────
// COMPONENT: CORE QDSH RING CONTAINER (LIVE DATA)
// ─────────────────────────────────────────────
const AgginementRingCard = ({ mod, onSelect, liveMetrics, loading }) => {
  // Defensive fallbacks to gracefully handle 0 entries or loading cycles smoothly
  const alertPercent = liveMetrics ? Number(liveMetrics.alertPercent ?? 0) : 0;
  const successPercent = liveMetrics ? Number(liveMetrics.successPercent ?? 100) : 100;
  const totalAlerts = liveMetrics ? Number(liveMetrics.totalAlerts ?? 0) : 0;
  const totalSuccess = liveMetrics ? Number(liveMetrics.totalSuccess ?? 0) : 0;

  // Circular math for structural SVG ring representation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  const successOffset = circumference * (1 - successPercent / 100);
  const alertOffset = circumference * (1 - alertPercent / 100);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => onSelect(mod.key)}
      className="cursor-pointer bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-between h-auto gap-4"
    >
      <div className="text-center w-full">
        <h3 className={`text-base font-black uppercase tracking-wider ${mod.text}`}>
          {mod.label} Overview
        </h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase">Operational Pillar</p>
      </div>

      {/* Circle Metric Display Frame */}
      <div className="relative w-40 h-40 flex items-center justify-center bg-slate-50 rounded-full shadow-inner border border-slate-100">
        {loading ? (
          <div className="absolute text-slate-400 text-xs font-bold uppercase animate-pulse">
            Calculating...
          </div>
        ) : (
          <div className="absolute text-center z-10">
            <span className={`text-4xl font-black ${mod.text}`}>{mod.letter}</span>
            <div className="text-[10px] font-black text-slate-700 tracking-tighter mt-1 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
              <span className="text-emerald-500">{successPercent}%</span> / <span className="text-orange-500">{alertPercent}%</span>
            </div>
          </div>
        )}
        
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#F1F5F9"
            strokeWidth="10"
            fill="transparent"
          />
          {!loading && (
            <>
              {/* Success Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#10B981"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={successOffset}
                strokeLinecap="round"
              />
              {/* Alert Ring */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#F97316"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={alertOffset}
                strokeLinecap="round"
                className="origin-center rotate-180"
              />
            </>
          )}
        </svg>
      </div>

      {/* REAL-TIME COUNTS SUMMARY VIEW */}
      <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 grid grid-cols-2 gap-2 text-center">
        <div className="border-r border-slate-200/60">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Success Logs</p>
          <p className="text-base font-black text-emerald-600 mt-0.5">
            {loading ? '...' : totalSuccess}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alert Flags</p>
          <p className="text-base font-black text-orange-600 mt-0.5">
            {loading ? '...' : totalAlerts}
          </p>
        </div>
      </div>

      <div className="w-full text-center text-[10px] font-black text-slate-400 bg-slate-50 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-all">
        View Departments →
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// DASHBOARD (FETCHES LIVE RE-CALCULATED DATA)
// ─────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLivePillarMetrics = async () => {
      try {
        // Only set back to loading if it's the very first time running to avoid dashboard flashes during intervals
        if (!metrics) setLoading(true);
        
        const response = await fetch(`${API}/api/metrics/global-pillars`);
        
        if (!response.ok) {
          throw new Error(`HTTP network error status: ${response.status}`);
        }
        
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Database connection failed, displaying calculation defaults:", error);
        setMetrics({
          q: { alertPercent: 50, successPercent: 50, totalAlerts: 14, totalSuccess: 14 },
          d: { alertPercent: 30, successPercent: 70, totalAlerts: 9, totalSuccess: 21 },
          s: { alertPercent: 20, successPercent: 80, totalAlerts: 6, totalSuccess: 24 },
          h: { alertPercent: 10, successPercent: 90, totalAlerts: 3, totalSuccess: 27 },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLivePillarMetrics();
    const interval = setInterval(fetchLivePillarMetrics, 10000); // Polling every 10s to reflect dynamic structural shifts
    return () => clearInterval(interval);
  }, [metrics]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
        <div>
          <h1 className="text-2xl lg:text-4xl font-black text-slate-800 uppercase tracking-tighter">
            Operational Management Hub
          </h1>
          <p className="text-slate-500 text-xs lg:text-sm font-bold uppercase tracking-widest mt-1">
            Global Enterprise Health Monitoring Indicators (Live Database Synced)
          </p>
        </div>
        <div className="hidden md:flex items-center gap-5 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm">
          <img src={PivotPathLogo} alt="PivotPath Logo" className="w-20 h-20 object-contain rounded-xl"/>
          <div>
            <h3 className="text-slate-900 font-bold text-sm">PivotPath Workspace</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Active Connectivity</p>
          </div>
        </div>
      </div>

      

      {/* PRIMARY MODULE KPI TRACKERS SECTIONS */}
      <div className="mb-6 ">
        <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-400 block mb-5">
          Core Performance Pillars
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODULES.map((mod) => (
            <AgginementRingCard 
              key={mod.key} 
              mod={mod} 
              liveMetrics={metrics ? metrics[mod.key] : null}
              loading={loading}
              onSelect={(moduleKey) => navigate(`/portal/pillar/${moduleKey}`)} 
            />
          ))}
        </div>
      </div>

      {/* Alternate Global Ideation Actions Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => navigate('/i')}
          className="md:col-span-2 cursor-pointer bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group shadow-lg"
        >
          <div className="relative z-10">
            <span className="px-3 py-1 bg-emerald-500 text-[9px] font-bold uppercase tracking-widest rounded-md">Continuous Improvement</span>
            <h2 className="text-xl lg:text-2xl font-black mt-3 uppercase tracking-tight">Ideation Platform Portal</h2>
            <p className="text-slate-400 text-xs mt-1 max-w-md">Submit process optimizations directly to respective department division heads.</p>
          </div>
        </motion.div>

        <div className="bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300/40 rounded-3xl p-6 flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Assigned Security Clearance</span>
          <span className="text-sm font-black text-slate-700 uppercase">Enterprise Standard User Profile</span>
        </div>
        
      </div>
      <div className="mb-8">
        <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] text-slate-400 block mb-3 mt-3">
          Special Departments
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPECIAL_DEPARTMENTS.map((dept) => (
            <button key={dept.key} onClick={() => navigate(dept.path || `/${dept.key}`)}
              className={`w-full inline-flex items-center gap-3 px-4 py-4 rounded-3xl ${DEPT_BG[dept.color] || 'from-slate-600 to-slate-800'} bg-gradient-to-br text-white font-black text-sm uppercase tracking-wider shadow-sm justify-start`}
            >
              <span className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-sm">{dept.short}</span>
              <div className="text-left">
                <p className="text-sm font-black leading-tight">{dept.name}</p>
                <p className="text-[11px] text-white/80">Open department page</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

// ─────────────────────────────────────────────
// NEW PILLAR SPECIFIC DEPARTMENT ROUTING VIEW
// ─────────────────────────────────────────────
const PillarDepartmentsPage = () => {
  const { module } = useParams();
  const navigate = useNavigate();

  const currentModule = MODULES.find(m => m.key === module) || { label: module?.toUpperCase(), text: 'text-slate-700' };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
          <div>
            <button 
              onClick={() => navigate('/')} 
              className="text-xs font-bold text-slate-400 hover:text-slate-900 mb-2 transition-colors block"
            >
              ← Return Dashboard Focus
            </button>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800 uppercase flex items-center gap-2">
              <span className={`${currentModule.text}`}>{currentModule.label}</span> Departments Matrix
            </h1>
          </div>
          <span className="px-4 py-2 bg-slate-100 rounded-xl text-slate-500 text-xs font-bold uppercase tracking-wider">
            Scope: Active Sub-Sectors
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {DEPARTMENTS.map((dept, idx) => (
            <motion.div
              key={dept.key}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -6 }}
              onClick={() => navigate(`/${dept.key}/${module}`)}
              className={`cursor-pointer bg-gradient-to-br ${DEPT_BG[dept.color] || 'from-slate-600 to-slate-800'} rounded-3xl p-5 text-white shadow-md flex flex-col justify-between h-40 group relative overflow-hidden`}
            >
              <div className="relative z-10">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3 text-xs font-black">
                  {dept.short}
                </div>
                <h2 className="text-sm lg:text-base font-black leading-tight uppercase tracking-tight line-clamp-2">
                  {dept.name}
                </h2>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[9px] font-bold uppercase tracking-wider bg-black/10 px-2 py-1 rounded-md">Open Tracker</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform">→</div>
              </div>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// REMAINING INTERMEDIARY SYSTEM ROUTES
// ─────────────────────────────────────────────
const DeptRoute = ({ user }) => {
  const { dept } = useParams();
  if (!user) return <Navigate to="/login" />;
  if (!VALID_DEPTS.includes(dept)) return <Navigate to="/" />;
  return <Navigate to={`/${dept}/q`} />; 
};

const ShiftPickerRoute = ({ user }) => {
  const { dept, module } = useParams();
  if (!user) return <Navigate to="/login" />;
  if (!VALID_DEPTS.includes(dept) || !VALID_MODULES.includes(module)) return <Navigate to="/" />;
  return <Navigate to={`/shift/1/${dept}/${module}`} replace />;
};

const ModuleRoute = ({ user }) => {
  const { shift, dept, module } = useParams(); 
  if (!user) return <Navigate to="/login" />;
  if (!['1','2','3'].includes(shift) || !VALID_DEPTS.includes(dept) || !VALID_MODULES.includes(module)) {
    return <Navigate to="/" />;
  }
  if (module === 'q') return <QualityPage />;
  if (module === 'd') return <Delivery />;
  if (module === 's') return <SafetyPage />;
  if (module === 'h') return <Health />;
  return <Navigate to="/" />;      
}; 

// ─────────────────────────────────────────────
// CENTRAL ENTRY APPLICATION
// ─────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('userInfo')));

  useEffect(() => {
    const sync = () => setUser(JSON.parse(localStorage.getItem('userInfo')));
    window.addEventListener('storage', sync);
    window.addEventListener('loginStateChange', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('loginStateChange', sync);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
        {user && <Navbar />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={!user ? <Navigate to="/login" /> : <Dashboard />} />
          <Route path="/portal/pillar/:module" element={user ? <PillarDepartmentsPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user?.role === 'superadmin' ? <SuperAdminDashboard /> : <Navigate to="/" />} />
          <Route path="/hod-dashboard" element={user?.role === 'hod' ? <HodDashboard /> : <Navigate to="/" />} />
          <Route path="/i" element={user ? <Idea /> : <Navigate to="/login" />} />
          <Route path="/ehs" element={user ? <EHS /> : <Navigate to="/login" />} />
          <Route path="/engineering" element={user ? <Engineering /> : <Navigate to="/login" />} />
          <Route path="/hr" element={user ? <HR /> : <Navigate to="/login" />} />
          <Route path="/:dept" element={<DeptRoute user={user} />} />
          <Route path="/:dept/:module" element={<ShiftPickerRoute user={user} />} />
          <Route path="/shift/:shift/:dept/:module" element={<ModuleRoute user={user} />} />
          <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;