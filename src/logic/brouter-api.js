/**
 * BRouter API Module
 *
 * Handles communication with the BRouter routing service.
 * Extracted to avoid circular dependencies between router.js and routing-strategies.js.
 */

/**
 * Call BRouter API to calculate bicycle route
 *
 * @param {Array} waypoints - Array of {lat, lon} waypoints
 * @param {string} profile - BRouter profile (trekking, gravel, fastbike)
 * @param {string} apiUrl - BRouter API base URL
 * @returns {Promise<Object>} Route data (GeoJSON format)
 */
export async function callBRouterAPI(waypoints, profile, apiUrl = 'https://brouter.de/brouter') {
  if (waypoints.length < 2) {
    throw new Error('Need at least 2 waypoints for routing');
  }

  // Format: lon,lat|lon,lat|...
  const lonlats = waypoints.map(wp => `${wp.lon},${wp.lat}`).join('|');

  // Build URL with parameters
  const url = `${apiUrl}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Try to get error message from response
      let errorMsg = `BRouter API error: ${response.status} ${response.statusText}`;

      try {
        const errorText = await response.text();
        if (errorText) {
          errorMsg += ` - ${errorText}`;

          // Specific error handling for common issues
          if (errorText.includes('not mapped in existing datafile')) {
            throw new Error('Ein oder mehrere Wegpunkte liegen außerhalb des verfügbaren Kartenbereichs. BRouter hat für diese Region keine Daten.');
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('BRouter returned no route');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Parse BRouter GeoJSON response and extract route information
 *
 * @param {Object} geojson - BRouter GeoJSON response
 * @returns {Object} Parsed route data {coordinates, distance, elevation, time}
 */
export function parseBRouterResponse(geojson) {
  if (!geojson.features || geojson.features.length === 0) {
    throw new Error('Invalid GeoJSON: no features');
  }

  const feature = geojson.features[0];
  const geometry = feature.geometry;
  const properties = feature.properties;

  // Extract coordinates (BRouter returns [lon, lat, elevation])
  const coordinates = geometry.coordinates.map(coord => ({
    lon: coord[0],
    lat: coord[1],
    elevation: coord[2] || 0
  }));

  // Extract statistics from properties
  const distance = properties['track-length'] || 0; // meters
  const time = properties['total-time'] || 0; // seconds

  // Calculate elevation gain
  let elevationGain = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const diff = coordinates[i].elevation - coordinates[i - 1].elevation;
    if (diff > 0) elevationGain += diff;
  }

  return {
    coordinates,
    distance: distance / 1000, // Convert to km
    elevationGain: Math.round(elevationGain),
    time: Math.round(time / 60), // Convert to minutes
    rawGeoJSON: geojson
  };
}
