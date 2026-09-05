import React from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';
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

export default function VillageAlertMap({
  alert = null,
  sourceFarm = null,
  nearbyFarms = [],
  radiusKm = 2,
  scenarioType = 'DROUGHT',
}) {
  const { language, t } = useLanguage();

  const centerLat = Number(
    alert?.lat ??
    sourceFarm?.centroid?.lat ??
    sourceFarm?.lat ??
    sourceFarm?.boundary?.coordinates?.[0]?.[0]?.[1] ??
    30.9064
  );
  const centerLng = Number(
    alert?.lng ??
    sourceFarm?.centroid?.lng ??
    sourceFarm?.lng ??
    sourceFarm?.boundary?.coordinates?.[0]?.[0]?.[0] ??
    75.8550
  );
  const center = [centerLat, centerLng];

  const isDrought = scenarioType === 'DROUGHT' || alert?.alert_type?.includes('DROUGHT');
  const isPest = scenarioType === 'PEST_RISK' || alert?.alert_type?.includes('PEST');

  // Use dynamic nearby farms from backend PostGIS query
  const actualNearbyFarms = Array.isArray(nearbyFarms) && nearbyFarms.length > 0
    ? nearbyFarms
    : (Array.isArray(alert?.nearbyFarms) ? alert.nearbyFarms : []);

  // Compute neighboring farms severity and status dynamically
  const neighborsWithSeverity = actualNearbyFarms.map((f) => {
    const dist = f.distance_meters != null ? Number(f.distance_meters) : 500;
    let status = 'Compliant';
    let severity = 'Normal';

    if (isDrought) {
      if (dist < 800) {
        status = 'High Risk';
        severity = 'High';
      } else {
        status = 'Moderate Risk';
        severity = 'Moderate';
      }
    } else if (isPest) {
      if (dist < 800) {
        status = 'Advisory Watchlist';
        severity = 'Moderate';
      } else {
        status = 'Advisory Watchlist';
        severity = 'Normal';
      }
    }

    return {
      ...f,
      status: f.status || status,
      severity: f.severity || severity,
      lat: Number(f.lat ?? f.centroid?.lat ?? f.boundary?.coordinates?.[0]?.[0]?.[1] ?? centerLat),
      lng: Number(f.lng ?? f.centroid?.lng ?? f.boundary?.coordinates?.[0]?.[0]?.[0] ?? centerLng),
      area: parseFloat(f.area_hectares) || 1.5,
    };
  });

  const sourceArea = parseFloat(sourceFarm?.area_hectares || alert?.area_hectares || 2.8);
  const nearbyTotalArea = neighborsWithSeverity.reduce((sum, f) => sum + f.area, 0);
  const totalArea = (sourceArea + nearbyTotalArea).toFixed(1);
  const totalHoldings = 1 + neighborsWithSeverity.length; // Epicenter + contiguous neighbors

  const highRiskCount = neighborsWithSeverity.filter((f) => f.severity === 'High').length;
  const modRiskCount = neighborsWithSeverity.filter((f) => f.severity === 'Moderate').length;
  const normalCount = neighborsWithSeverity.filter((f) => f.severity === 'Normal').length;

  const getDroughtResponses = () => {
    const countLabel = neighborsWithSeverity.length;
    if (language === 'hi') {
      return [
        { title: 'खेत सत्यापन अनुशंसित', desc: `${radiusKm}.0 किमी आपदा परिधि के अंतर्गत PostGIS सीमांकन सत्यापन करें`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'प्रभावित खसरे अधिसूचित करें', desc: `${countLabel} निकटवर्ती किसानों को एग्रीस्टैक स्वचालित SMS परामर्श भेजें`, icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'फसल-नुकसान आकलन आरंभ करें', desc: 'PMFBY खंड 8 स्थानीयकृत आपदा आकलन प्रोटोकॉल सक्रिय करें', icon: <Activity className="w-4 h-4 text-red-600" /> },
        { title: 'डिजिटल दावा साक्ष्य तैयार करें', desc: 'त्वरित दावा निपटारे हेतु SHA-256 सील PDF साक्ष्य संकलित करें', icon: <FileText className="w-4 h-4 text-blue-600" /> },
      ];
    }
    if (language === 'pa') {
      return [
        { title: 'ਜ਼ਮੀਨੀ ਪੜਤਾਲ ਦੀ ਸਿਫ਼ਾਰਸ਼', desc: `${radiusKm}.0 ਕਿਲੋਮੀਟਰ ਆਫ਼ਤ ਖੇਤਰ ਅੰਦਰ PostGIS ਤਸਦੀਕ ਕਰੋ`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'ਪ੍ਰਭਾਵਿਤ ਕਿਸਾਨਾਂ ਨੂੰ ਸੂਚਿਤ ਕਰੋ', desc: `${countLabel} ਨਾਲ ਲੱਗਦੇ ਕਿਸਾਨਾਂ ਨੂੰ ਐਗਰੀਸਟੈਕ SMS ਸੁਨੇਹੇ ਜਾਰੀ ਕਰੋ`, icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'ਫ਼ਸਲ ਨੁਕਸਾਨ ਮੁਲਾਂਕਣ ਸ਼ੁਰੂ ਕਰੋ', desc: 'PMFBY ਧਾਰਾ 8 ਅਧੀਨ ਆਫ਼ਤ ਨਿਪਟਾਰਾ ਪ੍ਰਕਿਰਿਆ ਸਰਗਰਮ ਕਰੋ', icon: <Activity className="w-4 h-4 text-red-600" /> },
        { title: 'ਡਿਜੀਟਲ ਦਾਅਵਾ ਸਬੂਤ ਸੀਲ ਕਰੋ', desc: 'ਤੁਰੰਤ ਦਾਅਵੇ ਲਈ SHA-256 ਦਸਤਖਤੀ PDF ਪੈਕੇਟ ਤਿਆਰ ਕਰੋ', icon: <FileText className="w-4 h-4 text-blue-600" /> },
      ];
    }
    if (language === 'mr') {
      return [
        { title: 'प्रत्यक्ष पाहणीची शिफारस', desc: `${radiusKm}.0 किमी आपत्ती क्षेत्रात PostGIS भू-पडताळणी करा`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'बाधित शेतकरी सूचित करा', desc: `${countLabel} लगतच्या शेतकर्‍यांना अ‍ॅग्रीस्टॅक SMS सूचना पाठवा`, icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'पीक नुकसान मूल्यमापन सुरू करा', desc: 'PMFBY कलम 8 अंतर्गत स्थानिक आपत्ती मूल्यांकन प्रोटोकॉल सक्रिय करा', icon: <Activity className="w-4 h-4 text-red-600" /> },
        { title: 'डिजिटल दावा पुरावा संकलित करा', desc: 'जलद दावा मंजुरीसाठी SHA-256 सील केलेले PDF पॅकेट तयार करा', icon: <FileText className="w-4 h-4 text-blue-600" /> },
      ];
    }
    return [
      { title: 'Field verification recommended', desc: `Execute PostGIS perimeter validation within ${radiusKm}.0 km calamity zone`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
      { title: 'Notify affected holdings', desc: `Dispatch automated AgriStack SMS advisories to ${countLabel} adjacent landholders`, icon: <Bell className="w-4 h-4 text-amber-600" /> },
      { title: 'Initiate crop-loss assessment', desc: 'Trigger PMFBY Section 8 localized calamity assessment protocol', icon: <Activity className="w-4 h-4 text-red-600" /> },
      { title: 'Generate claim evidence', desc: 'Seal cryptographic PDF proof packets for expedited claim settlement', icon: <FileText className="w-4 h-4 text-blue-600" /> },
    ];
  };

  const responses = isDrought
    ? getDroughtResponses()
    : isPest
    ? [
        { title: 'Field inspection recommended', desc: 'Ground truth entomological sampling across anomalous canopy parcels', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'Notify neighbouring holdings', desc: `Issue regional pest containment alert to ${neighborsWithSeverity.length} adjacent landholders`, icon: <Bell className="w-4 h-4 text-amber-600" /> },
        { title: 'Initiate pest surveillance', desc: 'Schedule 3-day high-frequency Sentinel-2 red-edge band monitoring', icon: <Activity className="w-4 h-4 text-orange-600" /> },
      ]
    : [
        { title: 'No intervention required', desc: 'All multi-spectral vegetation indices and moisture levels are compliant', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        { title: 'Continue routine monitoring', desc: 'Automated satellite acquisition scheduled for next Copernicus pass in 5 days', icon: <Activity className="w-4 h-4 text-emerald-600" /> },
      ];

  const currentFarmerName = sourceFarm?.farmer_name || alert?.farmer_name || 'Logged-In Farmer';
  const currentFarmCrop = sourceFarm?.crop_type || alert?.crop_type || 'Agricultural Crop';
  const currentFarmId = sourceFarm?.id || alert?.source_farm_id || '1';

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs space-y-4">
      {/* Top Banner */}
      <div className="bg-[#14532D] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-800 rounded-xl flex items-center justify-center text-white border border-emerald-600/40 shadow-xs">
            <Radio className="w-5 h-5 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 font-mono">
                {alert?.alert_type || (isDrought ? 'VILLAGE_LEVEL_DROUGHT' : isPest ? 'VILLAGE_LEVEL_PEST' : 'VILLAGE_ADVISORY')}
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-200 border border-emerald-700/60 font-bold px-2 py-0.5 rounded-full font-mono">
                {radiusKm}.0 km PostGIS Geodesic Buffer
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
              Spatial Cluster for Plot #{currentFarmId} ({currentFarmerName}): {totalHoldings} holding(s) monitored
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-emerald-950/80 border border-emerald-700/60 px-3.5 py-1.5 rounded-xl font-mono text-emerald-200">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>Contiguous Cluster: <strong className="text-white">{totalHoldings} Parcel{totalHoldings !== 1 ? 's' : ''}</strong></span>
        </div>
      </div>

      {/* PHASE 4: COMMUNITY IMPACT SUMMARY PANEL */}
      <div className="px-5">
        <div className="bg-[#F7F7F2] border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#14532D]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 font-mono">
                {t('communityImpactTitle')}
              </h4>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              PostGIS <code>ST_DWithin</code> Dynamic Cluster
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                {t('affectedHoldings')}
              </span>
              <span className="text-lg font-black text-gray-900 font-mono">
                {totalHoldings} <span className="text-xs font-normal text-gray-500">Parcels</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {neighborsWithSeverity.length === 0
                  ? '1 Epicenter (0 adjacent)'
                  : `1 Epicenter + ${neighborsWithSeverity.length} Adjacent`}
              </span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                {t('affectedArea')}
              </span>
              <span className="text-lg font-black text-gray-900 font-mono">
                {totalArea} <span className="text-xs font-normal text-gray-500">Hectares</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Aggregate surface area</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                {t('impactRadius')}
              </span>
              <span className="text-lg font-black text-gray-900 font-mono">
                {radiusKm}.0 <span className="text-xs font-normal text-gray-500">km</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Geodesic boundary</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-2xs">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">
                {t('riskDistribution')}
              </span>
              {neighborsWithSeverity.length === 0 ? (
                <div className="text-xs font-mono font-bold text-gray-700 mt-1">
                  1 Epicenter Only
                </div>
              ) : isDrought ? (
                <div className="text-xs font-mono font-bold text-gray-800 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-red-700">1 Critical</span>
                  {highRiskCount > 0 && <span>· <span className="text-amber-700">{highRiskCount} High</span></span>}
                  {modRiskCount > 0 && <span>· <span className="text-amber-600">{modRiskCount} Moderate</span></span>}
                  {normalCount > 0 && <span>· <span className="text-emerald-700">{normalCount} Normal</span></span>}
                </div>
              ) : isPest ? (
                <div className="text-xs font-mono font-bold text-gray-800 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-orange-700">1 Elevated</span>
                  {modRiskCount > 0 && <span>· <span className="text-amber-700">{modRiskCount} Advisory</span></span>}
                  {normalCount > 0 && <span>· <span className="text-emerald-700">{normalCount} Normal</span></span>}
                </div>
              ) : (
                <div className="text-xs font-mono font-bold text-emerald-700 mt-1">
                  {totalHoldings} Normal Compliant
                </div>
              )}
              <span className="text-[10px] text-gray-400 block mt-0.5">Perimeter distribution</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaflet Map container with containment & scroll stabilization */}
      <div className="px-5">
        <div
          style={{
            height: '380px',
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            isolation: 'isolate',
            contain: 'paint',
          }}
          className="rounded-xl border border-gray-200 shadow-2xs"
        >
          <MapContainer
            key={`${currentFarmId}-${centerLat.toFixed(3)}-${centerLng.toFixed(3)}`}
            center={center}
            zoom={14}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}
          >
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
                color: isDrought ? '#C62828' : isPest ? '#E88A1A' : '#14532D',
                fillColor: isDrought ? '#ef4444' : isPest ? '#f97316' : '#2F7D32',
                fillOpacity: 0.12,
                weight: 2,
                dashArray: '6, 6',
              }}
            />

            {/* Source Farm Marker (Epicenter) */}
            <Marker position={center} icon={createPulsingIcon(isDrought ? '#C62828' : isPest ? '#E88A1A' : '#14532D')}>
              <Popup>
                <div className="p-1 text-xs">
                  <p className={`font-bold uppercase ${isDrought ? 'text-red-700' : isPest ? 'text-orange-700' : 'text-emerald-800'}`}>
                    {isDrought || isPest ? 'Calamity Epicenter' : 'Source Holding'}
                  </p>
                  <p className="font-semibold text-gray-900 mt-1">Plot #{currentFarmId}</p>
                  <p className="text-gray-600">Crop: {currentFarmCrop}</p>
                  <p className="text-gray-500 text-[10px] mt-0.5">Farmer: {currentFarmerName}</p>
                  <p className="text-gray-400 text-[10px]">Area: {sourceArea} ha</p>
                </div>
              </Popup>
            </Marker>

            {/* Real Neighboring Holdings from Spatial Query */}
            {neighborsWithSeverity.map((nf) => {
              if (isNaN(nf.lat) || isNaN(nf.lng)) return null;
              return (
                <Marker key={nf.id} position={[nf.lat, nf.lng]} icon={createNearbyIcon(nf.severity)}>
                  <Popup>
                    <div className="p-1 text-xs">
                      <p className="font-bold text-amber-700">Neighboring Plot #{nf.id}</p>
                      <p className="font-semibold text-gray-900">{nf.farmer_name || 'Neighboring Farmer'}</p>
                      <p className="text-gray-600">Crop: {nf.crop_type || 'Mixed Crop'} ({nf.area} ha)</p>
                      {nf.distance_meters != null && (
                        <p className="text-gray-500 text-[10px] mt-0.5">
                          Distance: {nf.distance_meters < 1000 ? `${Math.round(nf.distance_meters)}m` : `${(nf.distance_meters / 1000).toFixed(2)}km`} from epicenter
                        </p>
                      )}
                      <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                        {nf.status}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Valid Empty State indicator when 0 neighbors found */}
          {neighborsWithSeverity.length === 0 && (
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-xs border border-amber-300 rounded-xl p-3 shadow-md text-xs space-y-1 max-w-xs pointer-events-auto">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Spatial Perimeter Status</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                No neighboring holdings detected within 2 km.
              </p>
            </div>
          )}

          {/* In-Map Floating Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl p-3 shadow-md text-xs space-y-1.5 pointer-events-auto">
            <p className="font-bold text-gray-900 text-[11px] uppercase tracking-wide mb-1 flex items-center gap-1.5 font-mono">
              <Compass className="w-3 h-3 text-[#14532D]" />
              Impact Layer Legend
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full border border-white shadow-xs ${isDrought ? 'bg-[#C62828]' : isPest ? 'bg-[#E88A1A]' : 'bg-[#14532D]'}`}></span>
              <span className="text-gray-700">Epicenter (Plot #{currentFarmId})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-dashed border-red-500 bg-red-100"></span>
              <span className="text-gray-700">{radiusKm}.0 km Impact Perimeter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white"></span>
              <span className="text-gray-700">Adjacent PMFBY Plots ({neighborsWithSeverity.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 4: RECOMMENDED RESPONSE ACTIONS */}
      <div className="px-5 pb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#14532D]" />
              {t('recommendedResponsesTitle')}
            </h4>
            <span className="text-[11px] text-gray-400 font-mono">PMFBY Adjudication Protocol</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {responses.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#F7F7F2] border border-gray-200 text-xs"
              >
                <div className="shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <span className="font-bold text-gray-900 block">{item.title}</span>
                  <span className="text-[11px] text-gray-600 leading-tight block mt-0.5">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
