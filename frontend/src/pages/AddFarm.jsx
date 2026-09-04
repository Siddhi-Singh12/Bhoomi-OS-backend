import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import FarmMap from '../components/FarmMap';
import { ArrowLeft, Sprout, MapPin, Sparkles, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export default function AddFarm() {
  const navigate = useNavigate();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [cropType, setCropType] = useState('');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const SAMPLE_CADASTRE_PARCELS = [
    {
      label: 'Khargone, MP (Survey #67A)',
      crop: 'Wheat',
      points: [
        [21.821, 75.612],
        [21.822, 75.618],
        [21.828, 75.617],
        [21.827, 75.611],
      ],
    },
    {
      label: 'Ludhiana, PB (Survey #12/3)',
      crop: 'Wheat',
      points: [
        [30.901, 75.852],
        [30.903, 75.861],
        [30.912, 75.859],
        [30.909, 75.848],
      ],
    },
    {
      label: 'Yavatmal, MH (Survey #35/1)',
      crop: 'Cotton',
      points: [
        [20.392, 78.121],
        [20.395, 78.132],
        [20.404, 78.129],
        [20.401, 78.118],
      ],
    },
  ];

  function handleSelectCadastralSample(sample) {
    setCropType(sample.crop);
    setPoints(sample.points);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (points.length < 3) {
      setError('Please mark at least 3 points on the map to form a valid boundary.');
      return;
    }

    setLoading(true);
    try {
      // Convert [lat, lng] points to GeoJSON [lng, lat] format and close the outer ring
      const coordinates = points.map(([lat, lng]) => [lng, lat]);
      coordinates.push(coordinates[0]);

      const boundary = {
        type: 'Polygon',
        coordinates: [coordinates],
      };

      const res = await apiClient.post('/farms', {
        farmer_id: farmer.id,
        crop_type: cropType || 'Mixed Crop',
        boundary,
      });

      navigate(`/farm/${res.data.farm.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register farm boundary in PostGIS');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      <AppHeader farmer={farmer} />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight">Register New Cadastral Parcel</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Digitize farm boundary for automated Sentinel-2 satellite monitoring and PMFBY evidence sealing.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              PostGIS 4326 Compliant
            </span>
          </div>
        </div>

        {/* 1-Click AgriStack Demo Plots */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-700 font-bold mb-2">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click AgriStack Cadastral Presets (Demo Quick Load)
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Pre-aligned GPS polygons</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SAMPLE_CADASTRE_PARCELS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCadastralSample(p)}
                className="p-2.5 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 text-left transition text-xs flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-gray-900 block group-hover:text-emerald-800">{p.crop}</span>
                  <span className="text-[11px] text-gray-500 block">{p.label}</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition">
                  Load →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1">
                Crop Sown / Cultivation Type
              </label>
              <input
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                placeholder="e.g. Wheat, Rice, Cotton, Soybean"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Farm Plot Geometry (Satellite Polygon)
                </label>
                <span className="text-[11px] text-gray-400 font-mono">
                  {points.length} vertex points marked
                </span>
              </div>
              <FarmMap points={points} setPoints={setPoints} />
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-900 active:scale-[0.99] transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Registering in PostGIS...' : 'Save & Initiate Monitoring'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}