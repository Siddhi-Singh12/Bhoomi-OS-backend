import { useNavigate } from 'react-router-dom';

export default function AppHeader({ farmer }) {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center text-white text-lg">
          🌱
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">BHOOMI OS</h1>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
              AgriStack
            </span>
          </div>
          <p className="text-xs text-gray-400">Satellite Crop Stress Detection & Insurance System</p>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-sm">
        <button onClick={() => navigate('/dashboard')} className="text-emerald-700 font-semibold flex items-center gap-1.5">
          📊 Crop Scanner
        </button>
        <button onClick={() => navigate('/alerts')} className="text-gray-500 hover:text-gray-800 flex items-center gap-1.5">
          🔔 Village Alerts
        </button>
        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          Live Engine
        </span>
      </nav>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{farmer?.name}</p>
          <p className="text-xs text-gray-400">{farmer?.phone}</p>
        </div>
        <button
          onClick={() => { localStorage.clear(); navigate('/'); }}
          className="text-xs text-red-500 hover:underline"
        >
          Logout
        </button>
      </div>
    </header>
  );
}