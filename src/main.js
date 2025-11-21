/**
 * Application Entry Point
 * Initializes Vue, Vuetify, and Pinia
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

// Leaflet CSS
import 'leaflet/dist/leaflet.css';

// App
import App from './App.vue';

// Create Vuetify instance with dark/light theme
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#00cc00',
          secondary: '#0066ff',
          accent: '#ffd700',
          error: '#ff5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107'
        }
      }
    }
  }
});

// Create Pinia store
const pinia = createPinia();

// Create and mount app
const app = createApp(App);
app.use(pinia);
app.use(vuetify);
app.mount('#app');
