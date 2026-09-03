import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import FarmMap from '../components/FarmMap';

export default function AddFarm() {
  const navigate = useNavigate();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [cropType, setCropType] = useState('');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (points.length < 3) {
      setError('Please mark at least 3 points on the map to form a boundary.');
      return;
    }

    setLoading(true);
    try {
      // Convert [lat, lng] points to GeoJSON [lng, lat] format, and close the ring
      const coordinates = points.map(([lat, lng]) => [lng, lat]);
      coordinates.push(coordinates[0]); // close the polygon

      const boundary = {
        type: 'Polygon',
        coordinates: [coordinates],
      };

      const res = await apiClient.post('/farms', {
        farmer_id: farmer.id,
        crop_type: cropType || 'Unknown',
        boundary,
      });

      navigate(`/farm/${res.data.farm.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save farm');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold text-emerald-800">Add New Farm</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border p-5">
            <label className="text-sm font-medium text-gray-700">Crop Type</label>
            <input
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              placeholder="e.g. Wheat, Rice, Cotton"
              className="w-full mt-1.5 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-white rounded-xl border p-5">
            <label className="text-sm font-medium text-gray-700 block mb-3">
              Mark Farm Boundary on Map
            </label>
            <FarmMap points={points} setPoints={setPoints} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-700 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? 'Saving Farm...' : 'Save Farm Boundary'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}