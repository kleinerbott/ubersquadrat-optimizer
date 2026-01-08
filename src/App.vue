<script setup>
import { ref, provide } from 'vue';
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
