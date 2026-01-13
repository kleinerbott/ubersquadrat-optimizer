/**
 * Road Fetcher Module
 * Fetches road data from Overpass API with bike-type specific filters
 */

import { normalizeBounds, expandBounds } from './bounds-utils.js';

const ROAD_FILTERS = {
  fastbike: {
    highways: 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|unclassified',
    excludeSurfaces: 'gravel|unpaved|dirt|grass|sand|mud|ground|earth|compacted|fine_gravel|pebblestone|wood|metal|cobblestone',
    allowedSurfaces: 'paved|asphalt|concrete',
    excludeHighways: 'track|path|footway|bridleway|steps',
    description: 'Paved roads only - suitable for road bikes'
  },

  gravel: {
    highways: 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|cycleway|service|track|path|bridleway',
    excludeSurfaces: 'mud|sand',
    description: 'Paved and unpaved roads suitable for gravel bikes'
  },

  trekking: {
    highways: 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|cycleway|service|track|path',
    excludeSurfaces: 'mud|sand|grass',
    description: 'General cycling roads and paths'
  }
};

/**
 * Build Overpass query for roads in a bounding box
 * @param {Object} bounds - {south, west, north, east}
 * @param {string} bikeType - 'fastbike', 'gravel', or 'trekking'
 * @returns {string} Overpass QL query
 */
function buildOverpassQuery(bounds, bikeType) {
  const filter = ROAD_FILTERS[bikeType] || ROAD_FILTERS.trekking;
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  // For fastbike, use a more restrictive query with positive surface filter
  if (bikeType === 'fastbike') {
    const query = `
[out:json][timeout:30];
(
  // Roads with paved surfaces
  way["highway"~"^(${filter.highways})$"]
     ["surface"~"^(${filter.allowedSurfaces})$"]
     ["bicycle"!="no"]
     ["access"!="private"]
     ["motor_vehicle"!="designated"]
     (${bbox});

  // Major roads (primary/secondary) without bad surface tags (assumed paved)
  way["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified)$"]
     ["bicycle"!="no"]
     ["access"!="private"]
     ["motor_vehicle"!="designated"]
     ["surface"!~"^(${filter.excludeSurfaces})$"]
     ${filter.excludeHighways ? `["highway"!~"^(${filter.excludeHighways})$"]` : ''}
     (${bbox});
);
out body geom;
`;
    return query;
  }

  // Build the query with bike-type specific filters (for gravel/trekking)
  const query = `
[out:json][timeout:30];
(
  way["highway"~"^(${filter.highways})$"]
     ["bicycle"!="no"]
     ["access"!="private"]
     ["motor_vehicle"!="designated"]
     ${filter.excludeSurfaces ? `["surface"!~"^(${filter.excludeSurfaces})$"]` : ''}
     (${bbox});
);
out body geom;
`;

  return query;
}

/**
 * Convert Overpass response to GeoJSON LineStrings
 * @param {Object} overpassData - Raw Overpass API response
 * @returns {Array} Array of GeoJSON features
 */
function overpassToGeoJSON(overpassData) {
  const features = [];

  if (!overpassData.elements) {
    return features;
  }

  for (const element of overpassData.elements) {
    if (element.type === 'way' && element.geometry) {
      // Convert to GeoJSON LineString
      const coordinates = element.geometry.map(node => [node.lon, node.lat]);

      features.push({
        type: 'Feature',
        properties: {
          id: element.id,
          highway: element.tags?.highway || 'unknown',
          name: element.tags?.name || null,
          surface: element.tags?.surface || null
        },
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      });
    }
  }

  return features;
}

// Multiple Overpass API instances as fallback
const OVERPASS_INSTANCES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Fetch roads from Overpass API for a bounding box with retry logic
 * @param {Object} bounds - {south, west, north, east} or {minLat, maxLat, minLon, maxLon}
 * @param {string} bikeType - 'fastbike', 'gravel', or 'trekking'
 * @param {number} maxRetries - Maximum number of retry attempts per instance
 * @returns {Promise<Array>} Array of GeoJSON road features
 */
export async function fetchRoadsInArea(bounds, bikeType = 'trekking', maxRetries = 2) {
  // Normalize bounds format and add buffer (0.01 degrees ~ 1km)
  const normalizedBounds = normalizeBounds(bounds);
  const bufferedBounds = expandBounds(normalizedBounds, 0.01);

  const query = buildOverpassQuery(bufferedBounds, bikeType);

  let lastError = null;
  let totalAttempts = 0;

  // Try each Overpass instance
  for (let instanceIdx = 0; instanceIdx < OVERPASS_INSTANCES.length; instanceIdx++) {
    const apiUrl = OVERPASS_INSTANCES[instanceIdx];
    const instanceName = apiUrl.includes('overpass-api.de') ? 'overpass-api.de'
                       : apiUrl.includes('kumi.systems') ? 'kumi.systems'
                       : 'openstreetmap.ru';

    console.log(`[RoadFetcher] Trying Overpass instance ${instanceIdx + 1}/${OVERPASS_INSTANCES.length}: ${instanceName}`);

    let attempt = 0;

    // Retry loop for this instance
    while (attempt <= maxRetries) {
      attempt++;
      totalAttempts++;

      try {
        console.log(`[RoadFetcher] Attempt ${attempt}/${maxRetries + 1} on ${instanceName}...`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `data=${encodeURIComponent(query)}`
        });

        // Handle 504 Gateway Timeout - retry
        if (response.status === 504) {
          console.warn(`[RoadFetcher] 504 Gateway Timeout on ${instanceName} (attempt ${attempt})`);
          const error = new Error(`Gateway Timeout (504) - Server overloaded`);
          error.shouldRetry = true;
          throw error;
        }

        // Handle 429 Too Many Requests
        if (response.status === 429) {
          console.warn(`[RoadFetcher] 429 Too Many Requests on ${instanceName} (attempt ${attempt})`);
          const error = new Error(`Too Many Requests (429) - Rate limited`);
          error.shouldRetry = true;
          throw error;
        }

        // Handle other HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const roads = overpassToGeoJSON(data);

        // Success - return roads
        if (roads.length > 0) {
          console.log(`[RoadFetcher] ✓ Success: ${roads.length} roads from ${instanceName} (attempt ${attempt})`);
          return roads;
        }

        // No roads but retries remaining - mark for retry
        console.warn(`[RoadFetcher] 0 roads returned from ${instanceName} (attempt ${attempt})`);
        if (attempt <= maxRetries) {
          const error = new Error(`0 roads returned`);
          error.shouldRetry = true;
          throw error;
        }

        // Last attempt on this instance - try next instance
        break;

      } catch (error) {
        lastError = error;

        // Should we retry?
        const shouldRetry = error.shouldRetry || error.name === 'TypeError' || error.message.includes('Failed to fetch');

        if (shouldRetry && attempt <= maxRetries) {
          const delay = 2000;
          console.log(`[RoadFetcher] Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry same instance
        }

        // No more retries on this instance - try next instance
        console.warn(`[RoadFetcher] Failed on ${instanceName} after ${attempt} attempts: ${error.message}`);
        break;
      }
    }
  }

  // All instances and attempts failed
  throw new Error(`Straßendaten konnten nicht geladen werden nach ${totalAttempts} Versuchen über ${OVERPASS_INSTANCES.length} Server. Overpass API ist möglicherweise überlastet. Bitte warte 1-2 Minuten und versuche es erneut.`);
}

/**
 * Get description of road filter for a bike type
 * @param {string} bikeType
 * @returns {string}
 */
export function getBikeTypeDescription(bikeType) {
  return ROAD_FILTERS[bikeType]?.description || ROAD_FILTERS.trekking.description;
}

/**
 * Get available bike types
 * @returns {Array<string>}
 */
export function getAvailableBikeTypes() {
  return Object.keys(ROAD_FILTERS);
}
