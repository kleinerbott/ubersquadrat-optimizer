/**
 * Router Module - BRouter Integration for Bicycle Routing
 *
 * Handles route calculation through proposed squares using BRouter API,
 * TSP optimization, and road-aware waypoint selection.
 */

import * as turf from '@turf/turf';
import { solveTSP, calculateRouteDistance } from './tsp-solver.js';
import { fetchRoadsInArea } from './road-fetcher.js';
import { optimizeWaypoints, optimizeWaypointsWithSequence, calculateCombinedBounds } from './waypoint-optimizer.js';
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

  // ════════════════════════════════════════════════════════════════
  // OPTION C: Two-Phase Approach for Optimal Route
  // ════════════════════════════════════════════════════════════════
  // Phase 1: Find optimal visit order using rough waypoints
  // Phase 2: Optimize waypoints for that specific order
  // ════════════════════════════════════════════════════════════════

  let finalWaypoints;
  let roadFetchFailed = false;

  try {
    // Calculate combined bounds for all squares
    const combinedBounds = calculateCombinedBounds(squares.map(s => s.bounds));

    // Fetch roads once for both phases
    const roads = await fetchRoadsInArea(combinedBounds, bikeType);

    console.log(`[Router] Fetched ${roads.length} roads for area`);

    if (roads.length > 0) {
      // ────────────────────────────────────────────────────────────
      // PHASE 1: Find optimal visit order
      // ────────────────────────────────────────────────────────────
      console.log(`[Router] Phase 1: Finding optimal visit order...`);

      // Optimize waypoints WITHOUT sequence (neutral, just find roads)
      const roughOptimization = optimizeWaypoints(squares, roads);
      const roughWaypoints = roughOptimization.waypoints;

      console.log(`[Router] Phase 1: Rough waypoints - ${roughOptimization.statistics.withRoads}/${roughOptimization.statistics.total} on roads`);

      // Solve TSP with these rough waypoints to get FINAL visit order
      const roughWaypointCoords = roughWaypoints.map(wp => ({ lat: wp.lat, lon: wp.lon }));
      const tspResult = solveTSP(roughWaypointCoords, startPoint, roundtrip);

      console.log(`[Router] Phase 1: TSP distance = ${tspResult.distance.toFixed(2)} km`);

      // ────────────────────────────────────────────────────────────
      // PHASE 2: Optimize waypoints for this specific order
      // ────────────────────────────────────────────────────────────
      console.log(`[Router] Phase 2: Optimizing waypoints for visit order...`);

      // Extract squares only from TSP route (remove startPoint)
      let routeSquaresOnly = tspResult.route.filter((waypoint, idx) => {
        // Skip first point (always startPoint)
        if (idx === 0) return false;
        // Skip last point if roundtrip (also startPoint)
        if (roundtrip && idx === tspResult.route.length - 1) return false;
        return true;
      });

      // Map TSP waypoints back to original squares with bounds
      const orderedSquares = routeSquaresOnly.map((waypoint, idx) => {
        // Find the original square that matches this waypoint
        const matchingSquare = squares.find(s => {
          // Match by finding the rough waypoint
          const roughWp = roughWaypoints.find(rw =>
            Math.abs(rw.lat - waypoint.lat) < 0.0001 &&
            Math.abs(rw.lon - waypoint.lon) < 0.0001
          );
          if (!roughWp) return false;

          // Match rough waypoint back to square
          return roughWp.squareIndex !== undefined &&
                 squares[roughWp.squareIndex] === s;
        });

        if (!matchingSquare) {
          console.warn(`[Router] Phase 2: No matching square found for waypoint ${idx}`);
        }

        return matchingSquare || { ...waypoint, bounds: null };
      });

      console.log(`[Router] Phase 2: Matched ${orderedSquares.filter(s => s.bounds).length}/${orderedSquares.length} squares with bounds`);

      // Optimize waypoints WITH SEQUENCE for this specific order
      const fineOptimization = optimizeWaypointsWithSequence(orderedSquares, roads, startPoint, roundtrip);
      finalWaypoints = fineOptimization.waypoints;

      console.log(`[Router] Phase 2: Fine waypoints - ${fineOptimization.statistics.sequenceOptimized}/${fineOptimization.statistics.total} sequence-optimized`);
      console.log(`[Router] ✓ Two-phase optimization complete`);

    } else {
      console.warn('[Router] No roads found in area - falling back to centers');
      roadFetchFailed = true;
    }
  } catch (error) {
    console.error('[Router] Road fetching failed:', error);
    roadFetchFailed = true;
  }

  // Fallback if road fetch failed: use square centers
  if (roadFetchFailed || !finalWaypoints) {
    console.log('[Router] Using fallback: square centers');
    const centerWaypoints = squares.map(s => ({ lat: s.lat, lon: s.lon }));
    const tspResult = solveTSP(centerWaypoints, startPoint, roundtrip);

    finalWaypoints = tspResult.route.filter((wp, idx) => {
      if (idx === 0) return false;
      if (roundtrip && idx === tspResult.route.length - 1) return false;
      return true;
    }).map((wp, i) => ({
      lat: wp.lat,
      lon: wp.lon,
      squareIndex: i,
      hasRoad: false,
      type: 'center-fallback'
    }));
  }

  // Build final route (order is already determined by Phase 1 TSP)
  const finalRoute = [startPoint, ...finalWaypoints, ...(roundtrip ? [startPoint] : [])];
  const finalDistance = calculateRouteDistance(finalRoute);
  const finalTspResult = { route: finalRoute, distance: finalDistance };

  // Helper function to build route response
  const buildRouteResponse = (result, waypoints, options = {}) => {
    const routeData = parseBRouterResponse(result.geojson);
    return {
      ...routeData,
      waypoints,
      allSquares: finalTspResult.route,
      straightLineDistance: finalTspResult.distance,
      profileUsed: result.profile,
      roadAware: options.roadAware ?? !roadFetchFailed,
      simplified: options.simplified ?? false,
      minimal: options.minimal ?? false
    };
  };

  // Step 5: Initialize simplification strategy
  const simplification = new SimplificationStrategy(finalTspResult.route);
  finalWaypoints = finalTspResult.route;

  if (finalTspResult.route.length > 20) {
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
