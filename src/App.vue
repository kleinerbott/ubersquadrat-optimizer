<script setup>
import { ref, provide, watch, computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAppStore } from './stores/appStore';
import { storeToRefs } from 'pinia';
import LeafletMap from './components/LeafletMap.vue';
import AppSidebar from './components/AppSidebar.vue';

const store = useAppStore();
const { routing } = storeToRefs(store);

const mapRef = ref(null);
const sidebarRef = ref(null);

provide('mapRef', mapRef);

const display = useDisplay();
const isMobile = computed(() => !display.mdAndUp.value);

const sidebarWasOpen = ref(false);

watch(
  () => routing.value.selectingStartPoint,
  (selecting) => {
    if (!isMobile.value) return; 

    if (selecting) {
      sidebarWasOpen.value = sidebarRef.value?.getIsOpen() ?? false;
      sidebarRef.value?.close();
    } else if (sidebarWasOpen.value) {
      sidebarRef.value?.open();
      sidebarWasOpen.value = false;
    }
  }
);

function toggleSidebar() {
  sidebarRef.value?.toggle();
}

/**
 * Handle optimization results - show squares on map
 */
function handleOptimized(result) {
  if (Array.isArray(result)) {
    mapRef.value?.showProposedSquares(result, []);
  } else {
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
  const allSquares = routeData.allSquares; 

  if (allSquares && allSquares.length > 0) {
    const tspOrderedRectangles = [];
    const tspOrderedMetadata = [];
    const skippedIndices = [];

    let visitOrder = 1;

    for (let i = 0; i < allSquares.length; i++) {
      const wp = allSquares[i];

      if (i === 0 && wp.lat === routeData.waypoints[0].lat && wp.lon === routeData.waypoints[0].lon) {
        continue;
      }

      if (store.routing.roundtrip && i === allSquares.length - 1) {
        continue;
      }

      const wasSkipped = wp.hasRoad === false;
      if (wasSkipped) {
        skippedIndices.push(tspOrderedRectangles.length);
      }

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

    store.proposedSquares = tspOrderedRectangles;
    store.proposedMetadata = tspOrderedMetadata;

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
