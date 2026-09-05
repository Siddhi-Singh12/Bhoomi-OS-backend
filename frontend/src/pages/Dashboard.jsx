import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import JudgeDemoBar from '../components/JudgeDemoBar';
import { useLanguage } from '../context/LanguageContext';
import { Plus, ScanLine, MapPin, Bell, Layers, ShieldCheck, ChevronRight, Activity, Sprout, Search, Zap } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
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
    <div className="min-h-screen bg-[#F7F7F2]">
      <AppHeader farmer={farmer} />

      {isJudgeDemo && (
        <JudgeDemoBar
          currentStep={2}
          totalSteps={6}
          nextLabel={t('pipelineNext_2')}
          onNext={handleDemoNext}
          onExit={handleExitDemo}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>{t('registeredHoldings')}</span>
              <Sprout className="w-4 h-4 text-[#14532D]" />
            </div>
            <p className="text-2xl font-black text-[#17211B] font-mono">{farms.length}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{t('cadastralPlotsLinked')}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>{t('totalAreaMonitored')}</span>
              <Layers className="w-4 h-4 text-[#14532D]" />
            </div>
            <p className="text-2xl font-black text-[#17211B] font-mono">
              {totalHectares.toFixed(2)} <span className="text-sm font-normal text-gray-500">ha</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{t('postgisArea')}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>{t('communityAlerts')}</span>
              <Bell className="w-4 h-4 text-[#E88A1A]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#E88A1A] font-mono">2 km</span>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs text-[#14532D] font-bold hover:underline"
              >
                {t('viewMap')}
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{t('villagePerimeterMonitor')}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
              <span>{t('telemetryEngine')}</span>
              <Activity className="w-4 h-4 text-[#14532D]" />
            </div>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#2F7D32]"></span>
              Copernicus S-2 L2A
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{t('opticalResolution')}</p>
          </div>
        </div>

        {/* Section Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-950">{t('agriculturalLandHoldings')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t('dashboardSubtext')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 w-48 sm:w-56"
              />
            </div>
            <button
              onClick={() => navigate('/add-farm')}
              className="bg-[#14532D] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f3d20] transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addNewFarm')}</span>
            </button>
          </div>
        </div>

        {/* Farms Grid / Empty State */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-[#14532D] border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading registered cadastral parcels from PostGIS...
          </div>
        ) : farms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">{t('noFarmsTitle')}</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
              {t('noFarmsSubtext')}
            </p>
            <button
              onClick={() => navigate('/add-farm')}
              className="bg-[#14532D] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#0f3d20] transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addNewFarm')}
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
                      ? 'border-[#14532D] ring-2 ring-[#14532D]/40 shadow-lg bg-emerald-50/10'
                      : 'border-gray-200/80 hover:border-[#14532D]/60 hover:shadow-md'
                  }`}
                >
                  <div>
                    {isTargetDemoFarm && (
                      <div className="mb-2 bg-emerald-100/90 text-emerald-950 border border-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between font-mono">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-700" />
                          {t('fastTrackTarget')}
                        </span>
                        <span className="text-[10px] text-emerald-800 uppercase font-semibold">{t('inspectParcel')}</span>
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

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#14532D] transition">
                      {farm.crop_type || 'Mixed Agricultural Crop'}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Cadastral Boundary Sealed (PostGIS 4326)</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/alerts?farm_id=${farm.id}`);
                      }}
                      className="text-gray-500 hover:text-[#E88A1A] font-medium flex items-center gap-1 transition"
                      title="View 2 km Village Alert Cluster for this holding"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#E88A1A]" />
                      <span>2 km Alerts</span>
                    </button>

                    <span className="text-[#14532D] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>{t('scanField')}</span>
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