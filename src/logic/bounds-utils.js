/**
 * Bounds Utilities
 *
 * Unified handling of different bounds format representations across the codebase.
 * Normalizes between array format, object format, and nested bounds objects.
 */

/**
 * Normalize bounds from any format to standard {south, north, east, west}
 *
 * Handles:
 * - Array format: [[south, west], [north, east]]
 * - Object with bounds property: {bounds: {south, north, east, west}}
 * - Direct object: {south, north, east, west}
 * - Min/Max format: {minLat, maxLat, minLon, maxLon}
 *
 * @param {Array|Object} bounds - Bounds in any supported format
 * @returns {Object} Normalized bounds {south, north, east, west}
 */
export function normalizeBounds(bounds) {
  // Array format: [[south, west], [north, east]]
  if (Array.isArray(bounds)) {
    return {
      south: bounds[0][0],
      west: bounds[0][1],
      north: bounds[1][0],
      east: bounds[1][1]
    };
  }

  // Has nested bounds property
  if (bounds.bounds) {
    return normalizeBounds(bounds.bounds); // Recursive call
  }

  // Min/Max format
  if (bounds.minLat !== undefined || bounds.maxLat !== undefined) {
    return {
      south: bounds.minLat ?? bounds.south,
      north: bounds.maxLat ?? bounds.north,
      west: bounds.minLon ?? bounds.west,
      east: bounds.maxLon ?? bounds.east
    };
  }

  // Already in standard format or close enough
  return {
    south: bounds.south,
    north: bounds.north,
    west: bounds.west,
    east: bounds.east
  };
}

/**
 * Convert normalized bounds to array format [[south, west], [north, east]]
 * @param {Object} bounds - Normalized bounds {south, north, east, west}
 * @returns {Array} Bounds in array format
 */
export function boundsToArray(bounds) {
  const normalized = normalizeBounds(bounds);
  return [
    [normalized.south, normalized.west],
    [normalized.north, normalized.east]
  ];
}

/**
 * Convert normalized bounds to min/max format
 * @param {Object} bounds - Normalized bounds {south, north, east, west}
 * @returns {Object} Bounds as {minLat, maxLat, minLon, maxLon}
 */
export function boundsToMinMax(bounds) {
  const normalized = normalizeBounds(bounds);
  return {
    minLat: normalized.south,
    maxLat: normalized.north,
    minLon: normalized.west,
    maxLon: normalized.east
  };
}

/**
 * Check if a point is within bounds
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object|Array} bounds - Bounds in any format
 * @returns {boolean} True if point is inside bounds
 */
export function isPointInBounds(lat, lon, bounds) {
  const normalized = normalizeBounds(bounds);
  return lat >= normalized.south &&
         lat <= normalized.north &&
         lon >= normalized.west &&
         lon <= normalized.east;
}

/**
 * Calculate the center point of bounds
 * @param {Object|Array} bounds - Bounds in any format
 * @returns {Object} Center point {lat, lon}
 */
export function getBoundsCenter(bounds) {
  const normalized = normalizeBounds(bounds);
  return {
    lat: (normalized.south + normalized.north) / 2,
    lon: (normalized.west + normalized.east) / 2
  };
}

/**
 * Expand bounds by a margin in degrees
 * @param {Object|Array} bounds - Bounds in any format
 * @param {number} margin - Margin to add in degrees
 * @returns {Object} Expanded bounds {south, north, east, west}
 */
export function expandBounds(bounds, margin) {
  const normalized = normalizeBounds(bounds);
  return {
    south: normalized.south - margin,
    north: normalized.north + margin,
    west: normalized.west - margin,
    east: normalized.east + margin
  };
}

/**
 * Combine multiple bounds into one that encompasses all
 * @param {Array} boundsArray - Array of bounds in any format
 * @returns {Object} Combined bounds {south, north, east, west}
 */
export function combineBounds(boundsArray) {
  if (boundsArray.length === 0) {
    throw new Error('Cannot combine empty bounds array');
  }

  const normalized = boundsArray.map(b => normalizeBounds(b));

  return {
    south: Math.min(...normalized.map(b => b.south)),
    north: Math.max(...normalized.map(b => b.north)),
    west: Math.min(...normalized.map(b => b.west)),
    east: Math.max(...normalized.map(b => b.east))
  };
}
