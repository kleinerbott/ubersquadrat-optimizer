/**
 * TSP (Traveling Salesman Problem) Solver
 * Uses Turf.js for distance calculations and heuristic algorithms for route optimization.
 */

import * as turf from '@turf/turf';

/**
 * Nearest Neighbor algorithm for TSP using Turf.js nearestPoint
 * Greedy approach: always visit the nearest unvisited point
 * @param {Array} points - Array of {lat, lon} points to visit
 * @param {Object} startPoint - Starting point {lat, lon}
 * @param {boolean} roundtrip - Whether to return to start
 * @returns {Array} Ordered array of points
 */
export function nearestNeighbor(points, startPoint, roundtrip = false) {
  if (points.length === 0) return [startPoint];
  if (points.length === 1) {
    return roundtrip ? [startPoint, points[0], startPoint] : [startPoint, points[0]];
  }

  const unvisited = [...points];
  const route = [startPoint];
  let current = turf.point([startPoint.lon, startPoint.lat]);

  while (unvisited.length > 0) {
    // Create feature collection from unvisited points
    const pointsFC = turf.featureCollection(
      unvisited.map((p, idx) => turf.point([p.lon, p.lat], { index: idx }))
    );

    // Use Turf's nearestPoint to find closest unvisited point
    const nearest = turf.nearestPoint(current, pointsFC);
    const nearestIndex = nearest.properties.index;
    const nearestPoint = unvisited[nearestIndex];

    route.push(nearestPoint);
    current = turf.point([nearestPoint.lon, nearestPoint.lat]);
    unvisited.splice(nearestIndex, 1);
  }

  if (roundtrip) {
    route.push(startPoint);
  }

  return route;
}

/**
 * Calculate total route distance using Turf.js
 * @param {Array} route - Ordered array of {lat, lon} points
 * @returns {number} Total distance in kilometers
 */
export function calculateRouteDistance(route) {
  if (route.length < 2) return 0;

  // Create linestring from route points
  const coords = route.map(p => [p.lon, p.lat]);
  const line = turf.lineString(coords);
  return turf.length(line, { units: 'kilometers' });
}

/**
 * Solve TSP using nearest neighbor algorithm
 * @param {Array} points - Array of {lat, lon} points to visit
 * @param {Object} startPoint - Starting point {lat, lon}
 * @param {boolean} roundtrip - Whether to return to start
 * @returns {Object} {route: Array, distance: number}
 */
export function solveTSP(points, startPoint, roundtrip = false) {
  const route = nearestNeighbor(points, startPoint, roundtrip);
  const dist = calculateRouteDistance(route);

  return { route, distance: dist };
}
