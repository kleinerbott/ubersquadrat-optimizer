import { normalizeBounds, expandBounds } from './bounds-utils.js';

const ROAD_FILTERS = {
  fastbike: {
    highways: 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|unclassified',
    excludeSurfaces: 'gravel|unpaved|dirt|grass|sand|mud|ground|earth|compacted|fine_gravel|pebblestone|wood|metal|cobblestone',
    allowedSurfaces: 'paved|asphalt|concrete',
    excludeHighways: 'track|path|footway|bridleway|steps',
    description: 'Paved roads only - suitable for road bikes'
  },

  hikingmountain: {
    highways: 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|cycleway|service|track|path|bridleway',
    excludeSurfaces: 'mud|sand',
    description: 'Paved and unpaved roads suitable for mountain bikes'
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
 * @param {string} bikeType - 'fastbike', 'mtb', or 'trekking'
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
  way["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|residential|tertiary_link|unclassified)$"]
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

export const OVERPASS_INSTANCES = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];

/**
 * Fetch roads from a specific Overpass instance
 * Used for parallel requests across multiple instances to avoid rate limiting.
 *
 * @param {Object} bounds - {south, west, north, east} or {minLat, maxLat, minLon, maxLon}
 * @param {string} bikeType - 'fastbike', 'mtb', or 'trekking'
 * @param {string} instanceUrl - Specific Overpass API URL to use
 * @param {number} maxRetries - Maximum retry attempts for this instance
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} { roads: Array, success: boolean, error: string|null, instanceUrl: string }
 */
export async function fetchRoadsFromInstance(bounds, bikeType, instanceUrl, maxRetries = 2, onProgress = null) {
  const normalizedBounds = normalizeBounds(bounds);
  const bufferedBounds = expandBounds(normalizedBounds, 0.01);
  const query = buildOverpassQuery(bufferedBounds, bikeType);

  const instanceName = instanceUrl.includes('overpass-api.de') ? 'overpass-api.de'
                     : instanceUrl.includes('maps.mail') ? 'VK-Maps'
                     : instanceUrl.includes('openstreetmap.ru') ? 'openstreetmap.ru'
                     : 'Unknown';

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (onProgress) {
        onProgress(`${instanceName} Versuch ${attempt}/${maxRetries + 1}`);
      }

      const response = await fetch(instanceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      // Handle rate limiting - retry with delay
      if (response.status === 429) {
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s for rate limit
          continue;
        }
        return { roads: [], success: false, error: 'Rate limited (429)', instanceUrl };
      }

      // Handle server overload - retry with delay
      if (response.status === 504) {
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        return { roads: [], success: false, error: 'Gateway timeout (504)', instanceUrl };
      }

      if (!response.ok) {
        return { roads: [], success: false, error: `HTTP ${response.status}`, instanceUrl };
      }

      const data = await response.json();
      const roads = overpassToGeoJSON(data);

      if (roads.length > 0) {
        return { roads, success: true, error: null, instanceUrl };
      }

    
      if (attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      return { roads: [], success: true, error: null, instanceUrl }; 

    } catch (error) {
      lastError = error;
      const isNetworkError = error.name === 'TypeError' || error.message.includes('Failed to fetch');

      if (isNetworkError && attempt <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      return { roads: [], success: false, error: error.message, instanceUrl };
    }
  }

  return { roads: [], success: false, error: lastError?.message || 'Unknown error', instanceUrl };
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
