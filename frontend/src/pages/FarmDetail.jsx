import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import MetricGauge from '../components/MetricGauge';

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
    window.open(`https://bhoomi-os-backend.onrender.com/api/proof-packets/${proofPacket.id}/download`, '_blank');
  }

  if (!farm) return <div className="p-8 text-gray-500">Loading farm...</div>;

  const stressColors = {
    DROUGHT: 'bg-red-50 text-red-700 border-red-200',
    PEST_RISK: 'bg-orange-50 text-orange-700 border-orange-200',
    NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader farmer={farmer} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:underline">
          ← Back to Dashboard
        </button>

        {/* Hero banner */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-semibold">
              Live Sentinel-2 Diagnostic Engine
            </span>
            <span className="text-xs bg-gray-50 text-gray-600 px-3 py-1 rounded-full font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Active API Engine
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Crop Stress Scanner & Agronomic Advisory</h1>
              <p className="text-sm text-gray-500 mt-1">
                {farm.crop_type} — Farm #{farm.id} · {farm.area_hectares} hectares
              </p>
            </div>
            <button
              onClick={() => handleAnalyze()}
              disabled={analyzing}
              className="bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
            >
              ⚡ {analyzing ? 'Scanning...' : 'Scan Selected Field'}
            </button>
          </div>
        </div>

        {/* Demo trigger row */}
        <div className="bg-white rounded-xl border p-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Guaranteed illustrative scenario for demonstration purposes.
          </p>
          <button
            onClick={() => handleAnalyze('example_drought_scenario')}
            disabled={analyzing}
            className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
          >
            Demo: Drought Scenario
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {result ? (
          <>
            {/* Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricGauge
                label="NDVI (Vegetation Index)"
                icon="🌿"
                value={parseFloat(result.analysis.ndvi)}
                min={-0.2}
                max={1.0}
                lowLabel="-0.20 (Barren)"
                thresholdLabel="<0.30 Drought Risk"
                highLabel="1.00 (Vigorous)"
                gradientClass="bg-gradient-to-r from-red-400 via-amber-300 to-emerald-500"
              />
              <MetricGauge
                label="NDWI (Canopy Moisture Index)"
                icon="💧"
                value={parseFloat(result.analysis.ndwi)}
                min={-0.2}
                max={0.6}
                lowLabel="-0.20 (Desiccated)"
                thresholdLabel="<0.20 Pest Risk"
                highLabel="0.60 (High Moisture)"
                gradientClass="bg-gradient-to-r from-amber-300 via-cyan-300 to-blue-600"
              />
            </div>

            {/* Result card */}
            <div className={`rounded-xl border p-6 ${stressColors[result.analysis.stress_type]}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Stress Type: {result.analysis.stress_type}</h3>
                <span className="text-sm font-medium">Confidence: {Math.round(result.analysis.confidence * 100)}%</span>
              </div>
              <p className="text-sm mb-4">{result.explanation}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs opacity-70">Rainfall (7d)</p>
                  <p className="font-semibold">{result.analysis.rainfall_mm} mm</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs opacity-70">Avg Max Temp</p>
                  <p className="font-semibold">{result.analysis.temperature_c}°C</p>
                </div>
              </div>
              {result.alert && (
                <div className="mt-4 bg-white/70 rounded-lg p-4 border border-current">
                  <p className="text-sm font-medium">⚠️ Village-Level Alert Triggered</p>
                  <p className="text-sm mt-1">{result.alert.message}</p>
                </div>
              )}
            </div>

            {!proofPacket && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-800 mb-2">Generate Verified Proof Packet</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Creates a PMFBY-aligned PDF with cryptographic evidence hash, ready for insurance claim submission.
                </p>
                <button
                  onClick={handleGeneratePDF}
                  disabled={generatingPDF}
                  className="bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  {generatingPDF ? 'Generating PDF...' : 'Generate Proof Packet'}
                </button>
              </div>
            )}

            {proofPacket && (
              <div className="bg-white rounded-xl border border-emerald-200 p-6">
                <h2 className="font-semibold text-emerald-800 mb-2">✅ Proof Packet Generated</h2>
                <p className="text-xs text-gray-400 mb-1">Evidence Hash:</p>
                <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all mb-4">{proofPacket.evidence_hash}</p>
                <button onClick={downloadPDF} className="bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-800">
                  Download PDF
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              📈
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Ready to Scan Field</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Click "Scan Selected Field" to compute live vegetative health from satellite and weather telemetry.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}