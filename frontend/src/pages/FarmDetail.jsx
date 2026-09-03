import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function FarmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  async function handleAnalyze() {
    setAnalyzing(true);
    setError('');
    setResult(null);
    setProofPacket(null);
    try {
      const res = await apiClient.post('/analyses', { farm_id: parseInt(id, 10) });
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
    window.open(`http://localhost:5001/api/proof-packets/${proofPacket.id}/download`, '_blank');
  }

  if (!farm) return <div className="p-8 text-gray-500">Loading farm...</div>;

  const stressColors = {
    DROUGHT: 'bg-red-50 text-red-700 border-red-200',
    PEST_RISK: 'bg-orange-50 text-orange-700 border-orange-200',
    NONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:underline mb-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-emerald-800">
            {farm.crop_type} — Farm #{farm.id}
          </h1>
        </div>
        <span className="text-sm text-gray-500">{farm.area_hectares} hectares</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Trigger Analysis */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Stress Analysis</h2>
          <p className="text-sm text-gray-500 mb-4">
            Runs real-time satellite (Sentinel-2 NDVI/NDWI) + weather analysis on this farm's boundary.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing satellite + weather data...' : 'Run Stress Analysis'}
          </button>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-6 ${stressColors[result.analysis.stress_type]}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Stress Type: {result.analysis.stress_type}</h3>
              <span className="text-sm font-medium">
                Confidence: {Math.round(result.analysis.confidence * 100)}%
              </span>
            </div>

            <p className="text-sm mb-4">{result.explanation}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs opacity-70">NDVI</p>
                <p className="font-semibold">{result.analysis.ndvi}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs opacity-70">NDWI</p>
                <p className="font-semibold">{result.analysis.ndwi}</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs opacity-70">Rainfall</p>
                <p className="font-semibold">{result.analysis.rainfall_mm} mm</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs opacity-70">Temperature</p>
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
        )}

        {/* Generate Proof Packet */}
        {result && !proofPacket && (
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

        {/* PDF Ready */}
        {proofPacket && (
          <div className="bg-white rounded-xl border border-emerald-200 p-6">
            <h2 className="font-semibold text-emerald-800 mb-2">✅ Proof Packet Generated</h2>
            <p className="text-xs text-gray-400 mb-1">Evidence Hash:</p>
            <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all mb-4">
              {proofPacket.evidence_hash}
            </p>
            <button
              onClick={downloadPDF}
              className="bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-800"
            >
              Download PDF
            </button>
          </div>
        )}
      </main>
    </div>
  );
}