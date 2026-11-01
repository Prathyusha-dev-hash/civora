/**
 * Civora GIS Utilities Module
 */

/**
 * Validates whether latitude and longitude are valid numeric geographic coordinates.
 * Latitude range: [-90, 90]
 * Longitude range: [-180, 180]
 */
const validateCoordinates = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, message: 'Latitude and Longitude must be numeric values.' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, message: 'Latitude must be between -90 and 90 degrees.' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, message: 'Longitude must be between -180 and 180 degrees.' };
  }

  return { isValid: true, latitude: lat, longitude: lng };
};

/**
 * Calculates spherical distance in meters between two GPS coordinates using Haversine formula.
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Deterministic geographic hotspot clustering algorithm.
 * Groups complaints located within radiusMeters into aggregated hotspot clusters.
 */
const detectHotspots = (complaints, radiusMeters = 300) => {
  const hotspots = [];
  const processedIndices = new Set();

  for (let i = 0; i < complaints.length; i++) {
    if (processedIndices.has(i)) continue;

    const base = complaints[i];
    const baseLat = base.location?.latitude || 0;
    const baseLng = base.location?.longitude || 0;

    if (baseLat === 0 && baseLng === 0) continue;

    const cluster = [base];
    processedIndices.add(i);

    for (let j = i + 1; j < complaints.length; j++) {
      if (processedIndices.has(j)) continue;

      const compare = complaints[j];
      const compLat = compare.location?.latitude || 0;
      const compLng = compare.location?.longitude || 0;

      if (compLat === 0 && compLng === 0) continue;

      const dist = haversineDistance(baseLat, baseLng, compLat, compLng);
      if (dist <= radiusMeters) {
        cluster.push(compare);
        processedIndices.add(j);
      }
    }

    // Include clusters with at least 1 report for GIS visualization
    const avgLat = cluster.reduce((sum, item) => sum + (item.location?.latitude || 0), 0) / cluster.length;
    const avgLng = cluster.reduce((sum, item) => sum + (item.location?.longitude || 0), 0) / cluster.length;
    const categories = Array.from(new Set(cluster.map(item => item.category)));

    hotspots.push({
      latitude: Number(avgLat.toFixed(6)),
      longitude: Number(avgLng.toFixed(6)),
      complaintCount: cluster.length,
      radiusMeters,
      categories,
      primaryCategory: categories[0] || 'Other',
      isHotspot: cluster.length >= 2
    });
  }

  return hotspots;
};

module.exports = {
  validateCoordinates,
  haversineDistance,
  detectHotspots
};

