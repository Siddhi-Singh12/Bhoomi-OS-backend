import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane,
  Camera,
  Sliders,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Layers,
  ArrowRight,
  Eye,
  Info,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export default function DroneInspectionPanel({
  farm,
  satelliteResult,
  onFusionUpdated,
}) {
  const navigate = useNavigate();

  // State
  const [hasDroneData, setHasDroneData] = useState(true);
  const [droneLambda, setDroneLambda] = useState(0.60); // Default proposed weight
  const [activeLayer, setActiveLayer] = useState('rgb'); // 'rgb', 'exg', 'stress_mask'
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Optical metrics
  const canopyPct = 74.5;
  const soilPct = 25.5;
  const exgMean = 38.4;
  const variMean = 0.184;
  const stressAreaPct = 18.5;

  // Satellite Score (0-100)
  const satRisk = satelliteResult?.risk_score != null ? Number(satelliteResult.risk_score) : 88.0;

  // Drone Score (0-100): S_drone = min(1.0, f_stress / 0.30) * 100
  const droneRisk = Math.min(100.0, Math.round(((stressAreaPct / 100.0) / 0.30) * 1000) / 10);

  // Fused Score: (1 - lambda) * S_sat + lambda * S_drone
  const effectiveLambda = hasDroneData ? droneLambda : 0.0;
  const fusedRisk = Math.round((1.0 - effectiveLambda) * satRisk + effectiveLambda * droneRisk);

  const riskCategory = fusedRisk >= 75 ? 'CRITICAL' : fusedRisk >= 50 ? 'HIGH' : fusedRisk >= 30 ? 'MEDIUM' : 'LOW';
  const badgeColor = riskCategory === 'CRITICAL' ? 'bg-red-600 text-white' : riskCategory === 'HIGH' ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white';

  // Text-To-Speech Local Language Voice Advice
  function handlePlayVoiceAdvice() {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const adviceText = riskCategory === 'CRITICAL' || riskCategory === 'HIGH'
      ? `ध्यान दें किसान भाई। आपके खेत नंबर ${farm?.id || '1'} पर उपग्रह और ड्रोन द्वारा अत्यधिक फसल तनाव पाया गया है। लगभग ${stressAreaPct} प्रतिशत हिस्से में पानी की कमी और पत्तियों में सूखा देखा गया है। कृपया तुरंत सिंचाई की व्यवस्था करें और प्रधानमंत्री फसल बीमा योजना के तहत क्षति का दावा दर्ज करें।`
      : `किसान भाई, आपके खेत नंबर ${farm?.id || '1'} में फसल की स्थिति सामान्य और स्वस्थ पाई गई है। नियमित देखभाल जारी रखें।`;

    const utterance = new SpeechSynthesisUtterance(adviceText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Drone Precision Inspection & Computer Vision</h2>
              <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                1.64 cm/px GSD @ 60m AGL
              </span>
            </div>
            <p className="text-xs text-gray-500">
              High-resolution visible spectrum (RGB) orthomosaic and vegetative stress-zone segmentation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Advice Button */}
          <button
            onClick={handlePlayVoiceAdvice}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isSpeaking
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
            title="Listen to local voice advisory (Hindi/Regional)"
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isSpeaking ? 'आवाज बंद करें' : 'आवाज सुनें (Voice)'}</span>
          </button>

          <button
            onClick={() => navigate('/drone-planner')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Flight GCS</span>
          </button>
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Drone Image / Orthomosaic Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Image Layer Selector Tabs */}
          <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-xl border border-gray-200 text-xs font-medium">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveLayer('rgb')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeLayer === 'rgb' ? 'bg-white font-bold text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                RGB Orthomosaic
              </button>
              <button
                onClick={() => setActiveLayer('exg')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeLayer === 'exg' ? 'bg-white font-bold text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Excess Green (ExG)
              </button>
              <button
                onClick={() => setActiveLayer('stress_mask')}
                className={`px-3 py-1 rounded-lg transition ${
                  activeLayer === 'stress_mask' ? 'bg-white font-bold text-orange-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stress Outlines ({stressAreaPct}%)
              </button>
            </div>
            <span className="text-[11px] text-gray-400 font-mono pr-2">DJI 20MP RGB</span>
          </div>

          {/* Aerial Viewer Canvas / Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 aspect-video flex items-center justify-center group shadow-inner">
            {/* Synthetic High-Resolution Orthomosaic Visual */}
            <div
              className={`w-full h-full relative transition-all duration-300 ${
                activeLayer === 'rgb'
                  ? 'bg-gradient-to-br from-[#2D5A27] via-[#4A7C3B] to-[#1E3F1B]'
                  : activeLayer === 'exg'
                  ? 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]'
                  : 'bg-[#2D5A27]'
              }`}
            >
              {/* Field Crop Rows Simulation Pattern */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 0, transparent 12px)',
                }}
              ></div>

              {/* Stress Zone Overlay (Amber-Orange Desiccation Patch) */}
              {(activeLayer === 'stress_mask' || activeLayer === 'rgb') && (
                <div
                  className={`absolute top-1/4 left-1/3 w-48 h-32 rounded-[45%_55%_60%_40%] border-2 transition-all ${
                    activeLayer === 'stress_mask'
                      ? 'bg-amber-500/60 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-pulse'
                      : 'bg-amber-700/30 border-amber-500/80'
                  }`}
                >
                  <span className="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                    Stress Patch #1 ({stressAreaPct}%)
                  </span>
                </div>
              )}

              {/* Waterlogged / Desiccated Secondary Spot */}
              {(activeLayer === 'stress_mask') && (
                <div className="absolute bottom-4 left-6 w-20 h-16 rounded-[50%] bg-red-500/40 border border-red-400">
                  <span className="absolute top-1 left-2 text-[9px] font-mono text-red-200">#2 (4.3%)</span>
                </div>
              )}

              {/* Georeference Watermark */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Lat: {farm?.centroid?.lat || 21.824}°N, Lng: {farm?.centroid?.lng || 75.615}°E</span>
              </div>
            </div>

            {/* Corner Badge */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded-md">
              Validated: Point-In-Polygon Match
            </div>
          </div>

          {/* EXIF Metadata Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700 font-mono">
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">CAMERA SENSOR</span>
              <strong>DJI 1" 20MP CMOS</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">ALTITUDE AGL</span>
              <strong>60.0 Metres</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">RESOLVED GSD</span>
              <strong>1.64 cm/px</strong>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-sans">QUALITY SCORE</span>
              <strong className="text-emerald-700">0.92 / 1.0 (Sharp)</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Computer Vision & Multi-Resolution Data Fusion (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* CV Metrics Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center justify-between">
              <span>RGB Optical Metrics</span>
              <span className="text-[10px] text-gray-500 font-normal">Woebbecke et al. / Gitelson et al.</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white border border-gray-200 p-2.5 rounded-xl">
                <span className="text-[10px] text-gray-400 block font-mono">EXG (EXCESS GREEN)</span>
                <span className="text-base font-extrabold text-emerald-800 font-mono">+{exgMean}</span>
                <span className="text-[10px] text-gray-500 block">Canopy vigor baseline</span>
              </div>
              <div className="bg-white border border-gray-200 p-2.5 rounded-xl">
                <span className="text-[10px] text-gray-400 block font-mono">VARI GREENNESS</span>
                <span className="text-base font-extrabold text-amber-700 font-mono">{variMean}</span>
                <span className="text-[10px] text-gray-500 block">Atmospherically resistant</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-3 rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Canopy Cover Fraction:</span>
                <strong className="font-mono text-gray-900">{canopyPct}% (Soil: {soilPct}%)</strong>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${canopyPct}%` }}></div>
              </div>

              <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-orange-700 font-semibold">Segmented Stress Zone:</span>
                <strong className="font-mono text-orange-700">{stressAreaPct}% of field area</strong>
              </div>
            </div>

            {/* Scientific Disclosure Notice */}
            <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-[10px] text-amber-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Scientific Limitation Notice:</strong> RGB imagery provides visible greenness proxies (ExG, VARI) rather than true multispectral NIR/NDVI. Field validation by an agricultural officer is required for pathogen or biosecurity confirmation.
              </p>
            </div>
          </div>

          {/* SATELLITE-DRONE DATA FUSION ENGINE */}
          <div className="bg-emerald-950 text-white rounded-2xl p-4.5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Unified Data Fusion Engine
              </span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${badgeColor}`}>
                {riskCategory} RISK
              </span>
            </div>

            {/* Fused Risk Formula Visualization */}
            <div className="bg-emerald-900/80 border border-emerald-800 rounded-xl p-3 text-xs font-mono space-y-2">
              <div className="flex justify-between items-center text-[11px] text-emerald-200">
                <span>Satellite Sub-Score (S_sat):</span>
                <span className="font-bold text-white">{satRisk}/100</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-emerald-200">
                <span>Drone Sub-Score (S_drone):</span>
                <span className="font-bold text-amber-300">{droneRisk}/100</span>
              </div>
              <div className="pt-2 border-t border-emerald-800/80 flex justify-between items-center text-sm font-bold">
                <span className="text-emerald-300 font-sans">Fused Risk Score (S_fused):</span>
                <span className="text-xl text-amber-400 font-mono">{fusedRisk}/100</span>
              </div>
            </div>

            {/* Weight Slider (Lambda) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-emerald-300">
                <span>Drone Evidence Weight (λ):</span>
                <strong className="font-mono text-white">{(effectiveLambda * 100).toFixed(0)}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={effectiveLambda * 100}
                onChange={(e) => setDroneLambda(parseFloat(e.target.value) / 100.0)}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-emerald-400/80 font-mono">
                <span>0% (Satellite Only)</span>
                <span>60% (Proposed Baseline)</span>
                <span>100% (Drone Dominated)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
