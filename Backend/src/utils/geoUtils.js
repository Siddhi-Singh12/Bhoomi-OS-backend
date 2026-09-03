/**
 * GeoJSON and Leaflet spatial geometry utilities
 */

/**
 * Normalizes any format of Leaflet polygon / coordinates into a valid GeoJSON Polygon object.
 * Format returned: { type: "Polygon", coordinates: [[[lng, lat], [lng, lat], ...]] }
 */
function normalizeToGeoJSONPolygon(input) {
  if (!input) {
    throw new Error('Boundary geometry is required');
  }

  // If already valid GeoJSON object
  if (typeof input === 'object' && input.type === 'Polygon' && Array.isArray(input.coordinates)) {
    const ring = input.coordinates[0];
    return {
      type: 'Polygon',
      coordinates: [ensureClosedRing(ring)],
    };
  }

  // If stringified GeoJSON
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return normalizeToGeoJSONPolygon(parsed);
    } catch (e) {
      throw new Error('Invalid JSON string passed as boundary geometry');
    }
  }

  // If passed as array of coordinates
  if (Array.isArray(input)) {
    // Check if it's 3D [[[lng, lat], ...]]
    if (Array.isArray(input[0]) && Array.isArray(input[0][0])) {
      return {
        type: 'Polygon',
        coordinates: [ensureClosedRing(input[0])],
      };
    }

    // Check if it's 2D array [[lng/lat, lat/lng], ...] or array of objects [{lat, lng}, ...]
    if (Array.isArray(input[0])) {
      const ring = input.map((pt) => {
        // If pt is [lng, lat] or [lat, lng]
        return [Number(pt[0]), Number(pt[1])];
      });
      return {
        type: 'Polygon',
        coordinates: [ensureClosedRing(ring)],
      };
    }

    // Check if array of Leaflet objects [{lat: ..., lng: ...}]
    if (typeof input[0] === 'object' && ('lat' in input[0] || 'lng' in input[0])) {
      const ring = input.map((pt) => [
        Number(pt.lng ?? pt.longitude ?? pt[0]),
        Number(pt.lat ?? pt.latitude ?? pt[1]),
      ]);
      return {
        type: 'Polygon',
        coordinates: [ensureClosedRing(ring)],
      };
    }
  }

  throw new Error('Unsupported geometry format. Provide GeoJSON Polygon or Leaflet coordinates array.');
}

/**
 * Ensures the polygon's outer ring is closed (first point === last point).
 */
function ensureClosedRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error('A polygon ring must have at least 3 points.');
  }

  const cleaned = ring.map((pt) => [Number(pt[0]), Number(pt[1])]);
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    cleaned.push([first[0], first[1]]);
  }

  return cleaned;
}

/**
 * Calculates geometric centroid for a GeoJSON Polygon coordinates ring.
 */
function calculateCentroid(coordinates) {
  const ring = Array.isArray(coordinates[0][0]) ? coordinates[0] : coordinates;
  let sumLat = 0;
  let sumLng = 0;
  const count = ring.length;

  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }

  return {
    lat: Math.round((sumLat / count) * 1000000) / 1000000,
    lng: Math.round((sumLng / count) * 1000000) / 1000000,
  };
}

module.exports = {
  normalizeToGeoJSONPolygon,
  ensureClosedRing,
  calculateCentroid,
};
