// ===== IMPORTS =====

import { optimizeSquare } from './optimizer.js';
import { calculateRoute, formatTime } from './router.js';
import { CONFIG } from './config.js';
import { parseKmlFeatures, findUbersquadrat } from './kml-processor.js';
import {
  calculateGridParameters,
  scanAndBuildVisitedSet,
  visualizeUbersquadrat,
  drawGridLines
} from './grid.js';
import { generateGPX, generateKML, downloadFile } from './export.js';

// ===== MAP INITIALIZATION =====

const map = L.map('map').setView([51.7, 8.3], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const visitedLayer = L.layerGroup().addTo(map);
const proposedLayer = L.layerGroup().addTo(map);
const gridLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);

// ===== APPLICATION STATE =====
const AppState = {
  grid: {
    latStep: null,
    lonStep: null,
    originLat: null,
    originLon: null
  },
  visitedSet: new Set(),
  baseSquare: null,
  kmlLoading: false,
  routing: {
    startPoint: null,           // { lat, lon } or null
    selectingStartPoint: false,  // Whether user is clicking to select start
    currentRoute: null,          // Route data from BRouter
    routeGeoJSON: null           // Parsed GeoJSON for display
  },

  reset() {
    this.visitedSet.clear();
    this.baseSquare = null;
    this.grid = { latStep: null, lonStep: null, originLat: null, originLon: null };
  },

  resetRoute() {
    this.routing.startPoint = null;
    this.routing.selectingStartPoint = false;
    this.routing.currentRoute = null;
    this.routing.routeGeoJSON = null;
    routeLayer.clearLayers();
    this.updateRouteUI();
  },

  updateRouteUI() {
    const statusEl = document.getElementById(CONFIG.DOM_IDS.START_POINT_STATUS);
    const routeBtn = document.getElementById(CONFIG.DOM_IDS.CALCULATE_ROUTE_BTN);
    const statsEl = document.getElementById(CONFIG.DOM_IDS.ROUTE_STATS);
    const exportEl = document.getElementById(CONFIG.DOM_IDS.ROUTE_EXPORT);

    if (this.routing.startPoint) {
      statusEl.textContent = `Startpunkt: ${this.routing.startPoint.lat.toFixed(5)}, ${this.routing.startPoint.lon.toFixed(5)}`;
      statusEl.style.color = '#00cc00';
      routeBtn.disabled = false;
    } else {
      statusEl.textContent = 'Kein Startpunkt gewählt';
      statusEl.style.color = '#666';
      routeBtn.disabled = true;
    }

    if (this.routing.currentRoute) {
      statsEl.style.display = 'block';
      exportEl.style.display = 'block';
    } else {
      statsEl.style.display = 'none';
      exportEl.style.display = 'none';
    }
  },

  isReady() {
    return this.grid.latStep !== null && !this.kmlLoading;
  },

  setLoading(loading) {
    this.kmlLoading = loading;
    const btn = document.getElementById(CONFIG.DOM_IDS.OPTIMIZE_BTN);
    if (btn) {
      btn.disabled = loading;
      btn.textContent = loading ? 'Loading...' : 'Optimieren';
    }
  }
};

// ===== INITIALIZATION =====

/**
 * Initialize KML file selector dropdown
 */
async function initializeKmlSelector() {
  try {
    const response = await fetch('/api/kmlfiles');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const files = await response.json();

    const selectElement = document.getElementById(CONFIG.DOM_IDS.KML_SELECT);
    files.forEach(filename => {
      const option = document.createElement('option');
      option.value = filename;
      option.textContent = filename;
      selectElement.appendChild(option);
    });

    if (files.length > 0) loadKml(files[0]);
    selectElement.addEventListener('change', () => loadKml(selectElement.value));
  } catch (error) {
    console.error('Failed to load KML file list:', error);
    alert('Fehler beim Laden der KML-Dateiliste. Bitte laden Sie die Seite neu.');
  }
}

// Initialize the application
initializeKmlSelector();

/**
 * Load and process KML file
 * Orchestrates parsing, grid calculation, visited set building, and visualization
 * @param {string} filename - Name of KML file to load
 */
function loadKml(filename) {
  AppState.setLoading(true);
  visitedLayer.clearLayers();
  proposedLayer.clearLayers();
  const layer = omnivore.kml(`/data/${filename}`);

  layer.on('error', (error) => {
    console.error('KML loading error:', error);
    AppState.setLoading(false);
    alert(`Fehler beim Laden der KML-Datei "${filename}". Bitte versuchen Sie eine andere Datei.`);
  });

  layer.on('ready', () => {
    try {
      // STEP 1: Parse KML features
      const { features, allPolygons, candidates } = parseKmlFeatures(layer);

      // STEP 2: Find übersquadrat
      const ubersquadrat = findUbersquadrat(candidates, features);
      if (!ubersquadrat.coords) {
        alert("Kein Übersquadrat gefunden.");
        AppState.setLoading(false);
        return;
      }

      // Validate we have data
      if (features.length === 0 && candidates.length === 0) {
        alert('Keine Polygone im KML gefunden');
        AppState.setLoading(false);
        return;
      }

      // STEP 3: Calculate grid parameters
      const gridParams = calculateGridParameters(ubersquadrat.coords, ubersquadrat.size);

      // Update AppState with grid parameters
      AppState.grid.latStep = gridParams.latStep;
      AppState.grid.lonStep = gridParams.lonStep;
      AppState.grid.originLat = gridParams.originLat;
      AppState.grid.originLon = gridParams.originLon;
      AppState.baseSquare = gridParams.baseSquare;

      console.log("Base square grid coords:", AppState.baseSquare);
      console.log('vs actual ubersquadrat bounds:',
        '[', gridParams.bounds.minLat.toFixed(6), ',', gridParams.bounds.minLon.toFixed(6), '] to',
        '[', gridParams.bounds.maxLat.toFixed(6), ',', gridParams.bounds.maxLon.toFixed(6), ']');

      // STEP 4: Build visited set through grid scanning
      const visitedSet = scanAndBuildVisitedSet(allPolygons, gridParams.baseSquare, gridParams);
      AppState.visitedSet = visitedSet;

      // STEP 5: Visualize ubersquadrat
      visualizeUbersquadrat(gridParams.baseSquare, gridParams, visitedLayer);

      // STEP 6: Draw grid lines
      drawGridLines(gridParams.baseSquare, gridParams, gridLayer);

      // STEP 7: Fit map to ubersquadrat bounds
      const { minLat, maxLat, minLon, maxLon } = gridParams.bounds;
      map.fitBounds([[minLat, minLon], [maxLat, maxLon]]);

      // Clear loading flag - KML is fully loaded and ready
      AppState.setLoading(false);
      console.log('KML loading complete, ready for optimization');

    } catch (error) {
      console.error('Error processing KML data:', error);
      AppState.setLoading(false);
      alert(`Fehler beim Verarbeiten der KML-Daten: ${error.message}`);
    }
  });

  layer.addTo(visitedLayer);
}

// ===== ROUTING HELPER FUNCTIONS =====

/**
 * Visualize calculated route on the map
 * @param {Object} routeData - Route data from router.js
 */
function visualizeRoute(routeData) {
  // Clear existing route visualization (keep start marker)
  const startMarker = [];
  routeLayer.eachLayer(layer => {
    if (layer instanceof L.CircleMarker) {
      startMarker.push(layer);
    }
  });
  routeLayer.clearLayers();
  startMarker.forEach(m => m.addTo(routeLayer));

  // Convert coordinates to Leaflet format [[lat, lon], ...]
  const latlngs = routeData.coordinates.map(coord => [coord.lat, coord.lon]);

  // Draw route polyline
  L.polyline(latlngs, {
    color: CONFIG.ROUTE_LINE_COLOR,
    weight: CONFIG.ROUTE_LINE_WEIGHT,
    opacity: CONFIG.ROUTE_LINE_OPACITY
  }).addTo(routeLayer);

  // Optionally add waypoint markers (small dots at each proposed square)
  if (routeData.waypoints && routeData.waypoints.length < CONFIG.MAX_WAYPOINT_MARKERS) {
    routeData.waypoints.forEach((wp, index) => {
      // Skip start point (already has marker)
      if (index === 0) return;

      L.circleMarker([wp.lat, wp.lon], {
        radius: 3,
        fillColor: '#ffffff',
        color: CONFIG.ROUTE_LINE_COLOR,
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(routeLayer);
    });
  }

  console.log('Route visualized on map');
}

/**
 * Update route statistics display in UI
 * @param {Object} routeData - Route data from router.js
 */
function updateRouteStatistics(routeData) {
  // Update distance
  document.getElementById(CONFIG.DOM_IDS.ROUTE_DISTANCE).textContent = routeData.distance.toFixed(1);

  // Update elevation gain
  document.getElementById(CONFIG.DOM_IDS.ROUTE_ELEVATION).textContent = routeData.elevationGain;

  // Update time
  document.getElementById(CONFIG.DOM_IDS.ROUTE_TIME).textContent = formatTime(routeData.time);

  // Show stats and export sections
  document.getElementById(CONFIG.DOM_IDS.ROUTE_STATS).style.display = 'block';
  document.getElementById(CONFIG.DOM_IDS.ROUTE_EXPORT).style.display = 'block';

  console.log('Route statistics updated in UI');
}

// ===== EVENT HANDLERS =====

/**
 * Handle optimize button click
 */
function handleOptimizeClick() {
  if (!AppState.isReady()) {
    alert('KML wird noch geladen, bitte warten...');
    return;
  }
  if (!AppState.baseSquare) {
    alert('Noch kein Übersquadrat erkannt');
    return;
  }

  const numSquaresToAdd = parseInt(document.getElementById(CONFIG.DOM_IDS.NUM_ADD).value);
  const direction = document.getElementById(CONFIG.DOM_IDS.DIRECTION).value;
  const optimizationMode = document.getElementById(CONFIG.DOM_IDS.OPTIMIZATION_MODE).value;
  const maxHoleSize = parseInt(document.getElementById(CONFIG.DOM_IDS.MAX_HOLE_SIZE).value);

  const proposedSquares = optimizeSquare(
    AppState.baseSquare,
    numSquaresToAdd,
    direction,
    AppState.visitedSet,
    AppState.grid.latStep,
    AppState.grid.lonStep,
    AppState.grid.originLat,
    AppState.grid.originLon,
    optimizationMode,
    maxHoleSize
  );

  proposedLayer.clearLayers();
  proposedSquares.forEach(rectangle => {
    L.rectangle(rectangle, {
      color: CONFIG.PROPOSED_COLOR,
      fillColor: CONFIG.PROPOSED_COLOR,
      fillOpacity: CONFIG.PROPOSED_OPACITY
    }).addTo(proposedLayer);
  });

  // Clear route when re-optimizing (new squares selected)
  AppState.resetRoute();
}

/**
 * Handle select start point button click
 */
function handleSelectStartPointClick() {
  AppState.routing.selectingStartPoint = !AppState.routing.selectingStartPoint;
  const button = document.getElementById(CONFIG.DOM_IDS.SELECT_START_BTN);

  if (AppState.routing.selectingStartPoint) {
    button.textContent = '❌ Abbrechen';
    button.style.background = '#ff6666';
    map.getContainer().style.cursor = 'crosshair';
  } else {
    button.textContent = '📍 Startpunkt wählen';
    button.style.background = '';
    map.getContainer().style.cursor = '';
  }
}

/**
 * Handle map click for start point selection
 * @param {Object} event - Leaflet click event
 */
function handleMapClick(event) {
  if (AppState.routing.selectingStartPoint) {
    // Set start point
    AppState.routing.startPoint = { lat: event.latlng.lat, lon: event.latlng.lng };

    // Clear existing start marker
    routeLayer.clearLayers();

    // Add start point marker
    L.circleMarker([event.latlng.lat, event.latlng.lng], {
      radius: CONFIG.START_MARKER_RADIUS,
      fillColor: CONFIG.START_MARKER_COLOR,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(routeLayer);

    // Exit selection mode
    AppState.routing.selectingStartPoint = false;
    const button = document.getElementById(CONFIG.DOM_IDS.SELECT_START_BTN);
    button.textContent = '📍 Startpunkt wählen';
    button.style.background = '';
    map.getContainer().style.cursor = '';

    // Update UI
    AppState.updateRouteUI();
  }
}

/**
 * Handle calculate route button click
 */
async function handleCalculateRouteClick() {
  if (!AppState.routing.startPoint) {
    alert('Bitte zuerst einen Startpunkt wählen');
    return;
  }

  // Get routing parameters
  const bikeType = document.getElementById(CONFIG.DOM_IDS.BIKE_TYPE).value;
  const roundtrip = document.getElementById(CONFIG.DOM_IDS.ROUNDTRIP).checked;

  // Disable button during calculation
  const button = document.getElementById(CONFIG.DOM_IDS.CALCULATE_ROUTE_BTN);
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = '⏳ Berechne Route...';

  try {
    console.log('Calculating route...');

    // Calculate route through proposed squares
    const routeData = await calculateRoute(
      proposedLayer,
      AppState.routing.startPoint,
      bikeType,
      roundtrip,
      CONFIG.BROUTER_API_URL
    );

    console.log('Route calculated:', routeData);

    // Store route data
    AppState.routing.currentRoute = routeData;
    AppState.routing.routeGeoJSON = routeData.rawGeoJSON;

    // Visualize route on map
    visualizeRoute(routeData);

    // Update statistics display
    updateRouteStatistics(routeData);

    // Show success message
    console.log(`Route: ${routeData.distance.toFixed(1)} km, ${routeData.elevationGain} m, ${routeData.time} min`);

    // Show warning if route was simplified
    if (routeData.simplified) {
      alert(`Hinweis: Die Route konnte nicht durch alle ${routeData.allSquares.length} Quadrate berechnet werden.\n\nStattdessen wurde eine vereinfachte Route durch ${routeData.waypoints.length} Wegpunkte erstellt.\n\nEinige Quadrate wurden übersprungen. Für vollständige Routen versuchen Sie es mit < 15 Quadraten.`);
    }

  } catch (error) {
    console.error('Route calculation error:', error);
    alert(`Fehler bei der Routenberechnung: ${error.message}`);
  } finally {
    // Re-enable button
    button.disabled = false;
    button.textContent = originalText;
  }
}

/**
 * Handle export GPX button click
 */
function handleExportGpxClick() {
  if (!AppState.routing.currentRoute) {
    alert('Keine Route zum Exportieren vorhanden');
    return;
  }

  try {
    const gpxContent = generateGPX(AppState.routing.currentRoute);
    downloadFile(gpxContent, 'squadrats-route.gpx', 'application/gpx+xml');
    console.log('GPX export successful');
  } catch (error) {
    console.error('GPX export error:', error);
    alert(`Fehler beim GPX-Export: ${error.message}`);
  }
}

/**
 * Handle export KML button click
 */
function handleExportKmlClick() {
  if (!AppState.routing.currentRoute) {
    alert('Keine Route zum Exportieren vorhanden');
    return;
  }

  try {
    const kmlContent = generateKML(AppState.routing.currentRoute);
    downloadFile(kmlContent, 'squadrats-route.kml', 'application/vnd.google-earth.kml+xml');
    console.log('KML export successful');
  } catch (error) {
    console.error('KML export error:', error);
    alert(`Fehler beim KML-Export: ${error.message}`);
  }
}

// ===== EVENT LISTENER REGISTRATION =====

// Optimize button
document.getElementById(CONFIG.DOM_IDS.OPTIMIZE_BTN).addEventListener('click', handleOptimizeClick);

// Select start point button
document.getElementById(CONFIG.DOM_IDS.SELECT_START_BTN).addEventListener('click', handleSelectStartPointClick);

// Map click handler for start point selection
map.on('click', handleMapClick);

// Calculate route button
document.getElementById(CONFIG.DOM_IDS.CALCULATE_ROUTE_BTN).addEventListener('click', handleCalculateRouteClick);

// Export GPX button
document.getElementById(CONFIG.DOM_IDS.EXPORT_GPX_BTN).addEventListener('click', handleExportGpxClick);

// Export KML button
document.getElementById(CONFIG.DOM_IDS.EXPORT_KML_BTN).addEventListener('click', handleExportKmlClick);

