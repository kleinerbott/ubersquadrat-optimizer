/**
 * KML Processing Module
 * Handles parsing and processing of KML files, geometry operations, and polygon analysis
 */

import { CONFIG } from './config.js';

// ===== GEOMETRY HELPER FUNCTIONS =====

/**
 * Extracts polygon data from different geometry types
 * Handles Polygon, MultiPolygon, and GeometryCollection
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Array} Array of polygons with {outer, holes} structure
 */
export function extractPolygons(geometry) {
  const polygons = [];

  if (geometry.type === 'Polygon') {
    polygons.push({
      outer: geometry.coordinates[0],
      holes: geometry.coordinates.slice(1)
    });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polyCoords => {
      polygons.push({
        outer: polyCoords[0],
        holes: polyCoords.slice(1)
      });
    });
  } else if (geometry.type === 'GeometryCollection') {
    geometry.geometries.forEach(geom => {
      if (geom.type === 'Polygon') {
        polygons.push({
          outer: geom.coordinates[0],
          holes: geom.coordinates.slice(1)
        });
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach(polyCoords => {
          polygons.push({
            outer: polyCoords[0],
            holes: polyCoords.slice(1)
          });
        });
      }
    });
  }

  return polygons;
}

/**
 * Calculates bounding box (min/max lat/lon) from coordinates
 * @param {Array} coords - Array of [lat, lon] coordinates
 * @returns {Object} {minLat, maxLat, minLon, maxLon}
 */
export function calculateBounds(coords) {
  const lats = coords.map(p => p[0]);
  const lons = coords.map(p => p[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons)
  };
}

/**
 * Ray casting algorithm to check if point is inside a polygon ring
 * @param {number} lat - Latitude of point to test
 * @param {number} lon - Longitude of point to test
 * @param {Array} ring - Array of [lat, lon] coordinates forming the ring
 * @returns {boolean} True if point is inside ring
 */
export function isPointInRing(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const latI = ring[i][0], lonI = ring[i][1];
    const latJ = ring[j][0], lonJ = ring[j][1];

    const intersect = ((lonI > lon) !== (lonJ > lon))
        && (lat < (latJ - latI) * (lon - lonI) / (lonJ - lonI) + latI);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if point is inside polygon, accounting for holes
 * @param {number} lat - Latitude of point
 * @param {number} lon - Longitude of point
 * @param {Object} polygon - Polygon object with {outer, holes} structure
 * @returns {boolean} True if point is inside polygon and not in any hole
 */
export function isPointInPolygonWithHoles(lat, lon, polygon) {
  // Must be inside outer ring
  if (!isPointInRing(lat, lon, polygon.outer)) {
    return false;
  }

  // Must not be inside any hole
  for (const hole of polygon.holes) {
    if (isPointInRing(lat, lon, hole)) {
      return false;
    }
  }

  return true;
}

// ===== KML PROCESSING FUNCTIONS =====

/**
 * Parse KML layer and extract features, polygons, and ubersquadrat candidates
 * @param {Object} layer - Leaflet KML layer
 * @returns {Object} {features, allPolygons, candidates} where:
 *   - features: array of non-ubersquadrat polygons with {outer, holes} structure
 *   - allPolygons: array of ALL polygons including ubersquadrats
 *   - candidates: array of ubersquadrat candidates with {name, coords, size}
 */
export function parseKmlFeatures(layer) {
  const features = [];
  const allPolygons = [];
  const candidates = [];

  layer.eachLayer(featureLayer => {
    if (featureLayer.setStyle) {
      featureLayer.setStyle({
        fillColor: CONFIG.VISITED_COLOR,
        color: CONFIG.VISITED_BORDER_COLOR,
        fillOpacity: 0.3
      });
    }

    const featureName = featureLayer.feature?.properties?.name?.toLowerCase() || '';
    const isUbersquadrat = featureName.includes('ubersquadrat') && !featureName.includes('ubersquadratinho');
    const isUbersquadratinho = featureName.includes('ubersquadratinho') || featureName.includes('squadratinho');

    // Skip ubersquadratinho features completely
    if (isUbersquadratinho) {
      return;
    }

    if (featureLayer.feature?.geometry) {
      const geometry = featureLayer.feature.geometry;

      // Skip non-polygon geometries
      if (geometry.type === 'Point') return;

      // Extract polygons using helper function
      const polygonsToProcess = extractPolygons(geometry);
      if (polygonsToProcess.length === 0) return;

      // Process each polygon (with holes)
      polygonsToProcess.forEach(polyData => {
        // Convert outer ring: [lon, lat] → [lat, lon]
        const outerLatLon = polyData.outer.map(c => [c[1], c[0]]);

        // Convert holes: [lon, lat] → [lat, lon]
        const holesLatLon = polyData.holes.map(hole => hole.map(c => [c[1], c[0]]));

        // Add all polygons to allPolygons with full structure
        allPolygons.push({
          outer: outerLatLon,
          holes: holesLatLon
        });

        if (isUbersquadrat) {
          candidates.push({
            name: featureLayer.feature.properties.name,
            coords: outerLatLon,  // Keep coords for compatibility
            size: parseInt(featureLayer.feature.properties.size) || 16
          });
        } else {
          // Only add non-ubersquadrat polygons to features for step calculation
          features.push({ outer: outerLatLon, holes: holesLatLon });
        }
      });
    }
  });

  return { features, allPolygons, candidates };
}

/**
 * Find the ubersquadrat from candidates or fall back to largest feature
 * @param {Array} candidates - Array of ubersquadrat candidates
 * @param {Array} features - Array of regular features (fallback)
 * @returns {Object} {coords, size} where coords is the polygon coordinates and size is grid dimension
 */
export function findUbersquadrat(candidates, features) {
  let uberCoords = null;
  let uberSize = 16; // default size

  if (candidates.length > 0) {
    // Take largest found ubersquadrat candidate
    let maxArea = 0;
    for (const candidate of candidates) {
      const bounds = calculateBounds(candidate.coords);
      const area = (bounds.maxLat - bounds.minLat) * (bounds.maxLon - bounds.minLon);

      if (area > maxArea) {
        maxArea = area;
        uberCoords = candidate.coords;
        uberSize = candidate.size;
      }
    }
  } else {
    // Fallback: largest polygon by area
    let maxArea = 0;
    for (const feature of features) {
      const bounds = calculateBounds(feature.outer);
      const area = (bounds.maxLat - bounds.minLat) * (bounds.maxLon - bounds.minLon);
      if (area > maxArea) {
        maxArea = area;
        uberCoords = feature.outer;
      }
    }
  }

  return { coords: uberCoords, size: uberSize };
}
