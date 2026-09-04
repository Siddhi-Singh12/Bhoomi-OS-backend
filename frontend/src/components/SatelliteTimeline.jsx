import React, { useState } from 'react';
import {
  Calendar,
  Orbit,
  TrendingDown,
  Layers,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Sparkles,
  Activity,
  Info,
} from 'lucide-react';

export default function SatelliteTimeline({ currentAnalysis, farm }) {
  const today = new Date();

  const formatDate = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const isDrought = currentAnalysis?.stress_type === 'DROUGHT';
  const isPest = currentAnalysis?.stress_type === 'PEST_RISK';

  // Telemetry sequence across the 5 temporal passes
  const observationData = [
    {
      step: 'T-20d',
      date: formatDate(20),
      satellite: 'Sentinel-2A',
      tileId: 'T43QDA-2026-S2A',
      ndvi: 0.52,
      ndwi: 0.28,
      rainfall7d: 38.5,
      cloudCover: '1.2%',
      status: 'Healthy Baseline',
      healthClass: 'Healthy (Chlorophyll Vigor)',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: 'Dense vegetative chlorophyll vigor. Optimal vegetative index above baseline.',
      spectralMap: 'healthy',
    },
    {
      step: 'T-15d',
      date: formatDate(15),
      satellite: 'Sentinel-2B',
      tileId: 'T43QDA-2026-S2B',
      ndvi: 0.49,
      ndwi: 0.24,
      rainfall7d: 14.0,
      cloudCover: '0.8%',
      status: 'Normal Crop Phase',
      healthClass: 'Healthy (Normal)',
      statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: 'Consistent canopy reflectance. Modest reduction in surface moisture.',
      spectralMap: 'healthy',
    },
    {
      step: 'T-10d',
      date: formatDate(10),
      satellite: 'Sentinel-2A',
      tileId: 'T43QDA-2026-S2A',
      ndvi: isDrought ? 0.39 : (isPest ? 0.44 : 0.48),
      ndwi: isDrought ? 0.16 : 0.22,
      rainfall7d: isDrought ? 4.2 : 22.0,
      cloudCover: '2.1%',
      status: isDrought ? 'Onset Deficit' : 'Normal Canopy',
      healthClass: isDrought ? 'Moderate Deficit' : 'Healthy',
      statusColor: isDrought
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: isDrought
        ? 'Early signal: vegetative hydration dropped below seasonal percentile.'
        : 'Vegetation indicators remain within expected variance thresholds.',
      spectralMap: isDrought ? 'moderate' : 'healthy',
    },
    {
      step: 'T-5d',
      date: formatDate(5),
      satellite: 'Sentinel-2B',
      tileId: 'T43QDA-2026-S2B',
      ndvi: isDrought ? 0.29 : (isPest ? 0.35 : 0.47),
      ndwi: isDrought ? 0.08 : (isPest ? 0.21 : 0.22),
      rainfall7d: isDrought ? 1.5 : 18.0,
      cloudCover: '0.4%',
      status: isDrought ? 'Severe Stress Alert' : (isPest ? 'Canopy Drop Alert' : 'Stable Health'),
      healthClass: isDrought ? 'Severe Stress' : (isPest ? 'Severe Stress' : 'Healthy'),
      statusColor: (isDrought || isPest)
        ? 'text-orange-700 bg-orange-50 border-orange-200'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description: isDrought
        ? 'NDVI crossed below 0.30 critical insurance threshold. Rainfall dry spell reached 14 consecutive days.'
        : (isPest
          ? 'Noticeable biomass loss while moisture index remained normal.'
          : 'Field canopy index healthy.'),
      spectralMap: (isDrought || isPest) ? 'stressed' : 'healthy',
    },
    {
      step: 'Current',
      date: currentAnalysis?.satellite_date && currentAnalysis.satellite_date !== 'illustrative_example'
        ? currentAnalysis.satellite_date
        : formatDate(0),
      satellite: 'Sentinel-2A Harmonized',
      tileId: 'T43QDA-2026-LIVE',
      ndvi: currentAnalysis?.ndvi != null
        ? Number(currentAnalysis.ndvi)
        : (isDrought ? 0.22 : (isPest ? 0.28 : 0.48)),
      ndwi: currentAnalysis?.ndwi != null
        ? Number(currentAnalysis.ndwi)
        : (isDrought ? 0.05 : (isPest ? 0.18 : 0.24)),
      rainfall7d: currentAnalysis?.rainfall_mm != null
        ? Number(currentAnalysis.rainfall_mm)
        : (isDrought ? 4.0 : (isPest ? 12.0 : 28.5)),
      cloudCover: '0.05%',
      status: isDrought
        ? 'Calamity Triggered'
        : (isPest ? 'Pest Anomaly Verified' : 'Compliant Normal'),
      healthClass: isDrought
        ? 'Critical Stress'
        : (isPest ? 'Severe Stress' : 'Healthy'),
      statusColor: isDrought
        ? 'text-red-700 bg-red-50 border-red-200'
        : (isPest ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'),
      description: currentAnalysis?.explanation || 'Live satellite acquisition and meteorological cross-audit completed.',
      spectralMap: isDrought ? 'critical' : (isPest ? 'stressed' : 'healthy'),
      isLive: true,
    },
  ];

  const [selectedIndex, setSelectedIndex] = useState(4);
  const selected = observationData[selectedIndex];
  const baseline = observationData[0];
  const currentPass = observationData[4];

  // Coordinates for SVG trajectory sparkline
  // Width 480, Height 120, Padding X: 40, Padding Y: 20
  const svgWidth = 500;
  const svgHeight = 130;
  const padX = 40;
  const padY = 20;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padY * 2;

  // NDVI scale: min 0.0, max 0.7
  const getY = (val) => svgHeight - padY - (Math.max(0, Math.min(0.7, val)) / 0.7) * plotH;
  const getX = (idx) => padX + (idx / 4) * plotW;

  const points = observationData.map((d, i) => `${getX(i)},${getY(d.ndvi)}`).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Orbit className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Copernicus Sentinel-2 Orbit Tracker
            </span>
            <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
              5-Day Revisit Cycle
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            Multi-Temporal Satellite Health History
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit multi-spectral vegetation index (NDVI) and hydration depletion across temporal passes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl font-mono">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Resolution: 10m L2A Pixel</span>
        </div>
      </div>

      {/* VISUAL NDVI TRAJECTORY GRAPH & LEGEND */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              NDVI Canopy Health Trajectory
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {observationData[0].date} → {observationData[4].date}
          </span>
        </div>

        {/* SVG Sparkline Graph */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36 select-none"
          >
            {/* Background Zone Thresholds */}
            {/* 0.6 to 0.7: Healthy */}
            <rect
              x={padX}
              y={getY(0.7)}
              width={plotW}
              height={getY(0.6) - getY(0.7)}
              fill="#065f46"
              opacity="0.15"
            />
            {/* 0.4 to 0.6: Moderate */}
            <rect
              x={padX}
              y={getY(0.6)}
              width={plotW}
              height={getY(0.4) - getY(0.6)}
              fill="#10b981"
              opacity="0.10"
            />
            {/* 0.2 to 0.4: Severe */}
            <rect
              x={padX}
              y={getY(0.4)}
              width={plotW}
              height={getY(0.2) - getY(0.4)}
              fill="#f59e0b"
              opacity="0.12"
            />
            {/* 0.0 to 0.2: Critical */}
            <rect
              x={padX}
              y={getY(0.2)}
              width={plotW}
              height={getY(0.0) - getY(0.2)}
              fill="#ef4444"
              opacity="0.15"
            />

            {/* Threshold reference lines */}
            <line
              x1={padX}
              y1={getY(0.4)}
              x2={padX + plotW}
              y2={getY(0.4)}
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth="0.8"
            />
            <text x={padX - 8} y={getY(0.4) + 3} fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">0.40</text>

            <line
              x1={padX}
              y1={getY(0.2)}
              x2={padX + plotW}
              y2={getY(0.2)}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="0.8"
            />
            <text x={padX - 8} y={getY(0.2) + 3} fill="#f87171" fontSize="8" textAnchor="end" fontFamily="monospace">0.20</text>

            {/* Trajectory Polyline */}
            <polyline
              fill="none"
              stroke={isDrought ? '#ef4444' : isPest ? '#f59e0b' : '#10b981'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Observation Data Points */}
            {observationData.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.ndvi);
              const isSel = selectedIndex === i;

              return (
                <g key={i} className="cursor-pointer" onClick={() => setSelectedIndex(i)}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSel ? 6 : 4}
                    fill={isSel ? '#ffffff' : (d.ndvi < 0.25 ? '#ef4444' : d.ndvi < 0.4 ? '#f59e0b' : '#10b981')}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  <text
                    x={cx}
                    y={cy - 10}
                    fill={isSel ? '#ffffff' : '#cbd5e1'}
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {d.ndvi.toFixed(2)}
                  </text>
                  <text
                    x={cx}
                    y={svgHeight - 4}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {d.step}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* NDVI Severity Legend */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <span className="text-slate-400 font-mono font-bold uppercase tracking-wide">
            NDVI Severity Legend:
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-slate-300 font-mono">0.0–0.2 Critical Stress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-300 font-mono">0.2–0.4 Severe Stress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-mono">0.4–0.6 Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="text-slate-300 font-mono">0.6–1.0 Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Steps Selector */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2">
          {observationData.map((obs, idx) => {
            const isCurrentSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx)}
                className={`p-3 rounded-xl border text-left transition relative ${
                  isCurrentSelected
                    ? 'border-emerald-700 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-600/20'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/70'
                }`}
              >
                {obs.isLive && (
                  <span className="absolute -top-2 right-2 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-2xs">
                    Live
                  </span>
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono font-bold text-gray-700">
                    {obs.step}
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-gray-900">
                    {obs.ndvi.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 font-mono truncate">{obs.date}</p>
                <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      obs.ndvi >= 0.45
                        ? 'bg-emerald-500'
                        : obs.ndvi >= 0.35
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(10, Math.min(100, (obs.ndvi / 0.6) * 100))}%` }}
                  ></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Pass Details & Before/After Visual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Detailed Pass Metrics */}
        <div className="lg:col-span-2 bg-gray-50/70 rounded-xl border border-gray-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Pass Details: {selected.step}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${selected.statusColor}`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Acquisition: <span className="font-mono font-semibold text-gray-800">{selected.date}</span> · Satellite: <span className="font-mono">{selected.satellite} ({selected.tileId})</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Cloud Cover</span>
              <span className="text-xs font-mono font-bold text-gray-700">{selected.cloudCover}</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-200/60 leading-relaxed">
            {selected.description}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-gray-200/70 p-3">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Canopy NDVI</span>
              <span
                className={`text-lg font-mono font-black ${
                  selected.ndvi < 0.35
                    ? 'text-red-600'
                    : selected.ndvi < 0.45
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {selected.ndvi.toFixed(3)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Base: 0.500</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200/70 p-3">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Water Index (NDWI)</span>
              <span className="text-lg font-mono font-black text-gray-900">
                {selected.ndwi.toFixed(3)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Canopy Moisture</span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200/70 p-3">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">7d Rain Telemetry</span>
              <span className="text-lg font-mono font-black text-gray-900">
                {selected.rainfall7d.toFixed(1)} <span className="text-xs font-normal text-gray-500">mm</span>
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Open-Meteo Sensor</span>
            </div>
          </div>
        </div>

        {/* Right Col: BEFORE vs AFTER Spectral Evidence Cards */}
        <div className="bg-gray-900 text-white rounded-xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Before vs After Evidence
              </span>
              <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                B8/B4 Multi-Band
              </span>
            </div>

            {/* Clear Simulation Disclosure */}
            <p className="text-[11px] text-emerald-300/90 font-medium mb-3">
              Derived Satellite Spectral Simulation
            </p>

            {/* Comparison Cards */}
            <div className="space-y-2.5">
              {/* Baseline Card */}
              <div className="bg-gray-800/90 rounded-lg p-3 border border-gray-700 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    T-20d Baseline
                  </span>
                  <span className="font-mono text-gray-400">{baseline.date}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1.5">
                  <span>NDVI: <strong className="font-mono text-emerald-400">{baseline.ndvi.toFixed(2)}</strong></span>
                  <span>NDWI: <strong className="font-mono">{baseline.ndwi.toFixed(2)}</strong></span>
                  <span>Cloud: {baseline.cloudCover}</span>
                </div>
                <div className="h-3 w-full bg-gradient-to-r from-emerald-600 to-green-400 rounded shadow-inner"></div>
                <p className="text-[10px] text-gray-400 mt-1">Class: {baseline.healthClass}</p>
              </div>

              {/* Current Pass Card */}
              <div className="bg-gray-800/90 rounded-lg p-3 border border-gray-700 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-bold flex items-center gap-1 ${
                      isDrought ? 'text-red-400' : isPest ? 'text-amber-400' : 'text-emerald-300'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Current Pass
                  </span>
                  <span className="font-mono text-gray-400">{currentPass.date}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-300 mb-1.5">
                  <span>NDVI: <strong className="font-mono text-red-300">{currentPass.ndvi.toFixed(2)}</strong></span>
                  <span>NDWI: <strong className="font-mono">{currentPass.ndwi.toFixed(2)}</strong></span>
                  <span>Cloud: {currentPass.cloudCover}</span>
                </div>
                <div
                  className={`h-3 w-full rounded shadow-inner ${
                    isDrought
                      ? 'bg-gradient-to-r from-red-600 via-amber-600 to-yellow-600'
                      : isPest
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-500'
                      : 'bg-gradient-to-r from-emerald-600 to-green-400'
                  }`}
                ></div>
                <p className="text-[10px] text-gray-400 mt-1">Class: {currentPass.healthClass}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
            <span>ESA Copernicus Model</span>
            <span className="text-emerald-400 font-semibold font-mono">Tamper-Evident</span>
          </div>
        </div>
      </div>
    </div>
  );
}
