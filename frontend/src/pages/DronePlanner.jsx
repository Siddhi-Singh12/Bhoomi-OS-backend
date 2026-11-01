import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import { useLanguage } from '../context/LanguageContext';
import {
  Plane,
  Compass,
  Sliders,
  Play,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  Camera,
  Battery,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Activity,
  FileCode,
} from 'lucide-react';

// Custom Map center controller
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], 16, { duration: 1.2 });
    }
  }, [center]);
  return null;
}

export default function DronePlanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');

  const [loading, setLoading] = useState(true);
  const [prioritization, setPrioritization] = useState(null);
  const [selectedField, setSelectedField] = useState(null);

  // Flight Planning Parameters (SEVA Proposal Baseline: 60m, 70% side, 80% forward)
  const [altitudeM, setAltitudeM] = useState(60.0);
  const [sideOverlapPct, setSideOverlapPct] = useState(70.0);
  const [forwardOverlapPct, setForwardOverlapPct] = useState(80.0);
  const [speedMs, setSpeedMs] = useState(5.0);
  const [dailyCapacity, setDailyCapacity] = useState(45);

  const [activeMissionPlan, setActiveMissionPlan] = useState(null);
  const [planningFlight, setPlanningFlight] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState('');

  useEffect(() => {
    loadPrioritizationQueue();
  }, [dailyCapacity]);

  async function loadPrioritizationQueue() {
    try {
      setLoading(true);
      const res = await apiClient.get(`/drone/prioritize?daily_capacity=${dailyCapacity}`);
      if (res.data.success && res.data.prioritization) {
        setPrioritization(res.data.prioritization);
        const catalog = res.data.prioritization.ranked_field_catalog || [];
        // Default select top high-risk field
        const topField = catalog.find((f) => f.flagged_for_drone) || catalog[0];
        if (topField && !selectedField) {
          handleSelectField(topField);
        }
      }
    } catch (err) {
      console.error('Failed to load prioritization:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectField(field) {
    setSelectedField(field);
    generateFlightPlanForField(field, altitudeM, sideOverlapPct, forwardOverlapPct, speedMs);
  }

  async function generateFlightPlanForField(field, alt, side, forward, spd) {
    if (!field) return;
    try {
      setPlanningFlight(true);
      const res = await apiClient.post('/drone/missions', {
        farm_id: field.field_id,
        altitude_m: alt,
        side_overlap_pct: side,
        forward_overlap_pct: forward,
        speed_ms: spd,
        mission_name: `Grid Inspection — Farm #${field.field_id} (${field.farmer_name})`,
      });
      if (res.data.success && res.data.mission?.plan) {
        setActiveMissionPlan(res.data.mission.plan);
      }
    } catch (err) {
      console.error('Mission planning error:', err);
    } finally {
      setPlanningFlight(false);
    }
  }

  function handleExportQGC() {
    if (!activeMissionPlan?.qgc_plan_format) return;
    const blob = new Blob([JSON.stringify(activeMissionPlan.qgc_plan_format, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bhoomi-QGC-Mission-Farm-${selectedField?.field_id || '1'}.plan`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadSuccess('Exported QGroundControl .plan');
    setTimeout(() => setDownloadSuccess(''), 3000);
  }

  function handleExportGeoJSON() {
    if (!activeMissionPlan?.trajectory_geojson) return;
    const blob = new Blob([JSON.stringify(activeMissionPlan.trajectory_geojson, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bhoomi-Flight-Trajectory-Farm-${selectedField?.field_id || '1'}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadSuccess('Exported Flight GeoJSON');
    setTimeout(() => setDownloadSuccess(''), 3000);
  }

  const catalog = prioritization?.ranked_field_catalog || [];
  const summary = prioritization?.summary || {
    total_registered_fields: 7,
    high_risk_fields: 1,
    fields_awaiting_inspection: 1,
    daily_drone_capacity: dailyCapacity,
    allocated_today_count: 1,
    capacity_utilization_pct: 2.2,
  };

  const centerPos = selectedField?.centroid || { lat: 21.824, lng: 75.615 };
  const trajectoryCoords = activeMissionPlan?.trajectory_geojson?.geometry?.coordinates?.map((c) => [c[1], c[0]]) || [];

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col">
      <AppHeader farmer={farmer} />

      {/* Sub-header Banner */}
      <div className="bg-emerald-950 text-white px-6 py-4 border-b border-emerald-900 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-700 flex items-center justify-center text-emerald-300">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight">Drone Mission & Inspection Planner</h1>
                <span className="bg-emerald-800 text-emerald-200 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-600">
                  DGCA Green Zone (Max 120m)
                </span>
              </div>
              <p className="text-xs text-emerald-300/80">
                Satellite Anomaly-Driven Aerial Deployment Queue & Automated Grid Survey Synthesis
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-emerald-900/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <span className="text-emerald-400 block text-[10px] font-sans font-semibold">DAILY DRONE CAPACITY</span>
              <span className="text-sm font-bold text-white">{summary.allocated_today_count} / {dailyCapacity} Fields</span>
            </div>
            <div className="bg-emerald-900/60 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <span className="text-amber-400 block text-[10px] font-sans font-semibold">SATELLITE HIGH RISK</span>
              <span className="text-sm font-bold text-amber-300">{summary.high_risk_fields} Flagged</span>
            </div>
            <button
              onClick={() => navigate('/panchayat')}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-sans font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition text-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Panchayat Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Priority Queue & Parameter Controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Capacity Utilization Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-600" />
                Daily Flight Capacity
              </span>
              <span className="text-xs font-bold font-mono text-emerald-700">{summary.capacity_utilization_pct}% Utilized</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-3">
              <div
                className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, summary.capacity_utilization_pct || 2)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>Baseline: 3 Batteries (~49 ha)</span>
              <div className="flex items-center gap-1 font-mono">
                <label>Cap:</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={dailyCapacity}
                  onChange={(e) => setDailyCapacity(parseInt(e.target.value) || 45)}
                  className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs text-gray-800 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Priority Inspection Queue */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4.5 shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Priority Inspection Queue</h3>
                <p className="text-[11px] text-gray-500">Ranked by Satellite Anomaly Score</p>
              </div>
              <button
                onClick={loadPrioritizationQueue}
                title="Refresh priority queue"
                className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-gray-50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1">
              {catalog.map((f) => {
                const isSelected = selectedField?.field_id === f.field_id;
                const isCritical = f.fused_risk_score >= 70;
                const isHigh = f.fused_risk_score >= 50 && f.fused_risk_score < 70;

                return (
                  <div
                    key={f.field_id}
                    onClick={() => handleSelectField(f)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center ${
                        isCritical ? 'bg-red-100 text-red-700' : isHigh ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        #{f.priority_rank}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-gray-900">{f.farmer_name}</p>
                          <span className="text-[10px] text-gray-500 font-medium">({f.crop_type})</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono">
                          Farm #{f.field_id} • {f.area_hectares} ha • NDVI {f.satellite_ndvi}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        isCritical ? 'bg-red-50 text-red-700 border border-red-200' :
                        isHigh ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {f.fused_risk_score} Risk
                      </span>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {f.inspection_status === 'INSPECTED' ? '✓ Inspected' : 'Awaiting Flight'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Planning Parameter Sliders */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4.5 shadow-xs">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Flight Planning Parameters
            </h3>

            {/* Altitude Slider */}
            <div className="mb-3.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">Planning Altitude (AGL):</span>
                <span className="font-mono font-bold text-emerald-800">{altitudeM} m</span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={altitudeM}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAltitudeM(val);
                  generateFlightPlanForField(selectedField, val, sideOverlapPct, forwardOverlapPct, speedMs);
                }}
                className="w-full accent-emerald-700 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>30m (0.82cm/px)</span>
                <span>60m (Reference)</span>
                <span>120m (Ceiling)</span>
              </div>
            </div>

            {/* Overlap Controls */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-gray-600 font-medium block mb-1">Side Overlap: {sideOverlapPct}%</label>
                <input
                  type="range"
                  min="50"
                  max="85"
                  step="5"
                  value={sideOverlapPct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSideOverlapPct(val);
                    generateFlightPlanForField(selectedField, altitudeM, val, forwardOverlapPct, speedMs);
                  }}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 font-medium block mb-1">Forward Overlap: {forwardOverlapPct}%</label>
                <input
                  type="range"
                  min="60"
                  max="90"
                  step="5"
                  value={forwardOverlapPct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setForwardOverlapPct(val);
                    generateFlightPlanForField(selectedField, altitudeM, sideOverlapPct, val, speedMs);
                  }}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>
            </div>

            {/* GSD & Camera Specs Badge */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[11px] font-mono text-gray-600 flex justify-between">
              <span>GSD: <strong>{activeMissionPlan?.mission_parameters?.gsd_cm_per_pixel || 1.64} cm/px</strong></span>
              <span>Footprint: <strong>{activeMissionPlan?.mission_parameters?.footprint_width_m || 90} × {activeMissionPlan?.mission_parameters?.footprint_height_m || 60}m</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Map & Mission Telemetry (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Mission Top Stats Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-gray-400 block text-[10px] font-sans">ESTIMATED FLIGHT TIME</span>
                <span className="text-base font-bold text-gray-900">{activeMissionPlan?.mission_metrics?.estimated_flight_time_min || 14.5} min</span>
              </div>
              <div className="h-7 w-px bg-gray-200"></div>
              <div>
                <span className="text-gray-400 block text-[10px] font-sans">TOTAL DISTANCE</span>
                <span className="text-base font-bold text-gray-900">
                  {((activeMissionPlan?.mission_metrics?.total_distance_m || 4200) / 1000).toFixed(2)} km
                </span>
              </div>
              <div className="h-7 w-px bg-gray-200"></div>
              <div>
                <span className="text-gray-400 block text-[10px] font-sans">PHOTOS TO CAPTURE</span>
                <span className="text-base font-bold text-emerald-700">
                  {activeMissionPlan?.mission_metrics?.estimated_photo_count || 180} shots
                </span>
              </div>
              <div className="h-7 w-px bg-gray-200"></div>
              <div>
                <span className="text-gray-400 block text-[10px] font-sans">BATTERY CYCLES</span>
                <span className="text-base font-bold text-gray-900">
                  {activeMissionPlan?.mission_metrics?.batteries_required || 1} Battery
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportQGC}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
                title="Download standard QGroundControl .plan format"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>QGroundControl</span>
              </button>
              <button
                onClick={handleExportGeoJSON}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
                title="Download GeoJSON flight trajectory"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>GeoJSON</span>
              </button>
              <button
                onClick={() => navigate(`/farm/${selectedField?.field_id || 1}?tab=drone`)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Inspect Imagery</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {downloadSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Interactive Map View */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs relative flex-1 min-h-[500px]">
            <MapContainer
              center={[centerPos.lat || 21.824, centerPos.lng || 75.615]}
              zoom={16}
              scrollWheelZoom={false}
              className="w-full h-full min-h-[500px]"
            >
              <MapAutoCenter center={centerPos} />

              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Satellite">
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    maxZoom={20}
                    attribution="&copy; Google Satellite Imagery"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="CartoDB Positron">
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    maxZoom={19}
                    attribution="&copy; CartoDB"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* All Registered Fields */}
              {catalog.map((f) => {
                const isSelected = selectedField?.field_id === f.field_id;
                const isCritical = f.fused_risk_score >= 70;
                const color = isCritical ? '#dc2626' : f.fused_risk_score >= 50 ? '#ea580c' : '#10b981';

                return (
                  <Marker
                    key={f.field_id}
                    position={[f.centroid?.lat || 21.824, f.centroid?.lng || 75.615]}
                    eventHandlers={{ click: () => handleSelectField(f) }}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-xs text-gray-900">{f.farmer_name} — Farm #{f.field_id}</p>
                        <p className="text-[11px] text-gray-600">{f.crop_type} • {f.area_hectares} ha</p>
                        <p className="text-[11px] font-bold text-red-600">Risk Score: {f.fused_risk_score}/100</p>
                        <p className="text-[10px] text-gray-500">Status: {f.inspection_status}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Planned Flight Path Polyline */}
              {trajectoryCoords.length > 0 && (
                <Polyline
                  positions={trajectoryCoords}
                  color="#F59E0B"
                  weight={2.5}
                  dashArray="4, 6"
                  opacity={0.9}
                />
              )}
            </MapContainer>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-gray-200 text-xs shadow-md space-y-1.5 font-medium">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Mission Overlay</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 bg-amber-500 border-t border-dashed border-amber-600"></span>
                <span className="text-[11px] text-gray-700">Generated Lawnmower Survey Trajectory</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <span className="text-[11px] text-gray-700">Critical Priority Target</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-[11px] text-gray-700">Healthy Cadastral Holding</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
