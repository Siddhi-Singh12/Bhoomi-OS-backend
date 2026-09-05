import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import MetricGauge from '../components/MetricGauge';
import AIRiskScoreCard from '../components/AIRiskScoreCard';
import SatelliteTimeline from '../components/SatelliteTimeline';
import VillageAlertMap from '../components/VillageAlertMap';
import JudgeDemoBar from '../components/JudgeDemoBar';
import { useLanguage } from '../context/LanguageContext';
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
  QrCode,
} from 'lucide-react';

export default function FarmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [farm, setFarm] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [proofPacket, setProofPacket] = useState(null);

  // Judge Demo Mode state
  const isJudgeDemo = localStorage.getItem('judgeDemo') === 'true' || location.search.includes('demo=judge');
  const [demoStep, setDemoStep] = useState(2); // Step 2: Field view
  const [autoPlay, setAutoPlay] = useState(false);

  // Section Refs for smooth guided scroll
  const diagnosisRef = useRef(null);
  const satelliteRef = useRef(null);
  const villageRef = useRef(null);
  const packetRef = useRef(null);

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
    setSelectedScenario(demoScenario || 'scan');
    try {
      const payload = { farm_id: parseInt(id, 10) };
      if (demoScenario) payload.demo_scenario = demoScenario;
      const res = await apiClient.post('/analyses', payload);
      setResult(res.data);
      if (isJudgeDemo) {
        setDemoStep(3); // Advanced to Diagnosis
        setTimeout(() => {
          diagnosisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis service temporarily unavailable. Please try again.');
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGeneratePDF() {
    if (!result?.analysis?.id) return;
    setGeneratingPDF(true);
    setError('');
    try {
      const stressType = (result.analysis.stress_type || '').toUpperCase();
      const lossPercent = stressType === 'DROUGHT' ? 40 : (stressType === 'PEST_RISK' ? 25 : 0);
      const res = await apiClient.post('/proof-packets', {
        analysis_id: result.analysis.id,
        claim_loss_percent: lossPercent,
      });
      setProofPacket(res.data.proofPacket);
      if (isJudgeDemo) {
        setDemoStep(6);
        setTimeout(() => {
          packetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return res.data.proofPacket;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate proof packet');
      return null;
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

  // Judge Demo Progression Controls
  async function handleDemoNext() {
    if (!result) {
      // Step 3: Trigger Drought Calamity
      await handleAnalyze('example_drought_scenario');
      return;
    }

    if (demoStep === 3) {
      // Step 4: Advance to Satellite Evidence
      setDemoStep(4);
      satelliteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (demoStep === 4) {
      // Step 5: Advance to Village Impact
      setDemoStep(5);
      villageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (demoStep === 5 && !proofPacket) {
      // Step 6: Generate Proof Packet
      await handleGeneratePDF();
      return;
    }

    if (demoStep >= 5 && proofPacket) {
      downloadPDF();
    }
  }

  function handleExitDemo() {
    localStorage.removeItem('judgeDemo');
    navigate(`/farm/${id}`);
  }

  // Auto-play timer effect for guided presentation
  useEffect(() => {
    if (!autoPlay || !isJudgeDemo) return;

    const timer = setTimeout(async () => {
      if (!result && !analyzing) {
        await handleAnalyze('example_drought_scenario');
      } else if (demoStep === 3) {
        setDemoStep(4);
        satelliteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (demoStep === 4) {
        setDemoStep(5);
        villageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (demoStep === 5 && !proofPacket && !generatingPDF) {
        await handleGeneratePDF();
      } else if (demoStep === 6) {
        setAutoPlay(false); // Completed walkthrough
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [autoPlay, demoStep, result, proofPacket, analyzing, generatingPDF]);

  if (!farm) return <div className="p-8 text-gray-500">Loading farm...</div>;

  const nextLabels = {
    2: t('pipelineNext_3'),
    3: t('pipelineNext_4'),
    4: t('pipelineNext_5'),
    5: proofPacket ? t('inspectSealedEvidence') : t('compileProofPacket'),
    6: t('pipelineNext_6'),
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      <AppHeader farmer={farmer} />

      {isJudgeDemo && (
        <JudgeDemoBar
          currentStep={demoStep}
          totalSteps={6}
          nextLabel={nextLabels[demoStep] || t('nextStage')}
          onNext={handleDemoNext}
          onExit={handleExitDemo}
          isActionLoading={analyzing || generatingPDF}
          autoPlay={autoPlay}
          onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
        />
      )}

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => navigate(`/dashboard${isJudgeDemo ? '?demo=judge' : ''}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('backToDashboard')}
        </button>

        {/* Hero banner */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {result?.is_fallback || result?.analysis?.is_fallback ? (
              <span className="text-xs bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                {t('diagnosticEngineSimulation')}
              </span>
            ) : (
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                {t('diagnosticEngineLive')}
              </span>
            )}
            <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-mono">
              PostGIS SRID: EPSG:4326
            </span>
            {(result?.is_fallback || result?.analysis?.is_fallback) && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {t('offlineModeActive')}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">
                {t('cropStressDiagnosticTitle')}
              </h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {farm.crop_type} — Cadastral Plot #{farm.id} · {farm.area_hectares} {t('hectaresDeclared')}
              </p>
            </div>

            <button
              onClick={() => handleAnalyze()}
              disabled={analyzing}
              className="bg-emerald-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition disabled:opacity-50 flex items-center gap-2 shadow-xs text-sm"
            >
              <Zap className="w-4 h-4 text-emerald-300" />
              <span>{analyzing ? t('acquiringTelemetry') : t('scanSelectedField')}</span>
            </button>
          </div>
        </div>

        {/* Certified Calamity Simulation Scenarios */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wide">
                {t('benchmarksTitle')}
              </p>
              <p className="text-[11px] text-gray-500">
                {t('benchmarksSubtext')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAnalyze('example_drought_scenario')}
              disabled={analyzing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 font-mono ${
                selectedScenario === 'example_drought_scenario'
                  ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-400'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('simulateDrought')}
            </button>
            <button
              onClick={() => handleAnalyze('example_pest_scenario')}
              disabled={analyzing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 font-mono ${
                selectedScenario === 'example_pest_scenario'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('simulatePest')}
            </button>
            <button
              onClick={() => handleAnalyze('punjab_farm')}
              disabled={analyzing}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 font-mono ${
                selectedScenario === 'punjab_farm'
                  ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-400'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('benchmarkNormal')}
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
            {/* Fallback Mode Informative Status */}
            {(result?.is_fallback || result?.analysis?.is_fallback) && (
              <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">
                    Diagnostic Engine: Local Verified Simulation Active
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    External stress API unavailable — seamlessly operating in Local Verified Simulation mode. Risk indices, multi-temporal satellite timeline, PostGIS cluster alert map, and cryptographic proof packet generation remain fully functional and deterministic.
                  </p>
                </div>
              </div>
            )}

            {/* PHASE 2: AI RISK SCORE & AGRONOMIC ASSESSMENT */}
            <div ref={diagnosisRef}>
              <AIRiskScoreCard analysis={result.analysis} farm={farm} />
            </div>

            {/* TELEMETRY GAUGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricGauge
                label={t('ndviGaugeLabel')}
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
                label={t('ndwiGaugeLabel')}
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
                  <span>{t('rain7dLabel')}</span>
                  <CloudRain className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {result.analysis.rainfall_mm} <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Threshold: &lt; 10.0 mm deficit</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>{t('tempAvgLabel')}</span>
                  <Thermometer className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {result.analysis.temperature_c} <span className="text-xs font-normal text-gray-500">°C</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Thermal radiation index</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>{t('triggeredRuleLabel')}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm font-black text-gray-900 font-mono truncate">
                  {result.analysis.rule_triggered || 'R0_baseline'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Automated PMFBY logic</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase mb-1">
                  <span>{t('sensorVerificationLabel')}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-gray-900 font-mono">
                  {Math.round(result.analysis.confidence * 100)}%
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Optical match confidence</p>
              </div>
            </div>

            {/* PHASE 3: SATELLITE TIMELINE */}
            <div ref={satelliteRef}>
              <SatelliteTimeline currentAnalysis={result.analysis} farm={farm} />
            </div>

            {/* PHASE 4: VILLAGE IMPACT ALERT MAP */}
            <div ref={villageRef}>
              <VillageAlertMap
                alert={result.alert}
                sourceFarm={farm}
                radiusKm={2}
                scenarioType={result.analysis.stress_type || 'DROUGHT'}
              />
            </div>

            {/* PHASE 5: PMFBY PROOF PACKET GENERATOR */}
            <div ref={packetRef}>
              {!proofPacket ? (
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                        {t('pmfbyClaimReady')}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">{t('tamperEvident')}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{t('compileProofPacket')}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 max-w-xl leading-relaxed">
                      {t('proofPacketDescription')}
                    </p>
                  </div>
                  <button
                    onClick={handleGeneratePDF}
                    disabled={generatingPDF}
                    className="bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center gap-2 shadow-xs shrink-0 text-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{generatingPDF ? t('sealingPdf') : t('generateProofPacketBtn')}</span>
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
                            {t('evidencePacketSealed')}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">PKT-#{proofPacket.id}</span>
                          {proofPacket.verification_id && (
                            <span className="text-[10px] bg-slate-900 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                              {proofPacket.verification_id}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mt-0.5">
                          {t('calamityEvidenceReady')}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={downloadPDF}
                      className="bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition flex items-center gap-2 shadow-xs text-xs shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>{t('downloadSignedPdf')}</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                        {t('sha256EvidenceHash')}
                      </span>
                      <code className="text-xs font-mono font-bold text-emerald-900 break-all select-all">
                        {proofPacket.evidence_hash}
                      </code>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('qrSealEmbedded')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Initial Empty Scan Prompt */
          <div className="bg-white rounded-2xl border border-gray-200/80 p-16 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{t('cropStressPrompt')}</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                {t('cropStressPromptSub')}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
