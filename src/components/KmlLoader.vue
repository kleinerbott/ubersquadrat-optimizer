<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/appStore';
import { loadKmlFile, loadCachedKml } from '../logic/file-loader';
import { parseKmlFeatures, findUbersquadrat } from '../logic/kml-processor';
import { calculateGridParameters, scanAndBuildVisitedSet } from '../logic/grid';
import L from 'leaflet';
import omnivore from '@mapbox/leaflet-omnivore';

const store = useAppStore();
const emit = defineEmits(['kml-loaded']);

const loading = ref(false);
const error = ref(null);

onMounted(() => {
  // Try to load cached KML on startup
  const cached = loadCachedKml();
  if (cached) {
    console.log(`Auto-loading cached KML: ${cached.filename}`);
    processKmlContent(cached.content, cached.filename);
  }
});

/**
 * Handle file picker button click
 */
async function handleLoadClick() {
  loading.value = true;
  error.value = null;

  try {
    const { filename, content } = await loadKmlFile();
    await processKmlContent(content, filename);
  } catch (err) {
    console.error('File loading error:', err);
    if (err.message !== 'File selection cancelled') {
      error.value = err.message;
    }
  } finally {
    loading.value = false;
  }
}

/**
 * Process KML content and update store
 */
async function processKmlContent(kmlContent, filename) {
  store.setLoading(true);
  store.resetState();

  try {
    // Create blob URL for omnivore
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const blobUrl = URL.createObjectURL(blob);

    // Parse KML using omnivore
    const layer = omnivore.kml(blobUrl);

    await new Promise((resolve, reject) => {
      layer.on('ready', () => {
        URL.revokeObjectURL(blobUrl);

        try {
          // Parse KML features
          const { features, allPolygons, candidates } = parseKmlFeatures(layer);

          // Find ubersquadrat
          const ubersquadrat = findUbersquadrat(candidates, features);
          if (!ubersquadrat.coords) {
            throw new Error('Kein Ubersquadrat gefunden');
          }

          // Calculate grid parameters
          const gridParams = calculateGridParameters(ubersquadrat.coords, ubersquadrat.size);

          // Build visited set
          const visitedSet = scanAndBuildVisitedSet(allPolygons, gridParams.baseSquare, gridParams);

          // Update store
          store.setGridParameters(gridParams);
          store.setVisitedSet(visitedSet);
          store.setKmlFilename(filename);

          // Emit event for map update (include the layer for visualization)
          emit('kml-loaded', {
            gridParams,
            bounds: gridParams.bounds,
            kmlLayer: layer
          });

          resolve();
        } catch (err) {
          reject(err);
        }
      });

      layer.on('error', (err) => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error(`KML parsing error: ${err.message || 'Unknown error'}`));
      });
    });

    console.log('KML loading complete');
  } catch (err) {
    console.error('Error processing KML:', err);
    error.value = err.message;
  } finally {
    store.setLoading(false);
  }
}
</script>

<template>
  <div>
    <v-btn
      block
      color="primary"
      :loading="loading"
      prepend-icon="mdi-folder-open"
      @click="handleLoadClick"
    >
      {{ store.kmlFilename ? 'Andere KML laden' : 'KML-Datei laden' }}
    </v-btn>

    <v-alert
      v-if="error"
      type="error"
      density="compact"
      class="mt-2"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>
  </div>
</template>
