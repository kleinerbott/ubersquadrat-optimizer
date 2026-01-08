/**
 * Square Optimizer
 *
 * 5-phase strategic optimization algorithm that recommends which new squares
 * to visit next to efficiently expand the covered area.
 *
 * Phase 1: Edge Analysis - Analyze N/S/E/W edge completion percentages
 * Phase 2: Hole Detection - Find contiguous unvisited regions
 * Phase 3: Candidate Collection - Find all unvisited squares within search radius
 * Phase 4: Strategic Scoring - Multi-factor scoring (layer, holes, edges, adjacency)
 * Phase 5: Greedy Selection - Select best squares minimizing travel distance
 */

// ===== CONSTANTS =====

/**
 * Mode-specific scoring multipliers
 * - edge: Prioritize edge expansion
 * - holes: Prioritize filling gaps
 * - balanced: Equal weight to both
 */
export const MODE_MULTIPLIERS = {
  edge: { edge: 3, hole: 0.3 },
  holes: { edge: 0.3, hole: 2 },
  balanced: { edge: 1, hole: 1 }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Convert grid coordinates (i,j) to rectangle bounds [lat,lon]
 */
export function rectFromIJ(i, j, originLat, originLon, LAT_STEP, LON_STEP) {
  const s = originLat + i * LAT_STEP;
  const w = originLon + j * LON_STEP;
  const n = s + LAT_STEP;
  const e = w + LON_STEP;
  return [[s, w], [n, e]];
}

/**
 * Convert square coordinates to "i,j" key string
 */
export function getSquareKey(i, j) {
  return `${i},${j}`;
}

/**
 * Parse "i,j" key string to {i, j} coordinates
 */
export function parseSquareKey(key) {
  const [i, j] = key.split(',').map(Number);
  return { i, j };
}

/**
 * Calculate layer distance from Übersquadrat border
 * Returns {distI, distJ, total} where total is Manhattan distance
 */
export function calculateLayerDistance(i, j, base) {
  const distI = Math.max(0, Math.max(base.minI - i - 1, i - base.maxI - 1));
  const distJ = Math.max(0, Math.max(base.minJ - j - 1, j - base.maxJ - 1));
  return { distI, distJ, total: distI + distJ };
}

/**
 * Calculate Manhattan distance between two grid points
 */
export function manhattanDistance(p1, p2) {
  return Math.abs(p1.i - p2.i) + Math.abs(p1.j - p2.j);
}

/**
 * Get search area bounds around Übersquadrat
 * @param {number} radius - Number of layers to search (default: 5)
 */
export function getSearchBounds(base, radius = 5) {
  return {
    minI: base.minI - radius,
    maxI: base.maxI + radius,
    minJ: base.minJ - radius,
    maxJ: base.maxJ + radius
  };
}

/**
 * Get keys of 4 neighboring squares (N, S, E, W)
 */
export function getNeighborKeys(i, j) {
  return [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].map(([ni, nj]) => `${ni},${nj}`);
}

/**
 * Check if square is on the immediate border (Layer 0) of Übersquadrat
 */
export function isOnUbersquadratBorder(i, j, base) {
  return (
    (i === base.maxI + 1 && j >= base.minJ - 1 && j <= base.maxJ + 1) ||
    (i === base.minI - 1 && j >= base.minJ - 1 && j <= base.maxJ + 1) ||
    (j === base.maxJ + 1 && i >= base.minI - 1 && i <= base.maxI + 1) ||
    (j === base.minJ - 1 && i >= base.minI - 1 && i <= base.maxI + 1)
  );
}

// ===== EDGE ANALYSIS =====

/**
 * Analyze a single edge (N, S, E, or W) of the Übersquadrat
 * Returns edge completion statistics
 */
export function analyzeEdge(name, fixedCoord, start, end, type, visitedSet) {
  const squares = [];
  let unvisitedCount = 0;

  for (let k = start; k <= end; k++) {
    const [i, j] = type === 'row' ? [fixedCoord, k] : [k, fixedCoord];
    const key = `${i},${j}`;
    const visited = visitedSet.has(key);

    squares.push({ i, j, key, visited });
    if (!visited) unvisitedCount++;
  }

  const total = end - start + 1;
  const visitedCount = total - unvisitedCount;
  const completion = (visitedCount / total) * 100;

  return {
    name,
    squares,
    total,
    unvisitedCount,
    visitedCount,
    completion,
    canExpand: unvisitedCount === 0
  };
}

/**
 * Analyze all 4 edges of the Übersquadrat
 * Returns {N, S, E, W} edge analysis objects
 */
export function analyzeEdges(base, visitedSet) {
  const edges = {
    N: analyzeEdge('N', base.maxI + 1, base.minJ, base.maxJ, 'row', visitedSet),
    S: analyzeEdge('S', base.minI - 1, base.minJ, base.maxJ, 'row', visitedSet),
    E: analyzeEdge('E', base.maxJ + 1, base.minI, base.maxI, 'col', visitedSet),
    W: analyzeEdge('W', base.minJ - 1, base.minI, base.maxI, 'col', visitedSet)
  };

  return edges;
}

// ===== HOLE DETECTION =====

/**
 * Flood-fill algorithm to find contiguous unvisited regions
 * @param {number} startI - Starting i coordinate
 * @param {number} startJ - Starting j coordinate
 * @param {Set} visited - Set of already processed squares (modified in-place)
 * @param {Function} isInBounds - Function to check if (i,j) is in search area
 * @param {Set} visitedSet - Set of visited squares from KML
 * @returns {Array} Array of {i, j, key} objects in the contiguous region
 */
export function findContiguousRegion(startI, startJ, visited, isInBounds, visitedSet) {
  const region = [];
  const queue = [[startI, startJ]];
  const regionVisited = new Set();
  const startKey = `${startI},${startJ}`;
  regionVisited.add(startKey);

  while (queue.length > 0) {
    const [i, j] = queue.shift();
    const key = `${i},${j}`;

    // Skip if already visited by overall algorithm or in visited set
    if (visited.has(key) || visitedSet.has(key)) continue;
    if (!isInBounds(i, j)) continue;

    region.push({ i, j, key });
    visited.add(key);

    // Check 4 neighbors
    const neighborKeys = getNeighborKeys(i, j);
    const neighbors = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]];

    for (let idx = 0; idx < neighbors.length; idx++) {
      const [ni, nj] = neighbors[idx];
      const nKey = neighborKeys[idx];
      if (!regionVisited.has(nKey) && !visitedSet.has(nKey) && isInBounds(ni, nj)) {
        regionVisited.add(nKey);
        queue.push([ni, nj]);
      }
    }
  }

  return region;
}

/**
 * Detect all holes (contiguous unvisited regions) within search area
 * @param {Object} base - Übersquadrat bounds {minI, maxI, minJ, maxJ}
 * @param {Set} visitedSet - Set of "i,j" visited squares
 * @param {number} maxHoleSize - Maximum hole size to keep (1-20)
 * @returns {Array} Array of hole objects {id, squares, size, avgLayer}
 */
export function detectHoles(base, visitedSet, maxHoleSize, LAT_STEP, LON_STEP, originLat, originLon) {
  const searchBounds = getSearchBounds(base, 5);

  function isInSearchBounds(i, j) {
    return (
      i >= searchBounds.minI && i <= searchBounds.maxI &&
      j >= searchBounds.minJ && j <= searchBounds.maxJ
    );
  }

  const holes = [];
  const processedSquares = new Set();

  // Scan search area to find all holes
  for (let i = searchBounds.minI; i <= searchBounds.maxI; i++) {
    for (let j = searchBounds.minJ; j <= searchBounds.maxJ; j++) {
      const key = `${i},${j}`;

      if (processedSquares.has(key) || visitedSet.has(key)) continue;

      // Found an unvisited square - find its contiguous region
      const region = findContiguousRegion(i, j, processedSquares, isInSearchBounds, visitedSet);

      if (region.length > 0) {
        // Calculate average layer distance for this hole
        let totalLayerDist = 0;
        region.forEach(sq => {
          totalLayerDist += calculateLayerDistance(sq.i, sq.j, base).total;
        });
        const avgLayer = totalLayerDist / region.length;

        const hole = {
          id: holes.length,
          squares: region,
          size: region.length,
          avgLayer: avgLayer
        };
        holes.push(hole);
      }
    }
  }

  const validHoles = holes.filter(h => h.size <= maxHoleSize);

  return validHoles;
}

/**
 * Build map of square keys to their containing holes
 * @param {Array} holes - Array of hole objects
 * @returns {Map} Map of "i,j" → hole object
 */
export function buildHoleMap(holes) {
  const squareToHoleMap = new Map();
  holes.forEach(hole => {
    hole.squares.forEach(sq => {
      squareToHoleMap.set(sq.key, hole);
    });
  });
  return squareToHoleMap;
}

// ===== MAIN OPTIMIZER =====

/**
 * Main optimization entry point
 *
 * @param {Object} base - Übersquadrat bounds {minI, maxI, minJ, maxJ}
 * @param {number} targetNew - Number of new squares to recommend
 * @param {Array} direction - Selected directions ['N', 'S', 'E', 'W']
 * @param {Set} visitedSet - Set of "i,j" visited squares
 * @param {number} LAT_STEP - Grid cell height (degrees)
 * @param {number} LON_STEP - Grid cell width (degrees)
 * @param {number} originLat - Grid origin latitude
 * @param {number} originLon - Grid origin longitude
 * @param {string} optimizationMode - 'balanced', 'edge', or 'holes'
 * @param {number} maxHoleSize - Maximum hole size to consider (1-20)
 * @returns {Object} {rectangles, metadata} - Array of rectangle bounds and metadata
 */
export function optimizeSquare(
  base,
  targetNew,
  direction,
  visitedSet,
  LAT_STEP,
  LON_STEP,
  originLat,
  originLon,
  optimizationMode = 'balanced',
  maxHoleSize = 5
) {
  // === PHASE 1: EDGE ANALYSIS ===
  const edges = analyzeEdges(base, visitedSet);

  // === PHASE 2: HOLE DETECTION ===
  const holes = detectHoles(base, visitedSet, maxHoleSize, LAT_STEP, LON_STEP, originLat, originLon);
  const squareToHoleMap = buildHoleMap(holes);

  // === PHASE 3: FIND ALL PERIMETER SQUARES ===
  function findPerimeterSquares() {
    const candidates = new Map();
    const bounds = getSearchBounds(base, 5);

    // Check each square in the search area
    for (let i = bounds.minI; i <= bounds.maxI; i++) {
      for (let j = bounds.minJ; j <= bounds.maxJ; j++) {
        const key = `${i},${j}`;

        // Skip if already visited
        if (visitedSet.has(key)) continue;

        // CRITICAL: Only consider squares OUTSIDE the ubersquadrat
        const positions = {
          N: i > base.maxI,
          S: i < base.minI,
          E: j > base.maxJ,
          W: j < base.minJ
        };

        // Calculate layer distance from ubersquadrat boundary
        const layerDist = calculateLayerDistance(i, j, base).total;

        // Only include squares within searchRadius layers from ubersquadrat
        if (layerDist > 5) continue;

        // Determine which edge based on position relative to ubersquadrat boundary
        const edge = Object.keys(positions).filter(k => positions[k]).join('');

        candidates.set(key, { i, j, edge, key });
      }
    }

    return Array.from(candidates.values());
  }

  const allCandidates = findPerimeterSquares();
  const unvisited = allCandidates.filter(c => !visitedSet.has(`${c.i},${c.j}`));

  // === PHASE 4: STRATEGIC SCORING ===
  const scored = unvisited.map(square => {
    let score = 100;

    // Initialize score breakdown
    const scoreBreakdown = {
      base: 100,
      layerScore: 0,
      edgeBonus: 0,
      holeBonus: 0,
      adjacencyBonus: 0
    };

    // === LAYER DISTANCE (Primary factor) ===
    const isBorder = isOnUbersquadratBorder(square.i, square.j, base);
    const layerDistance = isBorder ? 0 : calculateLayerDistance(square.i, square.j, base).total;

    // Strongly prioritize proximity with bonuses AND penalties
    if (layerDistance === 0) scoreBreakdown.layerScore = 10000;
    else if (layerDistance === 1) scoreBreakdown.layerScore = 5000;
    else if (layerDistance === 2) scoreBreakdown.layerScore = 2000;
    else if (layerDistance === 3) scoreBreakdown.layerScore = 500;
    else if (layerDistance === 4) scoreBreakdown.layerScore = -2000;
    else if (layerDistance >= 5) scoreBreakdown.layerScore = -10000;

    score += scoreBreakdown.layerScore;

    // === EDGE COMPLETION ===
    const maxEdgeCompletion = ['N', 'S', 'E', 'W']
      .filter(dir => square.edge.includes(dir))
      .reduce((max, dir) => Math.max(max, edges[dir].completion), 0);
    let edgeBonusRaw = Math.floor(maxEdgeCompletion * 5);

    // === HOLE FILLING ===
    const squareKey = `${square.i},${square.j}`;
    const hole = squareToHoleMap.get(squareKey);
    let holeSizeBonusRaw = 0;
    let holeCompletionBonus = 0;

    if (hole) {
      // Reduce base multiplier: 2000 → 800
      // Apply layer-based reduction
      let holeMultiplier = 800;
      if (layerDistance >= 3) holeMultiplier = 400; // 50%
      if (layerDistance >= 5) holeMultiplier = 200; // 25%

      holeSizeBonusRaw = hole.size * holeMultiplier;

      // Keep completion bonus but reduce: 3000 → 1500
      const unvisitedInHole = hole.squares.filter(
        sq => !visitedSet.has(sq.key) && sq.key !== squareKey
      ).length;
      if (unvisitedInHole === 0) {
        holeCompletionBonus = 1500;
        score += holeCompletionBonus;
      }
    }

    // === MODE MULTIPLIERS ===
    const mult = MODE_MULTIPLIERS[optimizationMode] || MODE_MULTIPLIERS.balanced;
    scoreBreakdown.edgeBonus = Math.floor(edgeBonusRaw * mult.edge);
    scoreBreakdown.holeBonus = Math.floor(holeSizeBonusRaw * mult.hole);

    score += scoreBreakdown.edgeBonus + scoreBreakdown.holeBonus;

    // === ADJACENCY ===
    const adjacency = getNeighborKeys(square.i, square.j).filter(n => visitedSet.has(n)).length;
    scoreBreakdown.adjacencyBonus = adjacency * 25;
    score += scoreBreakdown.adjacencyBonus;

    // === DIRECTION FILTER ===
    // direction is now an array of selected directions (e.g., ['N', 'E'])
    if (Array.isArray(direction) && direction.length < 4) {
      // Not all directions selected - apply filtering
      const matches = {
        N: square.i > base.maxI,
        S: square.i < base.minI,
        E: square.j > base.maxJ,
        W: square.j < base.minJ
      };

      // Check if square matches ANY of the selected directions
      const matchesAnyDirection = direction.some(dir => matches[dir]);

      // If doesn't match any selected direction, apply penalty
      if (!matchesAnyDirection) score -= 1000000;
    }
    // If all 4 directions selected or not an array, no filtering (all squares allowed)

    return { ...square, score, scoreBreakdown, layerDistance, hole };
  });

  // === PHASE 5: GREEDY ROUTE SELECTION ===
  const selected = [];
  const remaining = [...scored];

  if (remaining.length === 0) {
    return { rectangles: [], metadata: [] };
  }

  // Select first square (highest score)
  remaining.sort((a, b) => b.score - a.score);
  selected.push(remaining.shift());

  // Greedily select remaining squares (proximity + hole completion)
  while (selected.length < targetNew && remaining.length > 0) {
    const last = selected[selected.length - 1];

    remaining.forEach(sq => {
      const dist = manhattanDistance(sq, last);
      sq.routeScore = sq.score - dist * 100;

      // Bonus: Complete holes that have started to be filled
      const sqHole = squareToHoleMap.get(`${sq.i},${sq.j}`);
      if (sqHole && selected.some(s => squareToHoleMap.get(`${s.i},${s.j}`)?.id === sqHole.id)) {
        sq.routeScore += 1500;
      }
    });

    remaining.sort((a, b) => b.routeScore - a.routeScore);
    selected.push(remaining.shift());
  }

  // Create rectangles
  const rectangles = selected.map(s => rectFromIJ(s.i, s.j, originLat, originLon, LAT_STEP, LON_STEP));

  // Create metadata for each selected square
  const metadata = selected.map((s, index) => ({
    bounds: rectangles[index],
    gridCoords: { i: s.i, j: s.j },
    score: s.score,
    scoreBreakdown: s.scoreBreakdown,
    layerDistance: s.layerDistance,
    selectionOrder: index + 1,
    edge: s.edge && s.edge.length > 0 ? s.edge : undefined,
    hole: s.hole ? { size: s.hole.size, id: s.hole.id } : undefined
  }));

  return {
    rectangles,
    metadata
  };
}
