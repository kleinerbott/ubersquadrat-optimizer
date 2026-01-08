/**
 * Router Module - BRouter Integration for Bicycle Routing
 *
 * Handles route calculation through proposed squares using BRouter API,
 * TSP optimization, and road-aware waypoint selection.
 */

import * as turf from '@turf/turf';
import { solveTSP } from './tsp-solver.js';
import { fetchRoadsInArea } from './road-fetcher.js';
import { optimizeWaypoints, calculateCombinedBounds } from './waypoint-optimizer.js';
import {
  SimplificationStrategy,
  tryProfilesWithFallback,
  createMinimalWaypoints,
  isCoverageError
} from './routing-strategies.js';

/**
 * Extract proposed squares from Leaflet layer
 * Returns center points of all rectangles in the layer
 *
 * @param {L.LayerGroup} proposedLayer - Leaflet layer with proposed squares
 * @returns {Array} Array of {lat, lon, bounds} objects
 */
export function extractProposedSquares(proposedLayer) {
  const squares = [];

  proposedLayer.eachLayer(layer => {
    if (layer.getBounds) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      squares.push({
        lat: center.lat,
        lon: center.lng,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        }
      });
    }
  });

  return squares;
}

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

/**
 * Main function: Calculate optimal route through proposed squares
 *
 * @param {L.LayerGroup} proposedLayer - Layer with proposed squares
 * @param {Object} startPoint - Starting point {lat, lon}
 * @param {string} bikeType - Bike profile (trekking, gravel, fastbike)
 * @param {boolean} roundtrip - Whether to return to start
 * @param {string} apiUrl - BRouter API URL
 * @returns {Promise<Object>} Route data
 */
export async function calculateRoute(proposedLayer, startPoint, bikeType, roundtrip, apiUrl = 'https://brouter.de/brouter') {
  // Step 1: Extract proposed squares with bounds
  const squares = extractProposedSquares(proposedLayer);

  if (squares.length === 0) {
    throw new Error('Keine vorgeschlagenen Quadrate zum Routen vorhanden');
  }

  // Step 2: Fetch roads for the area (road-aware routing)
  let optimizedWaypoints;
  let roadFetchFailed = false;

  try {
    // Calculate combined bounds for all squares
    const combinedBounds = calculateCombinedBounds(squares.map(s => s.bounds));

    const roads = await fetchRoadsInArea(combinedBounds, bikeType);

    if (roads.length > 0) {
      // Step 3: Optimize waypoints using road data
      const optimization = optimizeWaypoints(squares, roads);
      optimizedWaypoints = optimization.waypoints;
    } else {
      roadFetchFailed = true;
    }
  } catch (error) {
    roadFetchFailed = true;
  }

  // Fallback to square centers if road fetch failed
  if (roadFetchFailed || !optimizedWaypoints) {
    optimizedWaypoints = squares.map((s, i) => ({
      lat: s.lat,
      lon: s.lon,
      squareIndex: i,
      hasRoad: false,
      type: 'center-fallback'
    }));
  }

  // Step 4: Solve TSP to get optimal order
  const waypointCoords = optimizedWaypoints.map(wp => ({ lat: wp.lat, lon: wp.lon, type: wp.type, hasRoad: wp.hasRoad }));
  const tspResult = solveTSP(waypointCoords, startPoint, roundtrip);

  // Helper function to build route response
  const buildRouteResponse = (result, waypoints, options = {}) => {
    const routeData = parseBRouterResponse(result.geojson);
    return {
      ...routeData,
      waypoints,
      allSquares: tspResult.route,
      straightLineDistance: tspResult.distance,
      profileUsed: result.profile,
      roadAware: options.roadAware ?? !roadFetchFailed,
      simplified: options.simplified ?? false,
      minimal: options.minimal ?? false
    };
  };

  // Step 5: Initialize simplification strategy
  const simplification = new SimplificationStrategy(tspResult.route);
  let finalWaypoints = tspResult.route;

  if (tspResult.route.length > 20) {
    finalWaypoints = simplification.nextLevel().waypoints;
  }

  // Step 6: Define profile fallback order
  const profileFallbacks = {
    'trekking': ['fastbike', 'trekking-ignore-cr', 'trekking-noferries'],
    'gravel': ['trekking', 'fastbike'],
    'fastbike': ['trekking', 'fastbike-lowtraffic']
  };
  const profilesToTry = [bikeType, ...(profileFallbacks[bikeType] || [])];

  // Step 7: Strategy 1 - Try all profiles with current waypoints
  let result = await tryProfilesWithFallback(profilesToTry, finalWaypoints, apiUrl);

  if (result.success) {
    return buildRouteResponse(result, finalWaypoints);
  }

  // Step 8: Strategy 2 - If coverage error, try with more aggressive simplification
  if (isCoverageError(result.error) && simplification.hasMoreLevels()) {
    finalWaypoints = simplification.nextLevel().waypoints;
    result = await tryProfilesWithFallback(profilesToTry, finalWaypoints, apiUrl);

    if (result.success) {
      return buildRouteResponse(result, finalWaypoints, { simplified: true });
    }
  }

  // Step 9: Strategy 3 - Final fallback with minimal waypoints
  if (finalWaypoints.length > 3) {
    const minimalWaypoints = createMinimalWaypoints(finalWaypoints);
    result = await tryProfilesWithFallback([bikeType], minimalWaypoints, apiUrl);

    if (result.success) {
      return buildRouteResponse(result, minimalWaypoints, { simplified: true, minimal: true });
    }
  }

  // All strategies exhausted
  throw new Error(`Routing fehlgeschlagen nach allen Strategien: ${result.error.message}. Möglicherweise liegen einige Quadrate außerhalb der verfügbaren Routingdaten. Versuchen Sie es mit weniger Quadraten (< 15).`);
}

/**
 * Format time in HH:MM format
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}
