import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { UserCircle, LogOut, LayoutDashboard, Settings2 } from 'lucide-react';
import logo from '../assest/arcolabLogo.jpg';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const DEPT_SHORT = { fg: 'FG Warehouse', pm: 'PM Warehouse', rm: 'RM Warehouse' };
const MODULE_LABEL = { q: 'Quality', d: 'Delivery', s: 'Safety', h: 'Health' };

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('userInfo'));

  // Parse current shift/dept/module from URL
  // URL pattern: /shift/:shift/:dept/:module  or /:dept/:module
  const pathParts = location.pathname.split('/').filter(Boolean);
  let currentDept   = null;
  let currentShift  = null;
  let currentModule = null;

  if (pathParts[0] === 'shift' && pathParts.length >= 4) {
    currentShift  = pathParts[1];
    currentDept   = pathParts[2];
    currentModule = pathParts[3];
  } else if (pathParts.length === 2 && ['fg','pm','rm'].includes(pathParts[0])) {
    currentDept   = pathParts[0];
    currentModule = pathParts[1];
  } else if (pathParts.length === 1 && ['fg','pm','rm'].includes(pathParts[0])) {
    currentDept   = pathParts[0];
  }

  const handleLogout = () => {
    // Log the logout event (excluding superadmin)
    if (user && user.role !== 'superadmin') {
      fetch(`${API}/api/loginlog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:  user._id  || '',
          empId:   user.employeeId || '',
          empName: user.name || '',
          role:    user.role || '',
          dept:    user.department || '',
          action:  'logout',
        }),
      }).catch(() => {});
    }
    localStorage.removeItem('userInfo');
    window.dispatchEvent(new Event("storage"));
    navigate('/login');
  };

  return (
    <nav className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <img src={logo} alt="Arcolab Logo" className="h-10 w-auto" />
          <span className="text-lg font-bold text-slate-800 hidden sm:block">QDSHI Tracker</span>
        </Link>

        {/* Breadcrumb context: dept → shift → module */}
        {currentDept && (
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="text-slate-300">/</span>
            <button onClick={() => navigate('/')} className="hover:text-slate-600 transition">{DEPT_SHORT[currentDept] || currentDept.toUpperCase()}</button>
            {currentModule && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-600">{MODULE_LABEL[currentModule] || currentModule.toUpperCase()}</span>
              </>
            )}
            {currentShift && (
              <>
                <span className="text-slate-300">/</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">Shift {currentShift}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            {user.role === 'superadmin' && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition uppercase tracking-tighter"
              >
                <LayoutDashboard size={15} /> Admin
              </Link>
            )}
            {user.role === 'hod' && (
              <Link
                to="/hod-dashboard"
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition uppercase tracking-tighter"
              >
                <Settings2 size={15} /> Supervisors
              </Link>
            )}

            <div className="flex items-center gap-2 border-l pl-3 border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                <p className="text-xs font-black text-slate-800">{user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-full transition font-bold text-xs"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition"
          >
            <UserCircle size={18} />
            <span className="font-medium text-sm">Login</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
