import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const res = await apiClient.get('/alerts');
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:underline mb-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-xl font-bold text-emerald-800">Village-Level Alerts</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-gray-500">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed p-10 text-center">
            <p className="text-gray-500">No alerts yet. Alerts trigger automatically when drought is detected on any farm.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl border-l-4 border-red-500 border p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
                    {alert.alert_type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{alert.message}</p>
                <div className="mt-2 text-xs text-gray-500 flex gap-4">
                  <span>Source Farm: #{alert.source_farm_id}</span>
                  <span>Crop: {alert.crop_type || 'N/A'}</span>
                  <span>Farmer: {alert.farmer_name || 'N/A'}</span>
                  <span>Radius: {alert.radius_km} km</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}