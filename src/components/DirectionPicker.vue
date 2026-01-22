<script setup>
import { computed } from 'vue';
import { useAppStore } from '../stores/appStore';
import { storeToRefs } from 'pinia';

const store = useAppStore();
const { settings } = storeToRefs(store);

const directions = ['N', 'S', 'E', 'W'];

const allSelected = computed(() => settings.value.directions.length === 4);

function isSelected(dir) {
  return settings.value.directions.includes(dir);
}

function toggleDirection(dir) {
  store.toggleDirection(dir);
}

function toggleAll() {
  if (allSelected.value) {
    settings.value.directions = ['N'];
  } else {
    store.selectAllDirections();
  }
}
</script>

<template>
  <div>
    <div class="text-caption mb-1">Himmelsrichtung der Erweiterung</div>
    <div class="direction-buttons">
      <v-btn
        v-for="dir in directions"
        :key="dir"
        :color="isSelected(dir) ? 'primary' : 'default'"
        :variant="isSelected(dir) ? 'flat' : 'outlined'"
        size="default"
        class="direction-btn"
        @click="toggleDirection(dir)"
      >
        {{ dir }}
      </v-btn>
      <v-btn
        :color="allSelected ? 'primary' : 'default'"
        :variant="allSelected ? 'flat' : 'outlined'"
        size="default"
        class="direction-btn"
        @click="toggleAll"
      >
        Alle
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.direction-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.direction-btn {
  flex: 1;
  min-width: 50px;
  min-height: 44px;
}
</style>
