import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { Sprout, ScanLine, Bell, ShieldCheck, LogOut, Radio, User, Zap, Plane, Layers, QrCode } from 'lucide-react';

export default function AppHeader({ farmer }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/farm');
  const isPanchayat = location.pathname === '/panchayat';
  const isDronePlanner = location.pathname === '/drone-planner';
  const isAlerts = location.pathname === '/alerts';
  const isVerify = location.pathname.startsWith('/verify');
  const isJudgeDemo = localStorage.getItem('judgeDemo') === 'true' || location.search.includes('demo=judge');

  function handleTriggerDemo() {
    localStorage.setItem('judgeDemo', 'true');
    navigate('/dashboard?demo=judge');
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-gray-950">
                BHOOMI INTELLIGENCE
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md font-semibold tracking-wide">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                AgriStack + PostGIS
              </span>
            </div>
            <p className="text-[11px] text-gray-500 tracking-tight font-medium">
              Multi-Resolution Satellite & Drone Precision Decision Support
            </p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1.5 text-xs">
          <button
            onClick={handleTriggerDemo}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              isJudgeDemo
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-xs ring-1 ring-emerald-400/50'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100'
            }`}
            title="Launch automated PMFBY claim adjudication pipeline"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Fast-Track</span>
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isDashboard && !isJudgeDemo
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-emerald-600" />
            <span>Field Scanner</span>
          </button>

          <button
            onClick={() => navigate('/panchayat')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isPanchayat
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Panchayat Intel</span>
          </button>

          <button
            onClick={() => navigate('/drone-planner')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isDronePlanner
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-orange-600" />
            <span>Drone Planner</span>
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isAlerts
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>Village Alerts</span>
          </button>

          <button
            onClick={() => navigate('/verify/1')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isVerify
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verify Proof</span>
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1"></div>

          <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            S-2 + Drone UAV
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector variant="light" />

          <div className="text-right hidden sm:block border-l border-gray-200 pl-3">
            <div className="flex items-center justify-end gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-900">{farmer?.name || 'Ravi Kumar'}</p>
            </div>
            <p className="text-[11px] font-mono text-gray-500">{farmer?.agristack_id || 'AGR-IND-88219'}</p>
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              navigate('/');
            }}
            title="Sign out of session"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
