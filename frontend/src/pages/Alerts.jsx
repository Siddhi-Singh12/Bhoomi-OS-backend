import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import AppHeader from '../components/AppHeader';
import VillageAlertMap from '../components/VillageAlertMap';
import { Bell, ShieldAlert, MapPin, Users, ArrowLeft, ArrowRight, AlertTriangle, Calendar, Radio } from 'lucide-react';

export default function Alerts() {
  const navigate = useNavigate();
  const farmer = JSON.parse(localStorage.getItem('farmer') || '{}');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const res = await apiClient.get('/alerts');
      const list = res.data.alerts || [];
      setAlerts(list);
      if (list.length > 0) {
        setSelectedAlert(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Fallback demo alert if database has no drought events yet
  const displayAlert = selectedAlert || {
    id: 1,
    source_farm_id: 1,
    crop_type: 'Wheat',
    farmer_name: 'Ravi Kumar',
    alert_type: 'VILLAGE_LEVEL_DROUGHT',
    radius_km: 2.0,
    affected_farm_ids: [102, 103, 104, 105],
    lat: 21.824,
    lng: 75.615,
    message: 'Acute vegetative desiccation detected on Farm #1. 4 neighboring agricultural plots within 2km are impacted by identical dry-spell conditions.',
    created_at: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      <AppHeader farmer={farmer} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Navigation */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-600" />
                Village-Level Calamity Alerts
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated community alerts triggered when drought or crop stress is verified via Sentinel-2 & PostGIS spatial buffers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                2 km PostGIS Buffer Active
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Alert Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-gray-800">
              <Radio className="w-4 h-4 text-red-600" />
              Live Geospatial Calamity Perimeter
            </span>
            <span className="font-mono text-[11px] text-gray-400">
              Selected: Farm #{displayAlert.source_farm_id}
            </span>
          </div>
          <VillageAlertMap alert={displayAlert} radiusKm={displayAlert.radius_km || 2} />
        </div>

        {/* Alert Cards Feed */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
            Detected Calamity Events ({alerts.length > 0 ? alerts.length : '1 Illustrative'})
          </h2>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-xs text-gray-500">
              Loading village stress telemetry...
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-700 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                      DEMO CALAMITY BUFFER
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">Nimrani Cluster (Khargone, MP)</span>
                  </div>
                  <p className="text-xs text-gray-800 font-semibold">{displayAlert.message}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Run an analysis on any farm using "Demo: Drought Scenario" to trigger an automated live alert in your database.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-900 transition shrink-0"
              >
                Scan A Field Now →
              </button>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`bg-white rounded-2xl border p-5 transition cursor-pointer hover:shadow-md ${
                  selectedAlert?.id === alert.id
                    ? 'border-red-500 ring-2 ring-red-500/20 shadow-xs'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                      {alert.alert_type}
                    </span>
                    <span className="text-xs text-gray-700 font-bold font-mono">
                      Radius: {alert.radius_km} km
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm font-bold text-gray-900 mb-3">{alert.message}</p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      Source Farm: <strong>#{alert.source_farm_id}</strong>
                    </span>
                    <span>
                      Crop: <strong>{alert.crop_type || 'Wheat'}</strong>
                    </span>
                    <span>
                      Farmer: <strong>{alert.farmer_name || 'Beneficiary'}</strong>
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/farm/${alert.source_farm_id}`);
                    }}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <span>View Plot Audit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}