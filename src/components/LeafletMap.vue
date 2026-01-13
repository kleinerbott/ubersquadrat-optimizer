<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';
import { CONFIG } from '../logic/config';
import { visualizeUbersquadrat, drawGridLines } from '../logic/grid';

const store = useAppStore();
const { routing } = storeToRefs(store);

// Template refs
const mapContainer = ref(null);

let map = null;
const layers = {
  visited: null,
  proposed: null,
  grid: null,
  route: null
};

onMounted(() => {
  initializeMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

/**
 * Initialize Leaflet map with Layer and click handler
 */
function initializeMap() {
  map = L.map(mapContainer.value, {
    // Touch interaction settings for mobile
    tap: true,                // Enable tap events on mobile
    tapTolerance: 15,         // Pixel tolerance for tap events
    touchZoom: true,          // Pinch to zoom
    bounceAtZoomLimits: true, // Bounce effect when zooming at limits
    dragging: true,           // Touch drag
    zoomControl: true         // Show zoom buttons (helpful on mobile)
  }).setView([51.7, 8.3], 10);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  layers.visited = L.layerGroup().addTo(map);
  layers.proposed = L.layerGroup().addTo(map);
  layers.grid = L.layerGroup().addTo(map);
  layers.route = L.layerGroup().addTo(map);

  map.on('click', handleMapClick);
}

/**
 * Handle map click for start point selection
 */
function handleMapClick(e) {
  if (routing.value.selectingStartPoint) {
    store.setStartPoint(e.latlng.lat, e.latlng.lng);

    // Clear existing route layer but keep start marker
    layers.route.clearLayers();

    // Add start point marker
    L.circleMarker([e.latlng.lat, e.latlng.lng], {
      radius: CONFIG.START_MARKER_RADIUS,
      fillColor: CONFIG.START_MARKER_COLOR,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(layers.route);
  }
}

// Watch for cursor changes when selecting start point
watch(
  () => routing.value.selectingStartPoint,
  (selecting) => {
    if (map) {
      map.getContainer().style.cursor = selecting ? 'crosshair' : '';
    }
  }
);

/**
 * Called when KML is loaded - visualize ubersquadrat and grid
 */
function onKmlLoaded(data) {
  const { gridParams, bounds, kmlLayer } = data;

  // Clear existing layers
  layers.visited.clearLayers();
  layers.proposed.clearLayers();
  layers.grid.clearLayers();
  layers.route.clearLayers();

  // Add the KML layer with visited polygons
  if (kmlLayer) {
    kmlLayer.addTo(layers.visited);
  }

  // Visualize ubersquadrat (blue rectangle)
  visualizeUbersquadrat(gridParams.baseSquare, gridParams, layers.visited);

  // Draw grid lines
  drawGridLines(gridParams.baseSquare, gridParams, layers.grid);

  // Fit map to ubersquadrat bounds
  map.fitBounds([
    [bounds.minLat, bounds.minLon],
    [bounds.maxLat, bounds.maxLon]
  ]);
}

/**
 * Show proposed squares on map with score tooltips and popups
 * @param {Array} squares - Array of rectangle bounds
 * @param {Array} metadata - Array of metadata for each square
 * @param {Array} skippedIndices - Array of indices for skipped squares
 */
function showProposedSquares(squares, metadata = [], skippedIndices = []) {
  layers.proposed.clearLayers();

  squares.forEach((rectangle, index) => {
    const meta = metadata[index];
    const isSkipped = skippedIndices.includes(index);

    // Create rectangle with conditional styling
    const rect = L.rectangle(rectangle, {
      color: isSkipped ? '#d32f2f' : CONFIG.PROPOSED_COLOR, // Red border for skipped
      fillColor: isSkipped ? '#ffcdd2' : CONFIG.PROPOSED_COLOR, // Light red fill for skipped
      fillOpacity: isSkipped ? 0.4 : CONFIG.PROPOSED_OPACITY,
      weight: isSkipped ? 3 : 2 // Thicker border for skipped
    });

    // Add hover tooltip (quick summary)
    if (meta) {
      const tooltipText = isSkipped
        ? `#${meta.selectionOrder}: ÜBERSPRUNGEN (keine Straßen)`
        : `#${meta.selectionOrder}: ${meta.score.toLocaleString()} points`;
      rect.bindTooltip(tooltipText, {
        permanent: false,
        direction: 'top'
      });

      // Add click popup (full details)
      const popupContent = isSkipped
        ? `<div style="color: #d32f2f; font-weight: bold;">Quadrat übersprungen</div><div style="margin-top: 8px;">Keine geeigneten Straßen für gewählten Fahrrad-Typ gefunden.</div>`
        : formatScorePopup(meta);
      rect.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'score-popup'
      });
    }

    rect.addTo(layers.proposed);
  });
}

/**
 * Format detailed score popup content
 */
function formatScorePopup(meta) {
  const {gridCoords, score, scoreBreakdown, layerDistance, selectionOrder, edge, hole} = meta;

  let html = `
    <div class="square-score-details">
      <h4>Square #${selectionOrder}</h4>
      <p><strong>Grid Position:</strong> (${gridCoords.i}, ${gridCoords.j})</p>
      <p><strong>Layer Distance:</strong> ${layerDistance}</p>
      ${edge ? `<p><strong>Edge:</strong> ${edge}</p>` : ''}
      ${hole ? `<p><strong>Hole:</strong> Size ${hole.size}</p>` : ''}

      <hr/>
      <h5>Total Score: ${score.toLocaleString()}</h5>

      <h5>Score Breakdown:</h5>
      <ul>
        <li>Base: ${scoreBreakdown.base}</li>
  `;

  // Strategic mode breakdown
  html += `
      <li>Layer Distance: ${scoreBreakdown.layerScore >= 0 ? '+' : ''}${scoreBreakdown.layerScore.toLocaleString()}</li>
      <li>Edge Bonus: ${scoreBreakdown.edgeBonus >= 0 ? '+' : ''}${scoreBreakdown.edgeBonus.toLocaleString()}</li>
      <li>Hole Bonus: ${scoreBreakdown.holeBonus >= 0 ? '+' : ''}${scoreBreakdown.holeBonus.toLocaleString()}</li>
      <li>Adjacency: ${scoreBreakdown.adjacencyBonus >= 0 ? '+' : ''}${scoreBreakdown.adjacencyBonus.toLocaleString()}</li>
  `;

  html += `
      </ul>
    </div>
  `;

  return html;
}

/**
 * Show calculated route on map
 */
function showRoute(routeData) {
  // Keep ONLY the start marker (larger radius), clear everything else
  let startMarker = null;
  layers.route.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && layer.options.radius === CONFIG.START_MARKER_RADIUS) {
      startMarker = layer;
    }
  });

  layers.route.clearLayers();

  if (startMarker) {
    startMarker.addTo(layers.route);
  }

  // Draw route polyline
  const latlngs = routeData.coordinates.map(coord => [coord.lat, coord.lon]);
  L.polyline(latlngs, {
    color: CONFIG.ROUTE_LINE_COLOR,
    weight: CONFIG.ROUTE_LINE_WEIGHT,
    opacity: CONFIG.ROUTE_LINE_OPACITY
  }).addTo(layers.route);

  // Add waypoint markers with color coding for debugging
  // Green = on road, Red = fallback to center
  if (routeData.waypoints && routeData.waypoints.length < CONFIG.MAX_WAYPOINT_MARKERS) {
    let roadAwareCount = 0;
    let fallbackCount = 0;

    routeData.waypoints.forEach((wp, index) => {
      if (index === 0) return; // Skip start point (already shown)

      const hasRoad = wp.hasRoad !== false && wp.type !== 'center-fallback' && wp.type !== 'no-road';
      const color = hasRoad ? '#4CAF50' : '#FF5252'; // Green for road, red for fallback

      if (hasRoad) roadAwareCount++;
      else fallbackCount++;

      L.circleMarker([wp.lat, wp.lon], {
        radius: 4,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9
      }).bindTooltip(`WP ${index}: ${wp.type || 'unknown'}`, { permanent: false })
        .addTo(layers.route);
    });

    console.log(`Map: Displayed route with ${routeData.waypoints?.length || 0} waypoints (${roadAwareCount} road-aware, ${fallbackCount} fallback)`);
  } else if (routeData.waypoints) {
    console.log(`Map: Displayed route with ${routeData.waypoints?.length || 0} waypoints (too many for markers)`);
  }
}

/**
 * Get the proposed layer for route calculation
 */
function getProposedLayer() {
  return layers.proposed;
}

/**
 * Clear route layer
 */
function clearRoute() {
  layers.route.clearLayers();
}

// Expose methods to parent component
defineExpose({
  onKmlLoaded,
  showProposedSquares,
  showRoute,
  getProposedLayer,
  clearRoute
});
</script>

<template>
  <div ref="mapContainer" class="leaflet-map"></div>
</template>

<style scoped>
.leaflet-map {
  flex: 1;
  height: 100%;
  z-index: 0;
}

/* Score popup styling */
:deep(.score-popup) {
  font-family: Arial, sans-serif;
  font-size: 12px;
}

:deep(.score-popup .square-score-details h4) {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

:deep(.score-popup .square-score-details h5) {
  margin: 10px 0 5px 0;
  color: #555;
  font-size: 13px;
}

:deep(.score-popup .square-score-details p) {
  margin: 5px 0;
}

:deep(.score-popup .square-score-details ul) {
  margin: 5px 0;
  padding-left: 20px;
}

:deep(.score-popup .square-score-details li) {
  margin: 3px 0;
}

:deep(.score-popup .square-score-details hr) {
  margin: 10px 0;
  border: none;
  border-top: 1px solid #ddd;
}
</style>
