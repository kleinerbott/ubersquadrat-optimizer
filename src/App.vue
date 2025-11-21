<script setup>
import { ref, provide } from 'vue';
import LeafletMap from './components/LeafletMap.vue';
import AppSidebar from './components/AppSidebar.vue';

// Map component reference for imperative calls
const mapRef = ref(null);

// Provide map ref to child components
provide('mapRef', mapRef);

/**
 * Handle optimization results - show squares on map
 */
function handleOptimized(squares) {
  mapRef.value?.showProposedSquares(squares);
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
        @optimized="handleOptimized"
        @route-calculated="handleRouteCalculated"
        @kml-loaded="handleKmlLoaded"
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
</style>
