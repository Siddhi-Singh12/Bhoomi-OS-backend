import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import MetricGauge from '../components/MetricGauge';
import AIRiskScoreCard from '../components/AIRiskScoreCard';
import SatelliteTimeline from '../components/SatelliteTimeline';
import VillageAlertMap from '../components/VillageAlertMap';
import {
  Zap,
  Sparkles,
  ShieldCheck,
  FileText,
  Download,
  ArrowLeft,
  Leaf,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Thermometer,
  Radio,
  FileCheck,
  Clock,
  Layers,
} from 'lucide-react';

export default function FarmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [farm, setFarm] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [proofPacket, setProofPacket] = useState(null);

  useEffect(() => {
    loadFarm();
  }, [id]);

  async function loadFarm() {
    try {
      const res = await apiClient.get(`/farms/${id}`);
      setFarm(res.data.farm);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAnalyze(demoScenario = null) {
    setAnalyzing(true);
    setError('');
    setResult(null);
    setProofPacket(null);
    try {
      const payload = { farm_id: parseInt(id, 10) };
      if (demoScenario) payload.demo_scenario = demoScenario;
      const res = await apiClient.post('/analyses', payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. The stress detection service may be waking up — try again in a few seconds.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGeneratePDF() {
    setGeneratingPDF(true);
    setError('');
    try {
      const res = await apiClient.post('/proof-packets', {
        analysis_id: result.analysis.id,
        claim_loss_percent: result.analysis.stress_type === 'DROUGHT' ? 40 : 0,
      });
      setProofPacket(res.data.proofPacket);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate proof packet');
    } finally {
      setGeneratingPDF(false);
    }
  }

  function downloadPDF() {
    if (!proofPacket) return;
    const base = (apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '');
    const url = `${base}/api/proof-packets/${proofPacket.id}/download`;
    window.open(url, '_blank');
  }

  if (!farm) return <div className="p-8 text-gray-500">Loading farm...</div>;

  const stressColors = {
    DROUGHT: 'bg-red-50 text-red-700 border-red-200',
    PEST_RISK: 'bg-orange-50 text-orange-700 border-orange-200',
    NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      <AppHeader farmer={farmer} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        {/* Hero banner */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
              Live Sentinel-2 Diagnostic Engine
            </span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-mono">
              PostGIS SRID: EPSG:4326
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                Crop Stress Diagnostic & Proof Packet Engine
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {farm.crop_type} — Cadastral Plot #{farm.id} · {farm.area_hectares} hectares declared
              </p>
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={analyzing}
              className="bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition disabled:opacity-50 flex items-center gap-2 shadow-xs text-sm"
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>{analyzing ? 'Acquiring Telemetry...' : 'Scan Selected Field'}</span>
            </button>
          </div>
        </div>

        {/* Demo trigger selector (Ideal for Judges) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-800">Hackathon Demonstration Scenarios</p>
              <p className="text-[11px] text-gray-400">Trigger verified rule engine states for judging.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAnalyze('example_drought_scenario')}
              disabled={analyzing}
              className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Demo: Drought Calamity
            </button>
            <button
              onClick={() => handleAnalyze('example_pest_scenario')}
              disabled={analyzing}
              className="bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Demo: Pest Anomaly
            </button>
            <button
              onClick={() => handleAnalyze('punjab_farm')}
              disabled={analyzing}
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Demo: Normal Health
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result ? (
          <div className="space-y-6">
            {/* PHASE 2: AI RISK SCORE CARD */}
            <AIRiskScoreCard analysis={result.analysis} farm={farm} />

            {/* TELEMETRY GAUGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricGauge
                label="Canopy NDVI (Vegetation Index)"
                icon={<Leaf className="w-4 h-4 text-emerald-600" />}
                value={parseFloat(result.analysis.ndvi)}
                min={-0.2}
                max={1.0}
                lowLabel="-0.20 (Barren Soil)"
                thresholdLabel="< 0.30 Drought Risk"
                highLabel="1.00 (Dense Canopy)"
                gradientClass="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
              />
              <MetricGauge
                label="Canopy NDWI (Moisture Index)"
                icon={<Droplets className="w-4 h-4 text-blue-600" />}
                value={parseFloat(result.analysis.ndwi)}
                min={-0.2}
                max={0.6}
                lowLabel="-0.20 (Desiccated)"
                thresholdLabel="< 0.20 Hydration Deficit"
                highLabel="0.60 (High Moisture)"
                gradientClass="bg-gradient-to-r from-amber-400 via-cyan-400 to-blue-600"
              />
            </div>

            {/* METEOROLOGICAL TELEMETRY GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>7d Cumulative Rain</span>
                  <CloudRain className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {result.analysis.rainfall_mm} <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Threshold: &lt; 10.0 mm deficit</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>Avg Max Temperature</span>
                  <Thermometer className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {result.analysis.temperature_c} <span className="text-xs font-normal text-gray-500">°C</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Thermal radiation index</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>Triggered Rule ID</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm font-black text-gray-900 font-mono truncate">
                  {result.analysis.rule_triggered || 'R0_baseline'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Automated PMFBY logic</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>Sensor Verification</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {Math.round(result.analysis.confidence * 100)}%
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Optical match confidence</p>
              </div>
            </div>

            {/* PHASE 3: SATELLITE TIMELINE */}
            <SatelliteTimeline currentAnalysis={result.analysis} farm={farm} />

            {/* PHASE 4: NEARBY FARMS CALAMITY ALERT MAP (If drought stress detected) */}
            {(result.alert || result.analysis.stress_type === 'DROUGHT') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-red-700">
                    <Radio className="w-4 h-4 text-red-600" />
                    Village Calamity Cluster (PostGIS Spatial Analysis)
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">2.0 km Geodesic Radius</span>
                </div>
                <VillageAlertMap alert={result.alert} sourceFarm={farm} radiusKm={2} />
              </div>
            )}

            {/* PHASE 5: PMFBY PROOF PACKET GENERATOR */}
            {!proofPacket ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                      PMFBY Claim Ready
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">SHA-256 Tamper-Evident</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Compile Cryptographic Proof Packet</h3>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-xl leading-relaxed">
                    Binds Sentinel-2 multi-spectral NDVI telemetry, meteorological drought index, and PostGIS cadastral boundary into a verified PDF signed with SHA-256 integrity hash.
                  </p>
                </div>
                <button
                  onClick={handleGeneratePDF}
                  disabled={generatingPDF}
                  className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center gap-2 shadow-xs shrink-0 text-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>{generatingPDF ? 'Sealing PDF Evidence...' : 'Generate Proof Packet PDF'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-emerald-300 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center text-white shadow-xs">
                      <FileCheck className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                          EVIDENCE PACKET SEALED
                        </span>
                        <span className="text-xs text-gray-400 font-mono">PKT-#{proofPacket.id}</span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5">
                        PMFBY Calamity Evidence Ready for Insurance Adjudication
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={downloadPDF}
                    className="bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition flex items-center gap-2 shadow-xs text-xs shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signed PDF</span>
                  </button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                    SHA-256 Tamper-Evident Evidence Hash
                  </span>
                  <code className="text-xs font-mono font-bold text-emerald-900 break-all select-all">
                    {proofPacket.evidence_hash}
                  </code>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Initial Empty Scan Prompt */
          <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Ready for Sentinel-2 Telemetry Acquisition</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                Click <strong>"Scan Selected Field"</strong> or choose a <strong>Hackathon Demo Scenario</strong> above to cross-reference multi-spectral optical reflectance with 7-day precipitation telemetry.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}