import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import JudgeDemoBar from '../components/JudgeDemoBar';
import { Plus, ScanLine, MapPin, Bell, Layers, ShieldCheck, ChevronRight, Activity, Sprout, Search, Zap } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const isJudgeDemo = localStorage.getItem('judgeDemo') === 'true' || location.search.includes('demo=judge');

  useEffect(() => {
    if (!farmer.id) {
      navigate('/');
      return;
    }
    loadFarms();
  }, []);

  async function loadFarms() {
    try {
      const res = await apiClient.get(`/farms?farmer_id=${farmer.id}`);
      setFarms(res.data.farms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleDemoNext() {
    // Advance to Step 2: Open Farm #1 Wheat
    const targetFarm = farms.find(f => f.id === 1) || farms[0];
    const targetId = targetFarm ? targetFarm.id : 1;
    navigate(`/farm/${targetId}?demo=judge`);
  }

  function handleExitDemo() {
    localStorage.removeItem('judgeDemo');
    navigate('/dashboard');
  }

  const totalHectares = farms.reduce((acc, f) => acc + (parseFloat(f.area_hectares) || 0), 0);
  const filteredFarms = farms.filter((f) =>
    (f.crop_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(f.id).includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-50/70">
      <AppHeader farmer={farmer} />

      {isJudgeDemo && (
        <JudgeDemoBar
          currentStep={2}
          totalSteps={6}
          nextLabel="Verify Cadastral Parcel #1"
          onNext={handleDemoNext}
          onExit={handleExitDemo}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>Registered Holdings</span>
              <Sprout className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono">{farms.length}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">Cadastral plots linked</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>Total Area Monitored</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900 font-mono">
              {totalHectares.toFixed(2)} <span className="text-sm font-normal text-gray-500">ha</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">Surface area in PostGIS</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>Community Alerts</span>
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700 font-mono">Active</span>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                View Map →
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">Village perimeter monitor</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>Telemetry Engine</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Copernicus S-2 L2A
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">10m Optical Multi-Spectral</p>
          </div>
        </div>

        {/* Section Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-950">Agricultural Land Holdings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select any registered cadastral plot to run multi-spectral stress analysis and generate PMFBY claim evidence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by crop or plot #..."
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 w-48 sm:w-56"
              />
            </div>
            <button
              onClick={() => navigate('/add-farm')}
              className="bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-900 transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Farm</span>
            </button>
          </div>
        </div>

        {/* Farms Grid / Empty State */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading registered cadastral parcels from PostGIS...
          </div>
        ) : farms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">No Farm Holdings Registered Yet</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
              Draw your farm boundary on our high-resolution satellite map or import official cadastral geometry directly from AgriStack.
            </p>
            <button
              onClick={() => navigate('/add-farm')}
              className="bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-900 transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Map Your First Farm Boundary
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFarms.map((farm) => {
              const isTargetDemoFarm = isJudgeDemo && (farm.id === 1 || (farm.crop_type || '').toLowerCase().includes('wheat'));
              return (
                <div
                  key={farm.id}
                  onClick={() => navigate(`/farm/${farm.id}${isJudgeDemo ? '?demo=judge' : ''}`)}
                  className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                    isTargetDemoFarm
                      ? 'border-emerald-500 ring-2 ring-emerald-500/60 shadow-lg bg-emerald-50/10'
                      : 'border-gray-200/80 hover:border-emerald-600/60 hover:shadow-md'
                  }`}
                >
                  <div>
                    {isTargetDemoFarm && (
                      <div className="mb-2 bg-emerald-100/90 text-emerald-950 border border-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between font-mono">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-700" />
                          Fast-Track Adjudication Target
                        </span>
                        <span className="text-[10px] text-emerald-800 uppercase font-semibold">Inspect Parcel ›</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                    <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Plot #{farm.id}
                    </span>
                    <span className="text-xs text-gray-400 font-mono font-medium">
                      {farm.area_hectares} ha
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-800 transition">
                    {farm.crop_type || 'Mixed Agricultural Crop'}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Cadastral Boundary Sealed (PostGIS 4326)</span>
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px] font-medium">
                    Ready for Telemetry Audit
                  </span>
                  <span className="text-emerald-800 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Scan Field</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </main>
    </div>
  );
}