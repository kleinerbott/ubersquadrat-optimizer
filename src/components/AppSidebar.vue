<script setup>
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';
import KmlLoader from './KmlLoader.vue';
import DirectionPicker from './DirectionPicker.vue';
import OptimizeControls from './OptimizeControls.vue';
import RouteControls from './RouteControls.vue';
import RouteStats from './RouteStats.vue';
import ExportButtons from './ExportButtons.vue';

const store = useAppStore();
const { routing, kmlFilename, ubersquadratSize, visitedSet } = storeToRefs(store);

const emit = defineEmits(['optimized', 'route-calculated', 'kml-loaded']);
</script>

<template>
  <v-navigation-drawer
    permanent
    location="right"
    width="320"
    class="sidebar"
  >
    <v-list-item class="sidebar-header">
      <v-list-item-title class="text-h6">
        Squadrats Navigator
      </v-list-item-title>
      <v-list-item-subtitle v-if="kmlFilename">
        {{ kmlFilename }}
        <span v-if="ubersquadratSize" class="text-caption">
          ({{ ubersquadratSize }}, {{ visitedSet.size }} besucht)
        </span>
      </v-list-item-subtitle>
    </v-list-item>

    <v-divider />

    <!-- KML File Loader -->
    <div class="pa-3">
      <KmlLoader @kml-loaded="(data) => emit('kml-loaded', data)" />
    </div>

    <v-divider />

    <!-- Optimization Controls -->
    <div class="pa-3">
      <div class="text-subtitle-2 mb-2">Optimierung</div>
      <OptimizeControls @optimized="(squares) => emit('optimized', squares)" />
      <DirectionPicker class="mt-3" />
    </div>

    <v-divider />

    <!-- Routing Section -->
    <div class="pa-3">
      <div class="text-subtitle-2 mb-2">Routing</div>
      <RouteControls @route-calculated="(route) => emit('route-calculated', route)" />

      <!-- Route Stats (shown when route is calculated) -->
      <RouteStats
        v-if="routing.currentRoute"
        :route="routing.currentRoute"
        class="mt-3"
      />

      <!-- Export Buttons (shown when route is calculated) -->
      <ExportButtons
        v-if="routing.currentRoute"
        :route="routing.currentRoute"
        class="mt-3"
      />
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.sidebar {
  z-index: 1000;
}

.sidebar-header {
  background: rgb(var(--v-theme-primary));
  color: white;
}
</style>
