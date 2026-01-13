/**
 * Waypoint Optimizer Module
 * Finds optimal waypoints on roads within squares using Turf.js
 */

import * as turf from '@turf/turf';
import { normalizeBounds, combineBounds, boundsToMinMax, getBoundsCenter } from './bounds-utils.js';

/**
 * Create a Turf.js polygon from square bounds
 * @param {Object} square - Square with bounds {north, south, east, west} or [[s,w],[n,e]]
 * @returns {Feature<Polygon>}
 */
function squareToPolygon(square) {
  const bounds = normalizeBounds(square);
  return turf.bboxPolygon([bounds.west, bounds.south, bounds.east, bounds.north]);
}


/**
 * Find roads that pass through a square
 * @param {Array} roads - Array of GeoJSON road features
 * @param {Object} square - Square bounds
 * @returns {Array} Roads that intersect the square
 */
function findRoadsInSquare(roads, square) {
  const squarePoly = squareToPolygon(square);
  const intersectingRoads = [];

  let checkedCount = 0;
  let intersectCount = 0;
  let clipFailCount = 0;
  let errorCount = 0;

  for (const road of roads) {
    checkedCount++;
    try {
      // Check if road intersects square
      if (turf.booleanIntersects(road, squarePoly)) {
        intersectCount++;

        // Clip road to square bounds
        const clipped = turf.bboxClip(road, turf.bbox(squarePoly));

        if (clipped.geometry.coordinates.length > 0) {
          intersectingRoads.push({
            original: road,
            clipped: clipped
          });
        } else {
          clipFailCount++;
        }
      }
    } catch (e) {
      // Skip invalid geometries
      errorCount++;
    }
  }

  return intersectingRoads;
}

/**
 * Find the best waypoint on roads within a square
 * Prefers: road intersections > road midpoints > any point on road
 * @param {Array} roadsInSquare - Roads clipped to square
 * @param {Object} square - Square bounds
 * @returns {{lat: number, lon: number} | null}
 */
function findBestWaypointOnRoads(roadsInSquare, square) {
  if (roadsInSquare.length === 0) {
    return null;
  }

  const squareCenter = getBoundsCenter(square);
  const centerPoint = turf.point([squareCenter.lon, squareCenter.lat]);

  // Collect candidate points
  const candidates = [];

  // Strategy 1: Find intersections between roads (best waypoints)
  if (roadsInSquare.length > 1) {
    for (let i = 0; i < roadsInSquare.length; i++) {
      for (let j = i + 1; j < roadsInSquare.length; j++) {
        try {
          const intersections = turf.lineIntersect(
            roadsInSquare[i].clipped,
            roadsInSquare[j].clipped
          );

          if (intersections.features.length > 0) {
            intersections.features.forEach(pt => {
              candidates.push({
                point: pt,
                priority: 3, // Highest priority for intersections
                type: 'intersection'
              });
            });
          }
        } catch (e) {
          // Skip invalid intersections
        }
      }
    }
  }

  // Strategy 2: Midpoints of road segments within square
  for (const road of roadsInSquare) {
    try {
      const coords = road.clipped.geometry.coordinates;
      if (coords.length >= 2) {
        // Get midpoint of the clipped segment
        const midpoint = turf.midpoint(
          turf.point(coords[0]),
          turf.point(coords[coords.length - 1])
        );
        candidates.push({
          point: midpoint,
          priority: 2,
          type: 'midpoint'
        });
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  // Strategy 3: Point on road closest to square center
  for (const road of roadsInSquare) {
    try {
      const nearestPoint = turf.nearestPointOnLine(road.clipped, centerPoint);
      candidates.push({
        point: nearestPoint,
        priority: 1,
        type: 'nearest'
      });
    } catch (e) {
      // Skip invalid geometries
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by priority (descending), then by distance to center (ascending)
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const distA = turf.distance(a.point, centerPoint);
    const distB = turf.distance(b.point, centerPoint);
    return distA - distB;
  });

  // Return best candidate
  const best = candidates[0];
  const coords = best.point.geometry.coordinates;

  return {
    lat: coords[1],
    lon: coords[0],
    type: best.type
  };
}

/**
 * Optimize waypoints for a list of squares using road data
 * @param {Array} squares - Array of square bounds (from optimizer)
 * @param {Array} roads - Array of GeoJSON road features
 * @returns {Object} Result with optimized waypoints and statistics
 */
export function optimizeWaypoints(squares, roads) {
  const results = {
    waypoints: [],
    skippedSquares: [],
    statistics: {
      total: squares.length,
      withRoads: 0,
      withoutRoads: 0,
      intersections: 0,
      midpoints: 0,
      nearest: 0
    }
  };

  for (let i = 0; i < squares.length; i++) {
    const square = squares[i];
    const roadsInSquare = findRoadsInSquare(roads, square);

    // Get square bounds for validation
    const bounds = Array.isArray(square)
      ? { south: square[0][0], west: square[0][1], north: square[1][0], east: square[1][1] }
      : (square.bounds || square);

    if (roadsInSquare.length > 0) {
      const waypoint = findBestWaypointOnRoads(roadsInSquare, square);

      if (waypoint) {
        results.waypoints.push({
          ...waypoint,
          squareIndex: i,
          gridCoords: square.gridCoords, // Use grid coords for unique identification
          hasRoad: true
        });
        results.statistics.withRoads++;

        // Track waypoint type statistics
        if (waypoint.type === 'intersection') results.statistics.intersections++;
        else if (waypoint.type === 'midpoint') results.statistics.midpoints++;
        else results.statistics.nearest++;
      } else {
        // Fallback to center
        const center = getBoundsCenter(square);
        results.waypoints.push({
          ...center,
          squareIndex: i,
          gridCoords: square.gridCoords, // Use grid coords for unique identification
          hasRoad: false,
          type: 'center-fallback'
        });
        results.statistics.withoutRoads++;
        results.skippedSquares.push(i);
      }
    } else {
      // No roads in square - use center as fallback but flag it
      const center = getBoundsCenter(square);
      results.waypoints.push({
        ...center,
        squareIndex: i,
        gridCoords: square.gridCoords, // Use grid coords for unique identification
        hasRoad: false,
        type: 'no-road'
      });
      results.statistics.withoutRoads++;
      results.skippedSquares.push(i);
    }
  }

  return results;
}

/**
 * Check if a road connects to the next square
 * @param {Object} road - Road feature (with original geometry)
 * @param {Object} nextSquare - Next square bounds
 * @returns {boolean} True if road intersects next square
 */
function roadConnectsToNextSquare(road, nextSquare) {
  if (!nextSquare || !nextSquare.bounds) {
    return false;
  }

  try {
    const nextSquarePoly = squareToPolygon(nextSquare);
    return turf.booleanIntersects(road.original, nextSquarePoly);
  } catch (e) {
    return false;
  }
}

/**
 * Find roads that connect current square to next square
 * These are roads that pass through both squares
 * @param {Array} roadsInSquare - Roads in current square
 * @param {Object} nextSquare - Next square bounds
 * @returns {Set} Set of road indices that connect to next square
 */
function findConnectingRoads(roadsInSquare, nextSquare) {
  const connectingIndices = new Set();

  if (!nextSquare || !nextSquare.bounds) {
    return connectingIndices;
  }

  for (let i = 0; i < roadsInSquare.length; i++) {
    if (roadConnectsToNextSquare(roadsInSquare[i], nextSquare)) {
      connectingIndices.add(i);
    }
  }

  return connectingIndices;
}

/**
 * Find the best waypoint considering neighboring squares in the route
 * Uses distance sum to previous and next square for selection
 * Prioritizes roads that connect to the next square
 * @param {Array} roadsInSquare - Roads clipped to square
 * @param {Object} square - Current square bounds
 * @param {Object|null} prevPoint - Previous waypoint {lat, lon} or null
 * @param {Object|null} nextPoint - Next waypoint {lat, lon} or null
 * @param {Object|null} nextSquare - Next square object (with bounds) or null
 * @returns {{lat: number, lon: number} | null}
 */
function findBestWaypointWithNeighbors(roadsInSquare, square, prevPoint, nextPoint, nextSquare = null) {
  if (roadsInSquare.length === 0) {
    return null;
  }

  const squareCenter = getBoundsCenter(square);
  const centerPoint = turf.point([squareCenter.lon, squareCenter.lat]);

  // Find roads that connect to next square (if available)
  const connectingRoads = findConnectingRoads(roadsInSquare, nextSquare);

  // Collect candidate points (same as before)
  const candidates = [];

  // Strategy 1: Find intersections between roads (best waypoints)
  // BOOST priority if intersection is on a connecting road
  if (roadsInSquare.length > 1) {
    for (let i = 0; i < roadsInSquare.length; i++) {
      for (let j = i + 1; j < roadsInSquare.length; j++) {
        try {
          const intersections = turf.lineIntersect(
            roadsInSquare[i].clipped,
            roadsInSquare[j].clipped
          );

          if (intersections.features.length > 0) {
            // Check if either road connects to next square
            const isConnecting = connectingRoads.has(i) || connectingRoads.has(j);

            intersections.features.forEach(pt => {
              candidates.push({
                point: pt,
                priority: isConnecting ? 5 : 3, // BOOST if connecting road
                type: isConnecting ? 'intersection-connecting' : 'intersection',
                isConnecting: isConnecting
              });
            });
          }
        } catch (e) {
          // Skip invalid intersections
        }
      }
    }
  }

  // Strategy 2: Midpoints of road segments within square
  // BOOST if on connecting road
  for (let i = 0; i < roadsInSquare.length; i++) {
    const road = roadsInSquare[i];
    try {
      const coords = road.clipped.geometry.coordinates;
      if (coords.length >= 2) {
        const midpoint = turf.midpoint(
          turf.point(coords[0]),
          turf.point(coords[coords.length - 1])
        );

        const isConnecting = connectingRoads.has(i);
        candidates.push({
          point: midpoint,
          priority: isConnecting ? 4 : 2, // BOOST if connecting road
          type: isConnecting ? 'midpoint-connecting' : 'midpoint',
          isConnecting: isConnecting
        });
      }
    } catch (e) {
      // Skip invalid geometries
    }
  }

  // Strategy 3: Point on road closest to square center or next point
  // BOOST if on connecting road
  const referencePoint = nextPoint
    ? turf.point([nextPoint.lon, nextPoint.lat])
    : centerPoint;

  for (let i = 0; i < roadsInSquare.length; i++) {
    const road = roadsInSquare[i];
    try {
      const nearestPoint = turf.nearestPointOnLine(road.clipped, referencePoint);
      const isConnecting = connectingRoads.has(i);

      candidates.push({
        point: nearestPoint,
        priority: isConnecting ? 3.5 : 1, // BOOST if connecting road
        type: isConnecting ? 'nearest-connecting' : 'nearest',
        isConnecting: isConnecting
      });
    } catch (e) {
      // Skip invalid geometries
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by distance to neighbors if we have prev/next points
  if (prevPoint || nextPoint) {
    candidates.sort((a, b) => {
      // First by priority (intersections preferred)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      // Then by sum of distances to prev and next
      const aPoint = turf.point([a.point.geometry.coordinates[0], a.point.geometry.coordinates[1]]);
      const bPoint = turf.point([b.point.geometry.coordinates[0], b.point.geometry.coordinates[1]]);

      let distA = 0;
      let distB = 0;

      if (prevPoint) {
        const prevTurf = turf.point([prevPoint.lon, prevPoint.lat]);
        distA += turf.distance(aPoint, prevTurf);
        distB += turf.distance(bPoint, prevTurf);
      }

      if (nextPoint) {
        const nextTurf = turf.point([nextPoint.lon, nextPoint.lat]);
        distA += turf.distance(aPoint, nextTurf);
        distB += turf.distance(bPoint, nextTurf);
      }

      return distA - distB; // Lower total distance is better
    });
  } else {
    // Fallback to old logic (distance to center)
    candidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const distA = turf.distance(a.point, centerPoint);
      const distB = turf.distance(b.point, centerPoint);
      return distA - distB;
    });
  }

  // Return best candidate
  const best = candidates[0];
  const coords = best.point.geometry.coordinates;

  if (best.isConnecting) {
    console.log(`[WaypointOptimizer] ✓ Selected ${best.type} waypoint on CONNECTING road (priority ${best.priority})`);
  }

  return {
    lat: coords[1],
    lon: coords[0],
    type: best.type,
    isConnecting: best.isConnecting || false  // Pass through isConnecting flag
  };
}

/**
 * Optimize waypoints considering the route sequence (TSP order)
 * Selects waypoints based on proximity to previous and next squares
 * @param {Array} orderedSquares - Squares in TSP visit order (with lat, lon, bounds)
 * @param {Array} roads - Array of GeoJSON road features
 * @param {Object|null} startPoint - Starting point {lat, lon} or null
 * @param {boolean} roundtrip - Whether this is a roundtrip route
 * @returns {Object} Result with optimized waypoints and statistics
 */
export function optimizeWaypointsWithSequence(orderedSquares, roads, startPoint = null, roundtrip = false) {
  const results = {
    waypoints: [],
    skippedSquares: [],
    statistics: {
      total: orderedSquares.length,
      withRoads: 0,
      withoutRoads: 0,
      intersections: 0,
      midpoints: 0,
      nearest: 0,
      sequenceOptimized: 0,
      connectingRoads: 0 // NEW: Count waypoints on roads connecting to next square
    }
  };


  for (let i = 0; i < orderedSquares.length; i++) {
    const square = orderedSquares[i];

    // Check if square has bounds
    if (!square || !square.bounds) {
      console.warn(`[WaypointOptimizer] Square ${i} has no bounds:`, square);
      const center = square ? { lat: square.lat, lon: square.lon } : { lat: 0, lon: 0 };
      results.waypoints.push({
        ...center,
        squareIndex: i,
        gridCoords: square?.gridCoords, // Use grid coords for unique identification
        hasRoad: false,
        type: 'no-bounds'
      });
      results.statistics.withoutRoads++;
      results.skippedSquares.push(i);
      continue;
    }

    const roadsInSquare = findRoadsInSquare(roads, square);

    // Determine previous and next points
    let prevPoint = null;
    let nextPoint = null;

    if (i === 0) {
      // First square: prev is start point
      prevPoint = startPoint;
    } else {
      // Use previous waypoint if we've already placed one
      if (results.waypoints.length > 0) {
        const prevWaypoint = results.waypoints[results.waypoints.length - 1];
        prevPoint = { lat: prevWaypoint.lat, lon: prevWaypoint.lon };
      }
    }

    // Determine next square for road connection analysis
    let nextSquare = null;
    if (i === orderedSquares.length - 1) {
      // Last square
      if (roundtrip && startPoint) {
        nextPoint = startPoint; // Return to start
      }
      // Otherwise nextPoint stays null
    } else {
      // Next square center as rough approximation
      nextSquare = orderedSquares[i + 1];
      nextPoint = getBoundsCenter(nextSquare);
    }

    if (roadsInSquare.length > 0) {
      const waypoint = findBestWaypointWithNeighbors(roadsInSquare, square, prevPoint, nextPoint, nextSquare);

      if (waypoint) {
        results.waypoints.push({
          ...waypoint,
          squareIndex: i,
          gridCoords: square.gridCoords, // Use grid coords for unique identification
          hasRoad: true
        });
        results.statistics.withRoads++;

        // Track waypoint type statistics
        if (waypoint.type === 'intersection' || waypoint.type === 'intersection-connecting') {
          results.statistics.intersections++;
        } else if (waypoint.type === 'midpoint' || waypoint.type === 'midpoint-connecting') {
          results.statistics.midpoints++;
        } else {
          results.statistics.nearest++;
        }

        // Count if sequence optimization was used
        if (prevPoint || nextPoint) {
          results.statistics.sequenceOptimized++;
        }

        // Count if waypoint is on a connecting road
        if (waypoint.isConnecting) {
          results.statistics.connectingRoads++;
        }
      } else {
        // Fallback to center
        const center = getBoundsCenter(square);
        results.waypoints.push({
          ...center,
          squareIndex: i,
          gridCoords: square.gridCoords, // Use grid coords for unique identification
          hasRoad: false,
          type: 'center-fallback'
        });
        results.statistics.withoutRoads++;
        results.skippedSquares.push(i);
      }
    } else {
      // No roads in square - use center as fallback
      const center = getBoundsCenter(square);
      results.waypoints.push({
        ...center,
        squareIndex: i,
        gridCoords: square.gridCoords, // Use grid coords for unique identification
        hasRoad: false,
        type: 'no-road'
      });
      results.statistics.withoutRoads++;
      results.skippedSquares.push(i);
    }
  }

  // Log summary statistics
  console.log(`[WaypointOptimizer] ✓ Optimization complete:`);
  console.log(`  - ${results.statistics.connectingRoads}/${results.statistics.total} waypoints on connecting roads`);
  console.log(`  - ${results.statistics.intersections} intersections, ${results.statistics.midpoints} midpoints, ${results.statistics.nearest} nearest points`);
  console.log(`  - ${results.statistics.withRoads} with roads, ${results.statistics.withoutRoads} fallback to center`);

  return results;
}

/**
 * Calculate bounds that encompass all squares
 * @param {Array} squares - Array of square bounds
 * @returns {Object} Combined bounds {minLat, maxLat, minLon, maxLon}
 */
export function calculateCombinedBounds(squares) {
  return boundsToMinMax(combineBounds(squares));
}
