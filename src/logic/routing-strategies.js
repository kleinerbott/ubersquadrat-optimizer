/**
 * Routing Strategies Module
 *
 * Extracted error handling and fallback strategies for BRouter routing.
 * Separates routing logic from route calculation for better testability.
 */

import * as turf from '@turf/turf';
import { callBRouterAPI } from './router.js';

/**
 * Simplify waypoints by removing intermediate points that are very close together
 * Uses Turf.js distance calculation for accuracy
 *
 * @param {Array} waypoints - Array of {lat, lon} waypoints
 * @param {number} minDistance - Minimum distance between waypoints in km (default 0.5 km)
 * @returns {Array} Simplified waypoint array
 */
export function simplifyWaypoints(waypoints, minDistance = 0.5) {
  if (waypoints.length <= 2) return waypoints;

  const simplified = [waypoints[0]]; // Always keep start point
  let lastKept = waypoints[0];

  for (let i = 1; i < waypoints.length - 1; i++) {
    // Use Turf.js for accurate geodesic distance calculation
    const from = turf.point([lastKept.lon, lastKept.lat]);
    const to = turf.point([waypoints[i].lon, waypoints[i].lat]);
    const distance = turf.distance(from, to, { units: 'kilometers' });

    // Keep waypoint if far enough from last kept point
    if (distance >= minDistance) {
      simplified.push(waypoints[i]);
      lastKept = waypoints[i];
    }
  }

  // Always keep end point
  simplified.push(waypoints[waypoints.length - 1]);

  return simplified;
}

/**
 * Strategy 1: Waypoint Simplification
 * Progressively reduces waypoint count (0.5km → 1.0km → 1.5km thresholds)
 */
export class SimplificationStrategy {
  constructor(waypoints) {
    this.originalWaypoints = waypoints;
    this.levels = [
      { threshold: 0.5, name: 'level-1' },
      { threshold: 1.0, name: 'level-2-aggressive' },
      { threshold: 1.5, name: 'level-3-very-aggressive' }
    ];
    this.currentLevel = -1;
  }

  hasMoreLevels() {
    return this.currentLevel < this.levels.length - 1;
  }

  nextLevel() {
    this.currentLevel++;
    const level = this.levels[this.currentLevel];
    return {
      waypoints: simplifyWaypoints(this.originalWaypoints, level.threshold),
      level: this.currentLevel,
      name: level.name
    };
  }

  getCurrentLevel() {
    return this.currentLevel;
  }
}

/**
 * Strategy 2: Profile Fallback
 * Tries multiple BRouter profiles with automatic fallback
 *
 * @param {Array} profiles - Array of profile names to try
 * @param {Array} waypoints - Array of waypoints
 * @param {string} apiUrl - BRouter API URL
 * @returns {Promise<Object>} {success, geojson, profile, attemptNumber, error}
 */
export async function tryProfilesWithFallback(profiles, waypoints, apiUrl) {
  let lastError = null;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];

    try {
      const geojson = await callBRouterAPI(waypoints, profile, apiUrl);
      return {
        success: true,
        geojson,
        profile,
        attemptNumber: i + 1
      };
    } catch (error) {
      lastError = error;

      // Don't try more profiles if it's not a coverage error
      if (!isCoverageError(error)) {
        break;
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Strategy 3: Minimal Waypoint Fallback
 * Reduces to start + end + max 8 intermediate points
 *
 * @param {Array} waypoints - Original waypoints
 * @returns {Array} Minimal waypoint set
 */
export function createMinimalWaypoints(waypoints) {
  if (waypoints.length <= 3) return waypoints;

  const minimal = [waypoints[0]]; // Start
  const step = Math.ceil((waypoints.length - 2) / Math.min(8, waypoints.length - 2));

  for (let i = step; i < waypoints.length - 1; i += step) {
    minimal.push(waypoints[i]);
  }

  minimal.push(waypoints[waypoints.length - 1]); // End

  return minimal;
}

/**
 * Helper: Detect coverage errors from BRouter
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if error indicates data coverage issue
 */
export function isCoverageError(error) {
  return error.message.includes('nicht verfügbaren Kartenbereichs') ||
         error.message.includes('not mapped');
}
