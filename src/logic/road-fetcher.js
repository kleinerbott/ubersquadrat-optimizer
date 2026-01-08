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

/**
 * Fetch roads from Overpass API for a bounding box with retry logic
 * @param {Object} bounds - {south, west, north, east} or {minLat, maxLat, minLon, maxLon}
 * @param {string} bikeType - 'fastbike', 'gravel', or 'trekking'
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Array>} Array of GeoJSON road features
 */
export async function fetchRoadsInArea(bounds, bikeType = 'trekking', maxRetries = 2) {
  // Normalize bounds format and add buffer (0.01 degrees ~ 1km)
  const normalizedBounds = normalizeBounds(bounds);
  const bufferedBounds = expandBounds(normalizedBounds, 0.01);

  const query = buildOverpassQuery(bufferedBounds, bikeType);

  let lastError = null;
  let attempt = 0;

  // Retry loop
  while (attempt <= maxRetries) {
    attempt++;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      // Handle 504 Gateway Timeout - retry
      if (response.status === 504) {
        const error = new Error(`Gateway Timeout (504) - Overpass API is overloaded`);
        error.shouldRetry = true;
        throw error;
      }

      // Handle other HTTP errors
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const roads = overpassToGeoJSON(data);

      // Success - return roads (even if 0, after retries)
      if (roads.length > 0 || attempt > maxRetries) {
        return roads;
      }

      // No roads but retries remaining - mark for retry
      const error = new Error(`0 roads returned`);
      error.shouldRetry = true;
      throw error;

    } catch (error) {
      lastError = error;

      // Should we retry?
      const shouldRetry = error.shouldRetry || error.name === 'TypeError';

      if (shouldRetry && attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry
      }

      // No more retries
      break;
    }
  }

  // All attempts failed
  throw new Error(`Road data fetch failed after ${attempt} attempts: ${lastError?.message || 'Unknown error'}`);
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
