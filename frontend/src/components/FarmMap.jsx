import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 18); // higher zoom so individual fields are visible
    }
  }, [position]);
  return null;
}

function LocationSearch({ onLocationFound }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        onLocationFound([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      } else {
        alert('Location not found. Try a different village/town name.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }

  return (
    <div className="flex gap-2 mb-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search your village or area (e.g. Karnal, Haryana)"
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="button"
        onClick={handleSearch}
        disabled={searching}
        className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 disabled:opacity-50"
      >
        {searching ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
}

export default function FarmMap({ points, setPoints }) {
  const [center, setCenter] = useState([20.5937, 78.9629]); // India center, fallback
  const [flyTarget, setFlyTarget] = useState(null);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = [pos.coords.latitude, pos.coords.longitude];
          setCenter(loc);
          setFlyTarget(loc);
          setLocating(false);
        },
        () => {
          setLocating(false); // permission denied or failed, keep India-center fallback
        },
        { timeout: 5000 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  function handleMapClick(latlng) {
    setPoints([...points, latlng]);
  }

  function undoLastPoint() {
    setPoints(points.slice(0, -1));
  }

  function clearPoints() {
    setPoints([]);
  }

  return (
    <div>
      <LocationSearch onLocationFound={setFlyTarget} />

      {locating && (
        <p className="text-xs text-gray-400 mb-2">Detecting your location...</p>
      )}

      <div className="rounded-xl overflow-hidden border" style={{ height: '400px' }}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Street Map">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <ClickHandler onMapClick={handleMapClick} />
          {flyTarget && <FlyToLocation position={flyTarget} />}
          {points.map((pt, idx) => (
            <Marker key={idx} position={pt} />
          ))}
          {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: '#00e676', weight: 3 }} />}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-sm text-gray-500">
          {points.length === 0
            ? 'Search your area above, then click on the map to mark farm boundary corners'
            : `${points.length} point(s) marked ${points.length < 3 ? '(need at least 3)' : ''}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undoLastPoint}
            disabled={points.length === 0}
            className="text-sm px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Undo Point
          </button>
          <button
            type="button"
            onClick={clearPoints}
            disabled={points.length === 0}
            className="text-sm px-3 py-1.5 border rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}