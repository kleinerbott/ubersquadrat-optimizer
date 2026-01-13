<script setup>
import { ref, provide } from 'vue';
import { useAppStore } from './stores/appStore';
import LeafletMap from './components/LeafletMap.vue';
import AppSidebar from './components/AppSidebar.vue';

// Map component reference for imperative calls
const mapRef = ref(null);
const sidebarRef = ref(null);

// Provide map ref to child components
provide('mapRef', mapRef);

// Toggle sidebar
function toggleSidebar() {
  sidebarRef.value?.toggle();
}

/**
 * Handle optimization results - show squares on map
 */
function handleOptimized(result) {
  // result is now {rectangles, metadata} or legacy array
  if (Array.isArray(result)) {
    // Legacy format - just rectangles
    mapRef.value?.showProposedSquares(result, []);
  } else {
    // New format with metadata
    mapRef.value?.showProposedSquares(result.rectangles, result.metadata);
  }
}

/**
 * Handle route calculation results - show route on map
 */
function handleRouteCalculated(routeData) {
  mapRef.value?.showRoute(routeData);

  // Update store with TSP-sorted squares
  const store = useAppStore();
  const allSquares = routeData.allSquares; // Route waypoints in TSP order

  if (allSquares && allSquares.length > 0) {
    // Build new arrays in TSP order
    const tspOrderedRectangles = [];
    const tspOrderedMetadata = [];
    const skippedIndices = [];

    let visitOrder = 1;

    for (let i = 0; i < allSquares.length; i++) {
      const wp = allSquares[i];

      // Skip start point
      if (i === 0 && wp.lat === routeData.waypoints[0].lat && wp.lon === routeData.waypoints[0].lon) {
        continue;
      }

      // Skip final point if roundtrip
      if (store.routing.roundtrip && i === allSquares.length - 1) {
        continue;
      }

      // Check if skipped
      const wasSkipped = wp.hasRoad === false;
      if (wasSkipped) {
        skippedIndices.push(tspOrderedRectangles.length);
      }

      // Find original square by grid coordinates (not array index!)
      if (wp.gridCoords) {
        const originalIndex = store.proposedMetadata.findIndex(meta =>
          meta.gridCoords &&
          meta.gridCoords.i === wp.gridCoords.i &&
          meta.gridCoords.j === wp.gridCoords.j
        );

        if (originalIndex !== -1) {
          tspOrderedRectangles.push(store.proposedSquares[originalIndex]);
          tspOrderedMetadata.push({
            ...store.proposedMetadata[originalIndex],
            selectionOrder: visitOrder++
          });
        }
      }
    }

    // Update store with TSP-sorted data
    store.proposedSquares = tspOrderedRectangles;
    store.proposedMetadata = tspOrderedMetadata;

    // Re-render with skipped indices
    mapRef.value?.showProposedSquares(tspOrderedRectangles, tspOrderedMetadata, skippedIndices);
  }
}

/**
 * Handle KML loaded - update map layers
 */
function handleKmlLoaded(data) {
  mapRef.value?.onKmlLoaded(data);
}
</script>

<template>
  <v-app>
    <v-main class="app-main">
      <LeafletMap ref="mapRef" />
      <AppSidebar
        ref="sidebarRef"
        @optimized="handleOptimized"
        @route-calculated="handleRouteCalculated"
        @kml-loaded="handleKmlLoaded"
      />

      <!-- Floating Menu Button -->
      <v-btn
        icon="mdi-menu"
        color="primary"
        size="large"
        class="menu-fab"
        @click="toggleSidebar"
        elevation="8"
        aria-label="Menü öffnen"
      />
    </v-main>
  </v-app>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}

.app-main {
  display: flex;
  height: 100vh;
}

.menu-fab {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 999;
}
</style>
