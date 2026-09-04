import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmer.id) {
      navigate('/');
      return;
    }
    loadFarms();
  }, []);

  async function loadFarms() {
    try {
      const res = await apiClient.get(`/farms?farmer_id=${farmer.id}`);
      setFarms(res.data.farms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-800">BHOOMI OS</h1>
          <p className="text-xs text-gray-500">Verified Evidence Layer</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium">
            AgriStack: Simulated Mode
          </span>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{farmer.name}</p>
            <p className="text-xs text-gray-500">{farmer.phone}</p>
          </div>

          <button
            onClick={() => navigate('/alerts')}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            🔔 View Alerts
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Your Farms</h2>
          <button
            onClick={() => navigate('/add-farm')}
            className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800"
          >
            + Add New Farm
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading farms...</p>
        ) : farms.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed p-10 text-center">
            <p className="text-gray-500 mb-3">No farms registered yet.</p>
            <button
              onClick={() => navigate('/add-farm')}
              className="text-emerald-700 font-medium hover:underline"
            >
              Draw your first farm boundary →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {farms.map((farm) => (
              <div
                key={farm.id}
                onClick={() => navigate(`/farm/${farm.id}`)}
                className="bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{farm.crop_type}</h3>
                    <p className="text-sm text-gray-500">{farm.area_hectares} hectares</p>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                    Farm #{farm.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}