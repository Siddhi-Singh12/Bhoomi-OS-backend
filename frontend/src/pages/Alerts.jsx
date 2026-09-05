import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import VillageAlertMap from '../components/VillageAlertMap';
import { useLanguage } from '../context/LanguageContext';
import {
  Bell,
  ShieldAlert,
  MapPin,
  Users,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Radio,
  Sprout,
  CheckCircle2,
  ChevronRight,
  Layers,
} from 'lucide-react';

export default function Alerts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');

  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sourceFarm, setSourceFarm] = useState(null);
  const [nearbyFarms, setNearbyFarms] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // 1. Check authentication & load farmer's registered holdings
  useEffect(() => {
    if (!farmer.id) {
      navigate('/');
      return;
    }
    loadFarmerFarms();
  }, [farmer.id]);

  async function loadFarmerFarms() {
    try {
      setLoading(true);
      const res = await apiClient.get('/farms', { params: { farmer_id: farmer.id } });
      const farmList = res.data.farms || [];
      setFarms(farmList);

      // Determine initial active farm from URL query param ?farm_id= or first farm in list
      const queryParams = new URLSearchParams(location.search);
      const paramFarmId = queryParams.get('farm_id');
      const targetFarm = farmList.find((f) => String(f.id) === String(paramFarmId)) || farmList[0];

      if (targetFarm) {
        setSelectedFarmId(targetFarm.id);
      }
    } catch (err) {
      console.error('Failed to load farmer holdings:', err);
    } finally {
      setLoading(false);
    }
  }

  // 2. Fetch scoped alerts & PostGIS 2km contiguous farms when selectedFarmId changes
  useEffect(() => {
    if (!selectedFarmId) return;
    loadFarmScopedAlerts(selectedFarmId);
  }, [selectedFarmId]);

  async function loadFarmScopedAlerts(farmId) {
    try {
      setLoadingAlerts(true);
      const res = await apiClient.get('/alerts', { params: { farm_id: farmId } });

      const fetchedAlerts = res.data.alerts || [];
      const fetchedNearby = res.data.nearbyFarms || [];
      const fetchedSource = res.data.sourceFarm || farms.find((f) => f.id === farmId) || null;

      setAlerts(fetchedAlerts);
      setNearbyFarms(fetchedNearby);
      setSourceFarm(fetchedSource);

      if (fetchedAlerts.length > 0) {
        setSelectedAlert(fetchedAlerts[0]);
      } else {
        setSelectedAlert(null);
      }
    } catch (err) {
      console.error('Failed to load farm-scoped alerts:', err);
      setAlerts([]);
      setNearbyFarms([]);
      setSelectedAlert(null);
    } finally {
      setLoadingAlerts(false);
    }
  }

  const currentFarm = sourceFarm || farms.find((f) => f.id === selectedFarmId);

  return (
    <div className="min-h-screen bg-[#F7F7F2]">
      <AppHeader farmer={farmer} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('backToDashboard', 'Back to Dashboard')}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-[#17211B] tracking-tight flex items-center gap-2">
                <Bell className="w-6 h-6 text-[#E88A1A]" />
                {t('villageAlerts', 'Village-Level Calamity Alerts')}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                PostGIS 2.0 km geodesic perimeter monitoring scoped to{' '}
                <strong className="text-[#14532D]">{farmer.name || 'Current Farmer'}</strong>
                's registered holdings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full font-mono">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                2.0 km PostGIS Cluster Active
              </span>
            </div>
          </div>
        </div>

        {/* Farmer Parcel Switcher Tabs */}
        {farms.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-[#14532D]" />
                Registered Holdings ({farms.length})
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                Cadastral Plots in AgriStack
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {farms.map((f) => {
                const isSelected = f.id === selectedFarmId;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFarmId(f.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#14532D] text-white shadow-xs ring-2 ring-[#2F7D32]/50'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-gray-400'
                      }`}
                    ></span>
                    <span>
                      Plot #{f.id} — {f.crop_type} ({f.area_hectares} ha)
                    </span>
                    {f.location_name && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-[#0f3d20] text-emerald-200' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {f.location_name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Dynamic Geospatial Perimeter Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-gray-800">
              <Radio className="w-4 h-4 text-red-600" />
              Live Geospatial Calamity Perimeter (2 km PostGIS Buffer)
            </span>
            <span className="font-mono text-[11px] text-gray-500">
              Active Focus: Plot #{selectedFarmId || '...'} ({currentFarm?.crop_type || 'Crop'})
            </span>
          </div>

          {currentFarm ? (
            <VillageAlertMap
              alert={selectedAlert}
              sourceFarm={currentFarm}
              nearbyFarms={nearbyFarms}
              radiusKm={2}
              scenarioType={selectedAlert?.alert_type || 'DROUGHT'}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-500">
              Loading parcel geometry and PostGIS spatial cluster...
            </div>
          )}
        </div>

        {/* Alert Cards Feed / Scoped Status */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 font-mono">
              Plot #{selectedFarmId} Calamity Events ({alerts.length})
            </h2>
            {currentFarm && (
              <button
                onClick={() => navigate(`/farm/${currentFarm.id}`)}
                className="text-xs font-bold text-[#14532D] hover:text-[#2F7D32] flex items-center gap-1"
              >
                <span>Audit Plot #{currentFarm.id} in Field Scanner</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loadingAlerts ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
              Loading farm-specific alerts and spatial buffer...
            </div>
          ) : alerts.length === 0 ? (
            /* Honest, dynamic zero-alert status card for this specific farm */
            <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                      NOMINAL HEALTH STATUS
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      Plot #{selectedFarmId} · {currentFarm?.crop_type || 'Crop'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 font-semibold">
                    No active localized calamity alerts triggered on this cadastral parcel.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Sentinel-2 multi-spectral NDVI and hydration indices are within normal seasonal
                    parameters. Contiguous holdings ({nearbyFarms.length} adjacent parcels within 2 km)
                    are monitored.
                  </p>
                </div>
              </div>

              {currentFarm && (
                <button
                  onClick={() => navigate(`/farm/${currentFarm.id}`)}
                  className="bg-[#14532D] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#2F7D32] transition shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <span>Simulate Calamity Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`bg-white rounded-2xl border p-5 transition cursor-pointer hover:shadow-md ${
                  selectedAlert?.id === alert.id
                    ? 'border-[#C62828] ring-2 ring-[#C62828]/20 shadow-xs'
                    : 'border-gray-200/90 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      {alert.alert_type}
                    </span>
                    <span className="text-xs text-gray-700 font-bold font-mono">
                      Radius: {alert.radius_km || 2.0} km
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm font-bold text-gray-900 mb-3">{alert.message}</p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      Source Farm: <strong>#{alert.source_farm_id}</strong>
                    </span>
                    <span>
                      Crop: <strong>{alert.crop_type || currentFarm?.crop_type || 'Crop'}</strong>
                    </span>
                    <span>
                      Farmer: <strong>{farmer.name || alert.farmer_name || 'Farmer'}</strong>
                    </span>
                    <span>
                      Contiguous Impact:{' '}
                      <strong className="text-[#14532D]">
                        {nearbyFarms.length} Adjacent Parcel{nearbyFarms.length !== 1 ? 's' : ''}
                      </strong>
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/farm/${alert.source_farm_id}`);
                    }}
                    className="text-xs font-bold text-[#14532D] hover:text-[#2F7D32] flex items-center gap-1"
                  >
                    <span>View Plot Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}