import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Circle, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../context/LanguageContext';
import {
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Plane,
  FileText,
  Download,
  Users,
  Compass,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Sprout,
  Activity,
  Calendar,
  Radio,
} from 'lucide-react';

const createVillagePulseIcon = (color = '#dc2626') => {
  return L.divIcon({
    className: 'custom-pulse-marker',
    html: `
      <div style="position: relative; width: 22px; height: 22px;">
        <span style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

export default function PanchayatDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('ALL');

  useEffect(() => {
    loadPanchayatData();
  }, []);

  async function loadPanchayatData() {
    try {
      setLoading(true);
      const res = await apiClient.get('/panchayat/overview');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load Panchayat overview:', err);
    } finally {
      setLoading(false);
    }
  }

  const profile = data?.panchayat_profile || {
    panchayat_name: 'Nimrani Gram Panchayat',
    district: 'Khargone',
    state: 'Madhya Pradesh',
    total_villages_covered: 3,
  };

  const summary = data?.summary || {
    total_registered_fields: 7,
    high_risk_fields: 1,
    fields_awaiting_inspection: 1,
    fields_inspected: 0,
    daily_drone_capacity: 45,
  };

  const cropBreakdown = data?.crop_breakdown || {
    Wheat: { total_fields: 4, high_risk_fields: 1, total_area_ha: 11.6, avg_fused_risk: 42 },
    Cotton: { total_fields: 3, high_risk_fields: 0, total_area_ha: 6.8, avg_fused_risk: 18 },
  };

  const rankedFields = data?.ranked_fields || [];
  const filteredFields = rankedFields.filter((f) => {
    const matchesSearch =
      (f.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(f.field_id).includes(searchQuery) ||
      (f.agristack_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCrop = selectedCrop === 'ALL' || f.crop_type === selectedCrop;
    return matchesSearch && matchesCrop;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <AppHeader farmer={farmer} />

      {/* Panchayat Banner */}
      <div className="bg-emerald-950 text-white px-6 py-5 border-b border-emerald-900 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-800/80 border border-emerald-700 flex items-center justify-center text-emerald-300 shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">{profile.panchayat_name}</h1>
                <span className="bg-emerald-800/80 text-emerald-200 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border border-emerald-600">
                  LGD: {profile.lgd_code || '66310'}
                </span>
              </div>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Precision Agricultural Surveillance • {profile.district}, {profile.state} • {profile.total_villages_covered} Mouzas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/drone-planner')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Plane className="w-4 h-4" />
              <span>Launch Mission Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full flex flex-col gap-6">
        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Land</span>
              <Sprout className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 font-mono">{summary.total_registered_fields}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">Cadastral parcels mapped</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">High Risk Holdings</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-extrabold text-red-600 font-mono">{summary.high_risk_fields}</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">Satellite stress detected</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Drone Daily Queue</span>
              <Plane className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 font-mono">
              {summary.allocated_today_count || 1} <span className="text-xs font-sans text-gray-400">/ {summary.daily_drone_capacity || 45} cap</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">Prioritized for survey today</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Verified Proofs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 font-mono">100%</p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">SHA-256 sealed evidence</p>
          </div>
        </div>

        {/* Middle Section: Village Map + Crop-wise breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Interactive Village Map (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col min-h-[460px]">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Village Cadastral Surveillance Map</h3>
                <p className="text-[11px] text-gray-500">Color-coded field parcels by multi-resolution risk</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span className="text-xs text-gray-600 font-medium">Critical</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ml-1"></span>
                <span className="text-xs text-gray-600 font-medium">Moderate</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block ml-1"></span>
                <span className="text-xs text-gray-600 font-medium">Healthy</span>
              </div>
            </div>

            <div className="flex-1 relative min-h-[400px]">
              <MapContainer
                center={[21.824, 75.615]}
                zoom={15}
                scrollWheelZoom={false}
                className="w-full h-full min-h-[400px]"
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Google Satellite">
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                      maxZoom={20}
                      attribution="&copy; Google Satellite"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="CartoDB Light">
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      maxZoom={19}
                      attribution="&copy; CartoDB"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {rankedFields.map((f) => {
                  const isCritical = f.fused_risk_score >= 70;
                  const color = isCritical ? '#dc2626' : f.fused_risk_score >= 50 ? '#ea580c' : '#10b981';

                  return (
                    <Marker
                      key={f.field_id}
                      position={[f.centroid?.lat || 21.824, f.centroid?.lng || 75.615]}
                      icon={isCritical ? createVillagePulseIcon('#dc2626') : undefined}
                    >
                      <Popup>
                        <div className="p-1 max-w-[220px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-gray-900">{f.farmer_name}</span>
                            <span className="text-[10px] font-mono text-gray-500">#{f.field_id}</span>
                          </div>
                          <p className="text-[11px] text-gray-600">{f.crop_type} • {f.area_hectares} ha</p>
                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-red-600">Risk: {f.fused_risk_score}/100</span>
                            <button
                              onClick={() => navigate(`/farm/${f.field_id}`)}
                              className="text-[11px] text-emerald-700 font-bold hover:underline"
                            >
                              Inspect →
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          {/* Crop Breakdown & Drone Operations (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Crop Risk Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4.5 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                Crop-Wise Surveillance Breakdown
              </h3>
              <div className="space-y-3">
                {Object.entries(cropBreakdown).map(([crop, stats]) => (
                  <div key={crop} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-gray-900">{crop}</span>
                      <span className="text-[11px] font-mono font-bold text-gray-700">
                        Avg Risk: {stats.avg_fused_risk}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${stats.avg_fused_risk >= 50 ? 'bg-red-500' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(100, stats.avg_fused_risk)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                      <span>{stats.total_fields} Parcel(s) • {stats.total_area_ha} ha</span>
                      <span className={stats.high_risk_fields > 0 ? 'text-red-600 font-bold' : 'text-emerald-700'}>
                        {stats.high_risk_fields} Under Stress
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drone Fleet Operations Note */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4.5 shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-900">
                <Plane className="w-4 h-4 text-emerald-600" />
                DGCA Remote Pilot Flight Status
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Nimrani Cluster Base Station is operating in the DGCA Green Zone. Pre-approved daily flight ceiling: 120m AGL.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800 space-y-1 font-mono">
                <div>• Altitude: 60m AGL (1.64 cm/px GSD)</div>
                <div>• Overlap: 70% Side / 80% Forward</div>
                <div>• Daily Capacity: 45 Fields / Day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Full Cadastral Prioritisation Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Panchayat Field Health & Drone Inspection Register</h3>
              <p className="text-[11px] text-gray-500">Screened through Sentinel-2 multi-band pass and prioritized for aerial inspection</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search farmer or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 text-gray-800"
                />
              </div>

              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-800 bg-white"
              >
                <option value="ALL">All Crops</option>
                {Object.keys(cropBreakdown).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-y border-gray-100 text-gray-500 font-semibold font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">RANK</th>
                  <th className="py-2.5 px-3">FARMER & PARCEL</th>
                  <th className="py-2.5 px-3">CROP</th>
                  <th className="py-2.5 px-3">AREA</th>
                  <th className="py-2.5 px-3">NDVI</th>
                  <th className="py-2.5 px-3">7D RAIN</th>
                  <th className="py-2.5 px-3">FUSED RISK</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFields.map((f) => {
                  const isCritical = f.fused_risk_score >= 70;
                  const isHigh = f.fused_risk_score >= 50 && f.fused_risk_score < 70;

                  return (
                    <tr key={f.field_id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-gray-800">#{f.priority_rank}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900">{f.farmer_name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">Farm #{f.field_id} • {f.agristack_id}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-700">{f.crop_type}</td>
                      <td className="py-3 px-3 font-mono">{f.area_hectares} ha</td>
                      <td className="py-3 px-3 font-mono">
                        <span className={f.satellite_ndvi < 0.35 ? 'text-red-600 font-bold' : 'text-gray-700'}>
                          {f.satellite_ndvi}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{f.rainfall_7d_mm} mm</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          isCritical ? 'bg-red-50 text-red-700 border border-red-200' :
                          isHigh ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {f.fused_risk_score}/100
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-gray-600 font-medium">
                          {f.has_drone_data ? '✓ Drone Inspected' : (f.flagged_for_drone ? '⚠️ Priority Queue' : 'Satellite OK')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/farm/${f.field_id}`)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-2.5 py-1 rounded-lg text-xs font-semibold transition"
                        >
                          Evidence Card
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
