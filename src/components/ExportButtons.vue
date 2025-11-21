<script setup>
import { ref } from 'vue';
import { generateGPX, generateKML, downloadFile } from '../logic/export';

const props = defineProps({
  route: {
    type: Object,
    required: true
  }
});

const error = ref(null);

/**
 * Export route as GPX file
 */
function exportGpx() {
  try {
    const content = generateGPX(props.route);
    downloadFile(content, 'squadrats-route.gpx', 'application/gpx+xml');
  } catch (err) {
    console.error('GPX export error:', err);
    error.value = err.message;
  }
}

/**
 * Export route as KML file
 */
function exportKml() {
  try {
    const content = generateKML(props.route);
    downloadFile(content, 'squadrats-route.kml', 'application/vnd.google-earth.kml+xml');
  } catch (err) {
    console.error('KML export error:', err);
    error.value = err.message;
  }
}
</script>

<template>
  <div>
    <div class="d-flex gap-2">
      <v-btn
        flex="1"
        variant="outlined"
        prepend-icon="mdi-download"
        size="small"
        @click="exportGpx"
      >
        GPX
      </v-btn>
      <v-btn
        flex="1"
        variant="outlined"
        prepend-icon="mdi-download"
        size="small"
        @click="exportKml"
      >
        KML
      </v-btn>
    </div>

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

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
