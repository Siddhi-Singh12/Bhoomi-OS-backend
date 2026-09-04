import React from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  MapPin,
  ShieldAlert,
  Radio,
  Compass,
  Users,
  Layers,
  CheckCircle2,
  Bell,
  FileText,
  Activity,
  ArrowRight,
} from 'lucide-react';

const createPulsingIcon = (color = '#dc2626') => {
  return L.divIcon({
    className: 'custom-pulse-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <span style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <span style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createNearbyIcon = (status = 'High') => {
  const color = status === 'High' ? '#ea580c' : status === 'Moderate' ? '#f59e0b' : '#10b981';
  return L.divIcon({
    className: 'custom-nearby-marker',
    html: `
      <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

export default function VillageAlertMap({ alert, sourceFarm, radiusKm = 2, scenarioType = 'DROUGHT' }) {
  const centerLat = Number(
    alert?.lat ?? sourceFarm?.centroid?.lat ?? (sourceFarm?.boundary?.coordinates?.[0]?.[0]?.[1]) ?? 21.8255
  );
  const centerLng = Number(
    alert?.lng ?? sourceFarm?.centroid?.lng ?? (sourceFarm?.boundary?.coordinates?.[0]?.[0]?.[0]) ?? 75.6165
  );
  const center = [centerLat, centerLng];

  const isDrought = scenarioType === 'DROUGHT' || alert?.alert_type?.includes('DROUGHT');
  const isPest = scenarioType === 'PEST_RISK' || alert?.alert_type?.includes('PEST');

  // Simulated contiguous holdings within 2km Geodesic PostGIS buffer
  const simulatedNearbyFarms = [
    { id: 102, farmer: 'Suresh Sharma', crop: 'Wheat', offset: [0.007, 0.006], area: 2.1, status: isDrought ? 'High Risk' : (isPest ? 'Advisory Watchlist' : 'Compliant'), severity: isDrought ? 'High' : (isPest ? 'Moderate' : 'Normal') },
    { id: 103, farmer: 'Balaram Patidar', crop: 'Gram (Chickpea)', offset: [-0.008, 0.009], area: 3.4, status: isDrought ? 'High Risk' : (isPest ? 'Advisory Watchlist' : 'Compliant'), severity: isDrought ? 'High' : (isPest ? 'Moderate' : 'Normal') },
    { id: 104, farmer: 'Om Prakash', crop: 'Cotton', offset: [0.011, -0.007], area: 1.8, status: isDrought ? 'Moderate Risk' : (isPest ? 'Advisory Watchlist' : 'Compliant'), severity: isDrought ? 'Moderate' : (isPest ? 'Moderate' : 'Normal') },
    { id: 105, farmer: 'Ganesh Yadav', crop: 'Soybean', offset: [-0.009, -0.011], area: 2.6, status: isDrought ? 'Moderate Risk' : (isPest ? 'Low Risk' : 'Compliant'), severity: isDrought ? 'Moderate' : (isPest ? 'Normal' : 'Normal') },
  ];

  const sourceArea = parseFloat(sourceFarm?.area_hectares) || 2.8;
  const totalArea = (sourceArea + simulatedNearbyFarms.reduce((sum, f) => sum + f.area, 0)).toFixed(1);
  const totalHoldings = 1 + simulatedNearbyFarms.length; // Source + 4 adjacent

  const severityCounts = isDrought
    ? { critical: 1, high: 2, moderate: 2 }
    : isPest
    ? { critical: 0, high: 1, moderate: 3, low: 1 }
    : { critical: 0, high: 0, moderate: 0, normal: 5 };

  const responses = isDrought
    ? [
        { title: 'Field verification recommended', desc: 'Execute PostGIS perimeter validation within 2.0 km calamity zone', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'Notify affected holdings', desc: 'Dispatch automated AgriStack SMS advisories to 4 adjacent landholders', icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'Initiate crop-loss assessment', desc: 'Trigger PMFBY Section 8 localized calamity assessment protocol', icon: <Activity className="w-4 h-4 text-red-600" /> },
        { title: 'Generate claim evidence', desc: 'Seal cryptographic PDF proof packets for expedited claim settlement', icon: <FileText className="w-4 h-4 text-blue-600" /> },
      ]
    : isPest
    ? [
        { title: 'Field inspection recommended', desc: 'Ground truth entomological sampling across anomalous canopy parcels', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'Notify neighbouring holdings', desc: 'Issue regional pest containment alert to stop biophysical contagion', icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'Initiate pest surveillance', desc: 'Schedule 3-day high-frequency Sentinel-2 red-edge band monitoring', icon: <Activity className="w-4 h-4 text-orange-600" /> },
      ]
    : [
        { title: 'No intervention required', desc: 'All multi-spectral vegetation indices and moisture levels are compliant', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'Continue routine monitoring', desc: 'Automated satellite acquisition scheduled for next Copernicus pass in 5 days', icon: <Activity className="w-4 h-4 text-emerald-600" /> },
      ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/90 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                {alert?.alert_type || (isDrought ? 'VILLAGE_LEVEL_DROUGHT' : 'VILLAGE_ADVISORY')}
              </span>
              <span className="text-[10px] bg-red-900/80 text-red-300 border border-red-700/60 font-bold px-2 py-0.2 rounded-full font-mono">
                {radiusKm}.0 km PostGIS Geodesic Buffer
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Spatial Adjacency Intelligence: {totalHoldings} contiguous holdings identified under shared micro-climate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-xl font-mono text-slate-300">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Contiguous Cluster: <strong className="text-white">{totalHoldings} Parcels</strong></span>
        </div>
      </div>

      {/* PHASE 4: COMMUNITY IMPACT SUMMARY PANEL */}
      <div className="px-5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                Community Impact
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              PostGIS <code>ST_DWithin</code> Cluster
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Affected Holdings
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {totalHoldings} <span className="text-xs font-normal text-slate-500">Parcels</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">1 Epicenter + 4 Adjacent</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Affected Area
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {totalArea} <span className="text-xs font-normal text-slate-500">Hectares</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Aggregate surface area</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Impact Radius
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {radiusKm}.0 <span className="text-xs font-normal text-slate-500">km</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Geodesic boundary</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Risk Distribution
              </span>
              {isDrought ? (
                <div className="text-xs font-mono font-bold text-slate-800 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-red-700">1 Critical</span> ·
                  <span className="text-amber-700">2 High</span> ·
                  <span className="text-amber-600">2 Moderate</span>
                </div>
              ) : isPest ? (
                <div className="text-xs font-mono font-bold text-slate-800 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-orange-700">1 Elevated</span> ·
                  <span className="text-amber-700">3 Advisory</span>
                </div>
              ) : (
                <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                  5 Normal Compliant
                </div>
              )}
              <span className="text-[10px] text-slate-400 block mt-0.5">Perimeter distribution</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map container */}
      <div className="px-5">
        <div style={{ height: '380px', width: '100%' }} className="relative rounded-xl overflow-hidden border border-slate-200">
          <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satellite Imagery">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics"
                  maxZoom={18}
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Street View">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  maxZoom={18}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* 2km Radius Geodesic Calamity Circle */}
            <Circle
              center={center}
              radius={radiusKm * 1000}
              pathOptions={{
                color: isDrought ? '#dc2626' : isPest ? '#ea580c' : '#10b981',
                fillColor: isDrought ? '#ef4444' : isPest ? '#f97316' : '#10b981',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '6, 6',
              }}
            />

            {/* Source Farm Marker (Epicenter) */}
            <Marker position={center} icon={createPulsingIcon(isDrought ? '#dc2626' : isPest ? '#ea580c' : '#059669')}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className={`font-bold uppercase ${isDrought ? 'text-red-700' : isPest ? 'text-orange-700' : 'text-emerald-700'}`}>
                    Calamity Epicenter
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">Plot #{sourceFarm?.id || '1'}</p>
                  <p className="text-gray-600">Crop: {sourceFarm?.crop_type || 'Wheat'}</p>
                  <p className="text-gray-500 text-[10px] mt-1">Farmer: Ravi Kumar</p>
                </div>
              </Popup>
            </Marker>

            {/* Simulated Adjacent Holdings */}
            {simulatedNearbyFarms.map((nf) => {
              const nfPos = [centerLat + nf.offset[0], centerLng + nf.offset[1]];
              return (
                <Marker key={nf.id} position={nfPos} icon={createNearbyIcon(nf.severity)}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <p className="font-bold text-amber-700">Neighboring Plot #{nf.id}</p>
                      <p className="font-semibold text-gray-900">{nf.farmer}</p>
                      <p className="text-gray-600">Crop: {nf.crop} ({nf.area} ha)</p>
                      <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                        {nf.status}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* In-Map Floating Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl p-3 shadow-md text-xs space-y-1.5 pointer-events-auto">
            <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-emerald-700" />
              Impact Layer Legend
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full border border-white shadow-xs ${isDrought ? 'bg-red-600' : isPest ? 'bg-orange-600' : 'bg-emerald-600'}`}></span>
              <span className="text-gray-700">Epicenter (Plot #{sourceFarm?.id || '1'})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-dashed border-red-500 bg-red-100"></span>
              <span className="text-gray-700">2.0 km Impact Perimeter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></span>
              <span className="text-gray-700">Adjacent PMFBY Plots (4)</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 4: RECOMMENDED RESPONSE ACTIONS */}
      <div className="px-5 pb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              Recommended Operational Response
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">PMFBY Adjudication Protocol</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {responses.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 text-xs"
              >
                <div className="shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <span className="font-bold text-slate-900 block">{item.title}</span>
                  <span className="text-[11px] text-slate-600 leading-tight block mt-0.5">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
