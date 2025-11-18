/**
 * Export Module
 * Handles export functionality for GPX and KML file formats
 */

import { formatTime } from './router.js';

/**
 * Generate GPX file content from route data
 * @param {Object} routeData - Route data
 * @returns {string} GPX XML content
 */
export function generateGPX(routeData) {
  const timestamp = new Date().toISOString();

  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Squadrats Navigator"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>Squadrats Route</name>
    <desc>Bicycle route through proposed squares - ${routeData.distance.toFixed(1)} km, ${routeData.elevationGain} m elevation</desc>
    <time>${timestamp}</time>
  </metadata>
  <trk>
    <name>Squadrats Route</name>
    <type>Cycling</type>
    <trkseg>
`;

  // Add all track points
  routeData.coordinates.forEach(coord => {
    gpx += `      <trkpt lat="${coord.lat}" lon="${coord.lon}">
        <ele>${coord.elevation}</ele>
      </trkpt>\n`;
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Generate KML file content from route data
 * @param {Object} routeData - Route data
 * @returns {string} KML XML content
 */
export function generateKML(routeData) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Squadrats Route</name>
    <description>Bicycle route: ${routeData.distance.toFixed(1)} km, ${routeData.elevationGain} m elevation gain</description>
    <Style id="routeStyle">
      <LineStyle>
        <color>ff0066ff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Squadrats Bicycle Route</name>
      <description>Distance: ${routeData.distance.toFixed(1)} km, Elevation: ${routeData.elevationGain} m, Time: ${formatTime(routeData.time)}</description>
      <styleUrl>#routeStyle</styleUrl>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
`;

  // Add all coordinates (KML format: lon,lat,elevation)
  routeData.coordinates.forEach(coord => {
    kml += `          ${coord.lon},${coord.lat},${coord.elevation}\n`;
  });

  kml += `        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

  return kml;
}

/**
 * Download file helper
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
