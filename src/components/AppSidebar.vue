<script setup>
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';
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

const display = useDisplay();
const isMobile = computed(() => !display.mdAndUp.value);

const isOpen = ref(false);

defineExpose({
  toggle: () => isOpen.value = !isOpen.value,
  open: () => isOpen.value = true,
  close: () => isOpen.value = false,
  getIsOpen: () => isOpen.value
});
</script>

<template>
  <aside :class="{ 'is-open': isOpen }" class="sidebar">
    <!-- Close button (mobile only) -->
    <v-btn
      v-if="isMobile"
      icon="mdi-close"
      variant="text"
      @click="isOpen = false"
      class="close-btn"
      aria-label="Menü schließen"
    />

    <div class="sidebar-content">
      <!-- Header -->
      <v-list-item class="sidebar-header">
        <v-list-item-title class="text-h6">
          Squadrats Optimizer
        </v-list-item-title>
        <v-list-item-subtitle v-if="kmlFilename">
          {{ kmlFilename }}
          <span v-if="ubersquadratSize" class="text-caption">
            (Ubersquadrat: {{ ubersquadratSize }})
          </span>
        </v-list-item-subtitle>
      </v-list-item>

      <v-divider />

      <!-- Scrollable content area -->
      <div class="sidebar-scroll">
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

        <div class="pa-3">
          <div class="text-subtitle-2 mb-2">Routing</div>
          <RouteControls @route-calculated="(route) => emit('route-calculated', route)" />

          <RouteStats
            v-if="routing.currentRoute"
            :route="routing.currentRoute"
            class="mt-3"
          />

          <ExportButtons
            v-if="routing.currentRoute"
            :route="routing.currentRoute"
            class="mt-3"
          />
        </div>
      </div>
    </div>
  </aside>

  <div
    v-if="isOpen"
    class="sidebar-overlay"
    @click="isOpen = false"
  ></div>
</template>

<style scoped>
.sidebar {
  position: relative;
  height: 100vh;
  width: 320px;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
  flex-shrink: 0;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.sidebar-header {
  background: rgb(var(--v-theme-primary));
  color: white;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-overlay {
  display: none;
}

/* Mobile: sidebar hidden by default, slides in as overlay */
@media (max-width: 800px) {
  .sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 80vw;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}
</style>
